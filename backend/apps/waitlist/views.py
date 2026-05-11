from django.utils import timezone
from django.db import models
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.users.permissions import IsStudent, IsAdminUser, IsInstructorOrAdmin
from .models import WaitlistEntry, Notification
from .serializers import WaitlistEntrySerializer, JoinWaitlistSerializer, NotificationSerializer


# ═══════════════════════════════════════════════════════════════════
#  STUDENT VIEWS
# ═══════════════════════════════════════════════════════════════════

class JoinWaitlistView(APIView):
    """POST /api/waitlist/"""
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = JoinWaitlistSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        course   = serializer.validated_data['course']
        semester = serializer.validated_data['semester']

        entry = WaitlistEntry.objects.create(
            student=request.user,
            course=course,
            semester=semester,
            position=WaitlistEntry.next_position(course, semester),
        )

        Notification.objects.create(
            recipient=request.user,
            type=Notification.TYPE_GENERAL,
            title=f'Added to waitlist — {course.code}',
            message=(
                f'You are #{entry.position} on the waitlist for {course.title}. '
                f'We will email you when a spot opens.'
            ),
            related_course=course,
        )

        return Response(WaitlistEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class MyWaitlistView(generics.ListAPIView):
    """GET /api/waitlist/mine/"""
    serializer_class   = WaitlistEntrySerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        return WaitlistEntry.objects.filter(
            student=self.request.user, is_active=True
        ).select_related('course', 'course__department', 'course__instructor')


class LeaveWaitlistView(APIView):
    """DELETE /api/waitlist/:id/"""
    permission_classes = [IsAuthenticated, IsStudent]

    def delete(self, request, pk):
        try:
            entry = WaitlistEntry.objects.get(pk=pk, student=request.user, is_active=True)
        except WaitlistEntry.DoesNotExist:
            return Response({'detail': 'Waitlist entry not found.'}, status=status.HTTP_404_NOT_FOUND)

        course           = entry.course
        removed_position = entry.position
        entry.is_active  = False
        entry.save(update_fields=['is_active'])

        # Re-rank remaining entries
        WaitlistEntry.objects.filter(
            course=course, semester=entry.semester,
            is_active=True, position__gt=removed_position
        ).update(position=models.F('position') - 1)

        return Response({'detail': f'Removed from waitlist for {course.code}.'})


class AcceptSpotView(APIView):
    """POST /api/waitlist/:id/accept/"""
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, pk):
        try:
            entry = WaitlistEntry.objects.get(
                pk=pk, student=request.user, is_active=True, notified=True
            )
        except WaitlistEntry.DoesNotExist:
            return Response({'detail': 'No pending spot offer found.'}, status=status.HTTP_404_NOT_FOUND)

        course = entry.course
        if course.is_full:
            return Response(
                {'detail': 'The spot was taken. You remain on the waitlist.'},
                status=status.HTTP_409_CONFLICT
            )

        from apps.registration.models import Registration
        Registration.objects.create(
            student=request.user,
            course=course,
            semester=entry.semester,
            status=Registration.STATUS_ENROLLED,
        )

        entry.is_active = False
        entry.accepted  = True
        entry.save(update_fields=['is_active', 'accepted'])

        # Re-rank
        WaitlistEntry.objects.filter(
            course=course, semester=entry.semester,
            is_active=True, position__gt=entry.position
        ).update(position=models.F('position') - 1)

        Notification.objects.create(
            recipient=request.user,
            type=Notification.TYPE_ENROLLED,
            title=f'Enrolled — {course.code}',
            message=f'You have been successfully enrolled in {course.title}.',
            related_course=course,
        )

        from apps.waitlist.tasks import send_enrolled_from_waitlist_email
        send_enrolled_from_waitlist_email.delay(request.user.id, course.id)

        return Response({'detail': f'Successfully enrolled in {course.code}.'})


# ═══════════════════════════════════════════════════════════════════
#  NOTIFICATION VIEWS  (all authenticated users)
# ═══════════════════════════════════════════════════════════════════

class NotificationListView(generics.ListAPIView):
    """GET /api/waitlist/notifications/"""
    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user)
        if self.request.query_params.get('unread'):
            qs = qs.filter(is_read=False)
        return qs


