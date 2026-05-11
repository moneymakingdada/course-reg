from django.urls import path
from .views import (
    # Student
    JoinWaitlistView, MyWaitlistView, LeaveWaitlistView, AcceptSpotView,
    # Notifications
    NotificationListView, MarkNotificationReadView, MarkAllNotificationsReadView,
    # Instructor
    InstructorCourseWaitlistView, InstructorNotifyNextView,
    InstructorRemoveFromWaitlistView, InstructorEnrollFromWaitlistView,
    # Admin
    AdminWaitlistView, AdminClearCourseWaitlistView, AdminBulkNotifyView,
)

urlpatterns = [
    # ── Student ────────────────────────────────────────────────────────────
    path('',                                        JoinWaitlistView.as_view(),                  name='waitlist-join'),
    path('mine/',                                   MyWaitlistView.as_view(),                    name='my-waitlist'),
    path('<int:pk>/',                               LeaveWaitlistView.as_view(),                 name='waitlist-leave'),
    path('<int:pk>/accept/',                        AcceptSpotView.as_view(),                    name='waitlist-accept'),

    # ── Notifications ───────────────────────────────────────────────────────
    path('notifications/',                          NotificationListView.as_view(),              name='notifications'),
    path('notifications/read-all/',                 MarkAllNotificationsReadView.as_view(),      name='notifications-read-all'),
    path('notifications/<int:pk>/read/',            MarkNotificationReadView.as_view(),          name='notification-read'),

    # ── Instructor / Admin: per-course management ──────────────────────────
    path('course/<int:course_id>/',                 InstructorCourseWaitlistView.as_view(),      name='course-waitlist'),
    path('course/<int:course_id>/notify-next/',     InstructorNotifyNextView.as_view(),          name='waitlist-notify-next'),
    path('course/<int:course_id>/notify-all/',      AdminBulkNotifyView.as_view(),               name='waitlist-notify-all'),
    path('course/<int:course_id>/clear/',           AdminClearCourseWaitlistView.as_view(),      name='waitlist-clear'),
    path('course/<int:course_id>/entry/<int:entry_id>/',        InstructorRemoveFromWaitlistView.as_view(), name='waitlist-remove-entry'),
    path('course/<int:course_id>/entry/<int:entry_id>/enroll/', InstructorEnrollFromWaitlistView.as_view(), name='waitlist-enroll-entry'),

    # ── Admin: all entries ─────────────────────────────────────────────────
    path('all/',                                    AdminWaitlistView.as_view(),                 name='all-waitlists'),
]