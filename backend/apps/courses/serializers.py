from rest_framework import serializers
from .models import Course, Department


class DepartmentSerializer(serializers.ModelSerializer):
    # Annotate how many active courses belong to this department
    course_count = serializers.SerializerMethodField()

    class Meta:
        model  = Department
        fields = ['id', 'name', 'code', 'course_count']

    def get_course_count(self, obj):
        return obj.courses.filter(is_active=True).count()


class CourseInstructorSerializer(serializers.Serializer):
    """Lightweight instructor info embedded in course responses."""
    id         = serializers.IntegerField()
    full_name  = serializers.CharField()
    title      = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()

    def get_title(self, obj):
        try:
            return obj.instructor_profile.title
        except Exception:
            return ''

    def get_department(self, obj):
        try:
            return obj.instructor_profile.department
        except Exception:
            return ''


class CourseListSerializer(serializers.ModelSerializer):
    """Compact serializer — used in catalog list view."""
    department      = DepartmentSerializer(read_only=True)
    instructor_name = serializers.SerializerMethodField()
    enrolled_count  = serializers.IntegerField(read_only=True)
    available_spots = serializers.IntegerField(read_only=True)
    is_full         = serializers.BooleanField(read_only=True)
    waitlist_count  = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Course
        fields = [
            'id', 'code', 'title', 'credits', 'level', 'department',
            'instructor_name', 'schedule', 'room', 'semester',
            'capacity', 'enrolled_count', 'available_spots',
            'is_full', 'waitlist_count', 'is_active',
        ]

    def get_instructor_name(self, obj):
        if obj.instructor:
            try:
                title = obj.instructor.instructor_profile.title
            except Exception:
                title = ''
            return f'{title} {obj.instructor.get_full_name()}'.strip()
        return 'TBA'


class CourseDetailSerializer(CourseListSerializer):
    """Full serializer — used in detail view (includes prerequisites + description)."""
    prerequisites = CourseListSerializer(many=True, read_only=True)

    class Meta(CourseListSerializer.Meta):
        fields = CourseListSerializer.Meta.fields + ['description', 'prerequisites']


class CourseWriteSerializer(serializers.ModelSerializer):
    """Used by instructors/admins to create or update courses."""
    class Meta:
        model  = Course
        fields = [
            'code', 'title', 'description', 'credits', 'level',
            'department', 'instructor', 'capacity', 'schedule',
            'room', 'semester', 'is_active', 'prerequisites',
        ]
