from django.urls import path
from .views import (
    EnrollView, MyRegistrationListView, DropCourseView,
    PaymentCreateView, MyPaymentListView,
    AdminRegistrationListView, CourseRosterView,
)

urlpatterns = [
    # Student enrollment
    path('',                          EnrollView.as_view(),               name='enroll'),
    path('mine/',                     MyRegistrationListView.as_view(),    name='my-registrations'),
    path('<int:pk>/drop/',            DropCourseView.as_view(),            name='drop-course'),

    # Payment
    path('pay/',                      PaymentCreateView.as_view(),         name='payment-create'),
    path('payments/',                 MyPaymentListView.as_view(),         name='my-payments'),

    # Admin & instructor
    path('all/',                      AdminRegistrationListView.as_view(), name='all-registrations'),
    path('roster/<int:course_id>/',   CourseRosterView.as_view(),          name='course-roster'),
]