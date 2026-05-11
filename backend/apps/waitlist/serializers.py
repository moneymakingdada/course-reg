from rest_framework import serializers
from apps.courses.serializers import CourseListSerializer
from .models import WaitlistEntry, Notification


class WaitlistEntrySerializer(serializers.ModelSerializer):
    course_detail = CourseListSerializer(source='course', read_only=True)
    student_name  = serializers.SerializerMethodField()

    class Meta:
        model  = WaitlistEntry
        fields = [
            'id', 'student', 'student_name', 'course', 'course_detail',
            'semester', 'position', 'is_active', 'notified', 'notified_at',
            'accepted', 'joined_at',
        ]
        read_only_fields = [
            'student', 'position', 'is_active', 'notified',
            'notified_at', 'accepted', 'joined_at',
        ]

    def get_student_name(self, obj):
        return obj.student.get_full_name()


class JoinWaitlistSerializer(serializers.Serializer):
    """Validates a request to join a waitlist."""
    course_id = serializers.IntegerField()
    semester  = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        from apps.courses.models import Course
        from apps.registration.models import Registration

        request   = self.context['request']
        student   = request.user
        course_id = attrs['course_id']

        # Look up the course
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            raise serializers.ValidationError({'course_id': 'Course not found or inactive.'})

        # Use the course's own semester if the client didn't send one
        semester = attrs.get('semester', '').strip() or course.semester
        attrs['semester'] = semester

        # Must not already be enrolled in this course
        if Registration.objects.filter(
            student=student, course=course, status='enrolled'
        ).exists():
            raise serializers.ValidationError(
                f'You are already enrolled in {course.code}.'
            )

        # Must not already be on this waitlist
        if WaitlistEntry.objects.filter(
            student=student, course=course, is_active=True
        ).exists():
            raise serializers.ValidationError(
                f'You are already on the waitlist for {course.code}.'
            )

        # REMOVED: hard "course must be full" check.
        # Students should be able to join a waitlist for any active course.
        # The frontend shows the "Join waitlist" button only when is_full=True,
        # but we don't enforce it server-side so dev/testing isn't blocked.

        attrs['course'] = course
        return attrs


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notification
        fields = ['id', 'type', 'title', 'message', 'is_read', 'created_at', 'related_course']
        read_only_fields = ['id', 'type', 'title', 'message', 'created_at', 'related_course']
