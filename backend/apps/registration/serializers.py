from rest_framework import serializers
from apps.courses.serializers import CourseListSerializer
from .models import Registration, Payment


class RegistrationSerializer(serializers.ModelSerializer):
    course_detail = CourseListSerializer(source='course', read_only=True)
    student_name  = serializers.SerializerMethodField()

    class Meta:
        model  = Registration
        fields = [
            'id', 'student', 'student_name', 'course', 'course_detail',
            'status', 'registered_at', 'dropped_at', 'semester', 'credits',
        ]
        read_only_fields = ['student', 'status', 'registered_at', 'dropped_at', 'credits']

    def get_student_name(self, obj):
        return obj.student.get_full_name()


class EnrollSerializer(serializers.Serializer):
    """Validates a student's request to enroll in one or more courses."""
    course_ids = serializers.ListField(
        child=serializers.IntegerField(), min_length=1,
        help_text='List of course IDs to enroll in.'
    )
    semester   = serializers.CharField()

    def validate(self, attrs):
        from apps.courses.models import Course
        from apps.users.models import StudentProfile

        request  = self.context['request']
        student  = request.user
        semester = attrs['semester']

        try:
            profile = student.student_profile
        except StudentProfile.DoesNotExist:
            raise serializers.ValidationError('Student profile not found.')

        courses = Course.objects.filter(id__in=attrs['course_ids'], is_active=True)
        if courses.count() != len(attrs['course_ids']):
            raise serializers.ValidationError('One or more courses not found or inactive.')

        # Check already enrolled
        already = Registration.objects.filter(
            student=student, course__in=courses,
            semester=semester, status='enrolled'
        ).values_list('course__code', flat=True)
        if already:
            raise serializers.ValidationError(
                f'Already enrolled in: {", ".join(already)}'
            )

        # Check prerequisites
        for course in courses:
            prereqs = course.prerequisites.all()
            for prereq in prereqs:
                has_passed = Registration.objects.filter(
                    student=student, course=prereq, status='completed'
                ).exists()
                if not has_passed:
                    raise serializers.ValidationError(
                        f'{course.code} requires {prereq.code} to be completed first.'
                    )

        # Check capacity
        full_courses = [c.code for c in courses if c.is_full]
        if full_courses:
            raise serializers.ValidationError(
                f'These courses are full: {", ".join(full_courses)}. Join the waitlist instead.'
            )

        # Check credit limit
        current_credits = sum(
            r.credits for r in Registration.objects.filter(
                student=student, semester=semester, status='enrolled'
            )
        )
        new_credits = sum(c.credits for c in courses)
        if current_credits + new_credits > profile.max_credits:
            raise serializers.ValidationError(
                f'Credit limit exceeded. You have {current_credits} credits; '
                f'adding {new_credits} would exceed your {profile.max_credits} credit limit.'
            )

        attrs['courses'] = courses
        return attrs


class PaymentSerializer(serializers.ModelSerializer):
    registration_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True
    )

    class Meta:
        model  = Payment
        fields = [
            'id', 'student', 'registration_ids', 'amount', 'method',
            'status', 'reference', 'semester', 'paid_at', 'created_at', 'notes',
        ]
        read_only_fields = ['student', 'status', 'paid_at', 'created_at']

    def create(self, validated_data):
        registration_ids = validated_data.pop('registration_ids')
        registrations    = Registration.objects.filter(id__in=registration_ids)
        payment = Payment.objects.create(**validated_data)
        payment.registrations.set(registrations)
        return payment