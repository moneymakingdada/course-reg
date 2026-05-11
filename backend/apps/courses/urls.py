from django.urls import path
from .views import (
    CourseListView, CourseDetailView,
    DepartmentListView, MyCourseListView,
)

urlpatterns = [
    path('',                  CourseListView.as_view(),      name='course-list'),
    path('<int:pk>/',         CourseDetailView.as_view(),    name='course-detail'),
    path('mine/',             MyCourseListView.as_view(),    name='my-courses'),
    path('departments/',      DepartmentListView.as_view(),  name='department-list'),
]