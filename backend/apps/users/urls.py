from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView, RegisterView, LogoutView,
    ProfileView, ChangePasswordView,
    UserListView, UserDetailView,
)

urlpatterns = [
    # Auth
    path('login/',           LoginView.as_view(),          name='auth-login'),
    path('register/',        RegisterView.as_view(),        name='auth-register'),
    path('logout/',          LogoutView.as_view(),          name='auth-logout'),
    path('token/refresh/',   TokenRefreshView.as_view(),    name='token-refresh'),

    # Profile
    path('profile/',         ProfileView.as_view(),         name='auth-profile'),
    path('change-password/', ChangePasswordView.as_view(),  name='auth-change-password'),

    # Admin user management
    path('users/',           UserListView.as_view(),        name='user-list'),
    path('users/<int:pk>/',  UserDetailView.as_view(),      name='user-detail'),
]