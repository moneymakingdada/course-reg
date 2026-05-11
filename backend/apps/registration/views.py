from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.users.permissions import IsStudent, IsInstructorOrAdmin, IsAdminUser
from .models import Registration, Payment
from .serializers import RegistrationSerializer, EnrollSerializer, PaymentSerializer


# ─── Student: enroll ───────────────────────────────────────────────────────────

class EnrollView(APIView):
    """
    POST /api/registration/
    Body: { course_ids: [1,2,3], semester: "2025/2026 S2" }
    Creates Registration records for each course.
    All validations (prereqs, capacity, credits) happen in EnrollSerializer.
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = EnrollSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        courses     = serializer.validated_data['courses']
        semester    = serializer.validated_data['semester']
        created     = []

        for course in courses:
            reg = Registration.objects.create(
                student=request.user,
                course=course,
                semester=semester,
                status=Registration.STATUS_ENROLLED,
            )
            created.append(reg)

        return Response(
            RegistrationSerializer(created, many=True).data,
            status=status.HTTP_201_CREATED
        )


# ─── Student: my enrollments ───────────────────────────────────────────────────

class MyRegistrationListView(generics.ListAPIView):
    """
    GET /api/registration/mine/
    Returns the authenticated student's enrollments.
    Supports ?semester= and ?status= filters.
    """
    serializer_class   = RegistrationSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        qs = Registration.objects.filter(
            student=self.request.user
        ).select_related('course', 'course__department', 'course__instructor')

        semester = self.request.query_params.get('semester')
        status   = self.request.query_params.get('status')
        if semester:
            qs = qs.filter(semester=semester)
        if status:
            qs = qs.filter(status=status)
        return qs


# ─── Student: drop a course ────────────────────────────────────────────────────

class DropCourseView(APIView):
    """
    DELETE /api/registration/:id/
    Marks a registration as dropped and records the drop timestamp.
    Triggers waitlist notification for the next student on the waitlist.
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def delete(self, request, pk):
        try:
            reg = Registration.objects.get(pk=pk, student=request.user, status=Registration.STATUS_ENROLLED)
        except Registration.DoesNotExist:
            return Response({'detail': 'Active registration not found.'}, status=status.HTTP_404_NOT_FOUND)

        reg.status     = Registration.STATUS_DROPPED
        reg.dropped_at = timezone.now()
        reg.save()

        # Notify the next person on the waitlist
        self._notify_next_on_waitlist(reg.course)

        return Response({'detail': f'Dropped {reg.course.code} successfully.'}, status=status.HTTP_200_OK)

    def _notify_next_on_waitlist(self, course):
        from apps.waitlist.models import WaitlistEntry
        next_entry = WaitlistEntry.objects.filter(
            course=course, is_active=True, notified=False
        ).order_by('position').first()

        if next_entry:
            next_entry.notified = True
            next_entry.save()
            # In production: trigger email/push notification here


# ─── Payment ───────────────────────────────────────────────────────────────────

class PaymentCreateView(generics.CreateAPIView):
    """
    POST /api/registration/pay/
    Body: { registration_ids, amount, method, reference, semester }
    """
    serializer_class   = PaymentSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)


class MyPaymentListView(generics.ListAPIView):
    """
    GET /api/registration/payments/
    Returns all payments made by the authenticated student.
    """
    serializer_class   = PaymentSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        return Payment.objects.filter(student=self.request.user)


# ─── Admin: all registrations ──────────────────────────────────────────────────

class AdminRegistrationListView(generics.ListAPIView):
    """
    GET /api/registration/all/
    Admin only. Supports ?student=, ?course=, ?semester=, ?status=
    """
    serializer_class   = RegistrationSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        qs = Registration.objects.select_related(
            'student', 'course', 'course__department'
        )
        for param in ['student', 'course', 'semester', 'status']:
            val = self.request.query_params.get(param)
            if val:
                qs = qs.filter(**{param: val})
        return qs


# ─── Instructor: course roster ─────────────────────────────────────────────────

class CourseRosterView(generics.ListAPIView):
    """
    GET /api/registration/roster/:course_id/
    Returns all enrolled students for a given course.
    Accessible by the course instructor or admin.
    """
    serializer_class   = RegistrationSerializer
    permission_classes = [IsAuthenticated, IsInstructorOrAdmin]

    def get_queryset(self):
        course_id = self.kwargs['course_id']
        qs = Registration.objects.filter(
            course_id=course_id, status=Registration.STATUS_ENROLLED
        ).select_related('student', 'student__student_profile')

        # If instructor, only allow their own courses
        user = self.request.user
        if user.is_instructor:
            qs = qs.filter(course__instructor=user)

        return qs