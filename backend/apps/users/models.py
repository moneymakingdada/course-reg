from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', CustomUser.ADMIN)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    STUDENT    = 'student'
    INSTRUCTOR = 'instructor'
    ADMIN      = 'admin'

    ROLE_CHOICES = [
        (STUDENT,    'Student'),
        (INSTRUCTOR, 'Instructor'),
        (ADMIN,      'Admin'),
    ]

    email      = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name  = models.CharField(max_length=100)
    role       = models.CharField(max_length=20, choices=ROLE_CHOICES, default=STUDENT)
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = CustomUserManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'role']

    class Meta:
        verbose_name = 'User'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.get_full_name()} ({self.role})'

    def get_full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    @property
    def is_student(self):
        return self.role == self.STUDENT

    @property
    def is_instructor(self):
        return self.role == self.INSTRUCTOR

    @property
    def is_admin_user(self):
        return self.role == self.ADMIN


class StudentProfile(models.Model):
    user       = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='student_profile')
    student_id = models.CharField(max_length=20, unique=True)
    level      = models.PositiveIntegerField(default=100)  # 100, 200, 300, 400
    gpa        = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    max_credits = models.PositiveIntegerField(default=24)

    class Meta:
        verbose_name = 'Student Profile'

    def __str__(self):
        return f'{self.user.get_full_name()} — {self.student_id}'


class InstructorProfile(models.Model):
    user        = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='instructor_profile')
    staff_id    = models.CharField(max_length=20, unique=True)
    department  = models.CharField(max_length=100)
    title       = models.CharField(max_length=50, default='Dr.')  # Dr., Prof., Mr., etc.
    office      = models.CharField(max_length=100, blank=True)
    office_hours = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = 'Instructor Profile'

    def __str__(self):
        return f'{self.title} {self.user.get_full_name()} — {self.department}'