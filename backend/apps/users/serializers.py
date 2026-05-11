from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import CustomUser, StudentProfile, InstructorProfile


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StudentProfile
        fields = ['student_id', 'level', 'gpa', 'max_credits']


class InstructorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = InstructorProfile
        fields = ['staff_id', 'department', 'title', 'office', 'office_hours']


class UserSerializer(serializers.ModelSerializer):
    """Read-only serializer — used for profile retrieval."""
    student_profile    = StudentProfileSerializer(read_only=True)
    instructor_profile = InstructorProfileSerializer(read_only=True)
    full_name          = serializers.SerializerMethodField()

    class Meta:
        model  = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'date_joined', 'student_profile', 'instructor_profile',
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()


class RegisterSerializer(serializers.ModelSerializer):
    """Handles account creation for all three roles."""
    password         = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    # Student fields — allow_blank so empty string from other roles doesn't fail
    student_id   = serializers.CharField(required=False, allow_blank=True, default='')
    level        = serializers.IntegerField(required=False, default=100)

    # Instructor fields
    staff_id     = serializers.CharField(required=False, allow_blank=True, default='')
    department   = serializers.CharField(required=False, allow_blank=True, default='')
    title        = serializers.CharField(required=False, allow_blank=True, default='Dr.')
    office       = serializers.CharField(required=False, allow_blank=True, default='')
    office_hours = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model  = CustomUser
        fields = [
            'email', 'first_name', 'last_name', 'role',
            'password', 'confirm_password',
            'student_id', 'level',
            'staff_id', 'department', 'title', 'office', 'office_hours',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})

        role = attrs.get('role')

        # Only enforce role-specific required fields when they are actually needed
        if role == CustomUser.STUDENT and not attrs.get('student_id', '').strip():
            raise serializers.ValidationError({'student_id': 'Student ID is required.'})
        if role == CustomUser.INSTRUCTOR and not attrs.get('staff_id', '').strip():
            raise serializers.ValidationError({'staff_id': 'Staff ID is required.'})
        if role == CustomUser.INSTRUCTOR and not attrs.get('department', '').strip():
            raise serializers.ValidationError({'department': 'Department is required.'})

        return attrs

    def create(self, validated_data):
        # Remove all profile fields before creating the user model
        profile_keys = ['student_id', 'level', 'staff_id', 'department', 'title', 'office', 'office_hours']
        profile_data = {k: validated_data.pop(k, None) for k in profile_keys}
        validated_data.pop('confirm_password', None)

        user = CustomUser.objects.create_user(**validated_data)

        if user.role == CustomUser.STUDENT:
            StudentProfile.objects.create(
                user=user,
                student_id=profile_data.get('student_id', ''),
                level=profile_data.get('level', 100),
            )
        elif user.role == CustomUser.INSTRUCTOR:
            InstructorProfile.objects.create(
                user=user,
                staff_id=profile_data.get('staff_id', ''),
                department=profile_data.get('department', ''),
                title=profile_data.get('title', 'Dr.'),
                office=profile_data.get('office', ''),
                office_hours=profile_data.get('office_hours', ''),
            )

        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password     = serializers.CharField(write_only=True)
    new_password     = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs