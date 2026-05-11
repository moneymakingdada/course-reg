from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.users.permissions import IsInstructorOrAdmin, IsAdminUser
from .models import Course, Department
from .serializers import (
    CourseListSerializer, CourseDetailSerializer,
    CourseWriteSerializer, DepartmentSerializer
)
from .filters import CourseFilter


# ─── Departments ───────────────────────────────────────────────────────────────

class DepartmentListView(generics.ListCreateAPIView):
    """
    GET  /api/courses/departments/       — list all departments (public)
    POST /api/courses/departments/       — create department (admin only)
    """
    queryset         = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]


# ─── Course Catalog ────────────────────────────────────────────────────────────

class CourseListView(generics.ListCreateAPIView):
    """
    GET  /api/courses/
        Supports:
          ?search=        — searches code, title, description
          ?department=CS  — filter by dept code
          ?level=300
          ?credits=3
          ?available=true — only open courses
          ?semester=
          ?ordering=code,title,credits
    POST /api/courses/    — create new course (instructor/admin only)
    """
    filter_backends  = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class  = CourseFilter
    search_fields    = ['code', 'title', 'description', 'department__name']
    ordering_fields  = ['code', 'title', 'credits', 'level', 'capacity']
    ordering         = ['code']

    def get_queryset(self):
        return Course.objects.select_related(
            'department', 'instructor', 'instructor__instructor_profile'
        ).prefetch_related('prerequisites').filter(is_active=True)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CourseWriteSerializer
        return CourseListSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated(), IsInstructorOrAdmin()]


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/courses/:id/   — full course detail with prerequisites (public)
    PATCH  /api/courses/:id/   — update course (instructor who owns it or admin)
    DELETE /api/courses/:id/   — deactivate course (admin only)
    """
    queryset = Course.objects.select_related(
        'department', 'instructor', 'instructor__instructor_profile'
    ).prefetch_related('prerequisites')

    def get_serializer_class(self):
        if self.request.method in ['PATCH', 'PUT']:
            return CourseWriteSerializer
        return CourseDetailSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated(), IsInstructorOrAdmin()]

    def destroy(self, request, *args, **kwargs):
        # Soft-delete instead of hard delete
        course = self.get_object()
        course.is_active = False
        course.save()
        return Response({'detail': 'Course deactivated.'}, status=status.HTTP_204_NO_CONTENT)


# ─── Instructor: my courses ────────────────────────────────────────────────────

class MyCourseListView(generics.ListAPIView):
    """
    GET /api/courses/mine/
    Returns the courses taught by the currently authenticated instructor.
    """
    serializer_class   = CourseDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Course.objects.filter(
            instructor=self.request.user, is_active=True
        ).select_related('department').prefetch_related('prerequisites', 'enrollments')