class MarkNotificationReadView(APIView):
    """PATCH /api/waitlist/notifications/:id/read/"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notif).data)


class MarkAllNotificationsReadView(APIView):
    """PATCH /api/waitlist/notifications/read-all/"""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'detail': 'All marked as read.'})


# ═══════════════════════════════════════════════════════════════════
#  INSTRUCTOR VIEWS
# ═══════════════════════════════════════════════════════════════════

class InstructorCourseWaitlistView(generics.ListAPIView):
    """
    GET /api/waitlist/course/:course_id/
    Returns all active waitlist entries for a specific course.
    Accessible by the instructor who owns the course or any admin.
    Supports ?status=notified|waiting|all  (default: all active)
    """
    serializer_class   = WaitlistEntrySerializer
    permission_classes = [IsAuthenticated, IsInstructorOrAdmin]

    def get_queryset(self):
        course_id = self.kwargs['course_id']
        qs = WaitlistEntry.objects.filter(
            course_id=course_id, is_active=True
        ).select_related('student', 'student__student_profile', 'course')

        # Instructors can only see their own courses
        if self.request.user.is_instructor:
            qs = qs.filter(course__instructor=self.request.user)

        # Optional filter
        status_filter = self.request.query_params.get('status')
        if status_filter == 'notified':
            qs = qs.filter(notified=True, accepted=False)
        elif status_filter == 'waiting':
            qs = qs.filter(notified=False)

        return qs.order_by('position')


class InstructorNotifyNextView(APIView):
    """
    POST /api/waitlist/course/:course_id/notify-next/
    Manually trigger a spot notification to the next student.
    Instructor or admin only.
    """
    permission_classes = [IsAuthenticated, IsInstructorOrAdmin]

    def post(self, request, course_id):
        from apps.courses.models import Course
        from apps.waitlist.tasks import notify_next_on_waitlist

        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return Response({'detail': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.is_instructor and course.instructor != request.user:
            return Response({'detail': 'Not your course.'}, status=status.HTTP_403_FORBIDDEN)

        # Check there are people waiting
        next_entry = WaitlistEntry.objects.filter(
            course=course, is_active=True, notified=False
        ).order_by('position').first()

        if not next_entry:
            return Response({'detail': 'No students waiting on this course.'}, status=status.HTTP_400_BAD_REQUEST)

        # Fire the async task
        notify_next_on_waitlist.delay(course_id)
        return Response({
            'detail': f'Notification queued for {next_entry.student.get_full_name()} (position #{next_entry.position}).'
        })


class InstructorRemoveFromWaitlistView(APIView):
    """
    DELETE /api/waitlist/course/:course_id/entry/:entry_id/
    Instructor or admin removes a specific student from the waitlist.
    Sends a notification to the removed student.
    """
    permission_classes = [IsAuthenticated, IsInstructorOrAdmin]

    def delete(self, request, course_id, entry_id):
        try:
            entry = WaitlistEntry.objects.select_related('student', 'course').get(
                pk=entry_id, course_id=course_id, is_active=True
            )
        except WaitlistEntry.DoesNotExist:
            return Response({'detail': 'Entry not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.is_instructor and entry.course.instructor != request.user:
            return Response({'detail': 'Not your course.'}, status=status.HTTP_403_FORBIDDEN)

        course           = entry.course
        student          = entry.student
        removed_position = entry.position

        entry.is_active = False
        entry.save(update_fields=['is_active'])

        # Re-rank
        WaitlistEntry.objects.filter(
            course=course, semester=entry.semester,
            is_active=True, position__gt=removed_position
        ).update(position=models.F('position') - 1)

        # Notify the student
        reason = request.data.get('reason', 'You have been removed from the waitlist by the instructor.')
        Notification.objects.create(
            recipient=student,
            type=Notification.TYPE_REMOVED,
            title=f'Removed from waitlist — {course.code}',
            message=reason,
            related_course=course,
        )

        return Response({'detail': f'{student.get_full_name()} removed from {course.code} waitlist.'})


class InstructorEnrollFromWaitlistView(APIView):
    """
    POST /api/waitlist/course/:course_id/entry/:entry_id/enroll/
    Instructor or admin directly enrolls a waitlisted student
    (bypassing the notification/accept window — used when capacity is expanded).
    """
    permission_classes = [IsAuthenticated, IsInstructorOrAdmin]

    def post(self, request, course_id, entry_id):
        from apps.registration.models import Registration
        from apps.waitlist.tasks import send_enrolled_from_waitlist_email

        try:
            entry = WaitlistEntry.objects.select_related('student', 'course').get(
                pk=entry_id, course_id=course_id, is_active=True
            )
        except WaitlistEntry.DoesNotExist:
            return Response({'detail': 'Entry not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.is_instructor and entry.course.instructor != request.user:
            return Response({'detail': 'Not your course.'}, status=status.HTTP_403_FORBIDDEN)

        course  = entry.course
        student = entry.student

        # Check not already enrolled
        if Registration.objects.filter(
            student=student, course=course, status=Registration.STATUS_ENROLLED
        ).exists():
            return Response({'detail': 'Student is already enrolled.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create enrollment
        Registration.objects.create(
            student=student,
            course=course,
            semester=entry.semester,
            status=Registration.STATUS_ENROLLED,
        )

        # Deactivate waitlist entry
        removed_position = entry.position
        entry.is_active = False
        entry.accepted  = True
        entry.save(update_fields=['is_active', 'accepted'])

        # Re-rank
        WaitlistEntry.objects.filter(
            course=course, semester=entry.semester,
            is_active=True, position__gt=removed_position
        ).update(position=models.F('position') - 1)

        # Notify student
        Notification.objects.create(
            recipient=student,
            type=Notification.TYPE_ENROLLED,
            title=f'Enrolled — {course.code}',
            message=f'You have been enrolled in {course.title} by your instructor.',
            related_course=course,
        )

        send_enrolled_from_waitlist_email.delay(student.id, course.id)

        return Response({'detail': f'{student.get_full_name()} enrolled in {course.code}.'})


# ═══════════════════════════════════════════════════════════════════
#  ADMIN VIEWS
# ═══════════════════════════════════════════════════════════════════

class AdminWaitlistView(generics.ListAPIView):
    """
    GET /api/waitlist/all/
    Admin — all active waitlist entries across all courses.
    Supports ?course=, ?semester=, ?notified=true/false
    """
    serializer_class   = WaitlistEntrySerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        qs = WaitlistEntry.objects.select_related(
            'student', 'student__student_profile',
            'course', 'course__department', 'course__instructor'
        ).filter(is_active=True)

        course   = self.request.query_params.get('course')
        semester = self.request.query_params.get('semester')
        notified = self.request.query_params.get('notified')

        if course:   qs = qs.filter(course_id=course)
        if semester: qs = qs.filter(semester=semester)
        if notified == 'true':  qs = qs.filter(notified=True)
        if notified == 'false': qs = qs.filter(notified=False)

        return qs.order_by('course', 'position')


class AdminClearCourseWaitlistView(APIView):
    """
    DELETE /api/waitlist/course/:course_id/clear/
    Admin only — deactivates ALL waitlist entries for a course
    and notifies every removed student.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def delete(self, request, course_id):
        from apps.courses.models import Course

        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response({'detail': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)

        entries = WaitlistEntry.objects.filter(course=course, is_active=True).select_related('student')
        count   = entries.count()
        reason  = request.data.get('reason', f'The waitlist for {course.code} has been cleared by an administrator.')

        for entry in entries:
            Notification.objects.create(
                recipient=entry.student,
                type=Notification.TYPE_REMOVED,
                title=f'Waitlist cleared — {course.code}',
                message=reason,
                related_course=course,
            )

        entries.update(is_active=False)

        return Response({'detail': f'Cleared {count} entries from {course.code} waitlist.'})


class AdminBulkNotifyView(APIView):
    """
    POST /api/waitlist/course/:course_id/notify-all/
    Admin — notify all un-notified students on a course's waitlist at once.
    Use with caution: only makes sense when many spots have opened (e.g. room change).
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, course_id):
        from apps.waitlist.tasks import notify_next_on_waitlist

        count = WaitlistEntry.objects.filter(
            course_id=course_id, is_active=True, notified=False
        ).count()

        if count == 0:
            return Response({'detail': 'No un-notified students on this waitlist.'}, status=status.HTTP_400_BAD_REQUEST)

        notify_next_on_waitlist.delay(course_id)
        return Response({'detail': f'Notification dispatched. {count} students in queue.'})