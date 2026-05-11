from django.db import models
from apps.users.models import CustomUser


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)  # e.g. "CS", "MATH"

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.code} — {self.name}'


class Course(models.Model):
    LEVEL_CHOICES = [(100, '100'), (200, '200'), (300, '300'), (400, '400'), (500, '500')]

    department   = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='courses')
    instructor   = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='courses_teaching',
        limit_choices_to={'role': 'instructor'}
    )
    code         = models.CharField(max_length=20, unique=True)   # e.g. CS301
    title        = models.CharField(max_length=200)
    description  = models.TextField(blank=True)
    credits      = models.PositiveIntegerField(default=3)
    level        = models.IntegerField(choices=LEVEL_CHOICES, default=300)
    capacity     = models.PositiveIntegerField(default=40)
    schedule     = models.CharField(max_length=200, blank=True)   # e.g. "MWF 8:00–9:00am"
    room         = models.CharField(max_length=100, blank=True)
    semester     = models.CharField(max_length=50)                # e.g. "2025/2026 S2"
    is_active    = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    prerequisites = models.ManyToManyField(
        'self', symmetrical=False, blank=True, related_name='required_for'
    )

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f'{self.code} — {self.title}'

    @property
    def enrolled_count(self):
        return self.enrollments.filter(status='enrolled').count()

    @property
    def waitlist_count(self):
        from apps.waitlist.models import WaitlistEntry
        return WaitlistEntry.objects.filter(course=self, is_active=True).count()

    @property
    def available_spots(self):
        return max(0, self.capacity - self.enrolled_count)

    @property
    def is_full(self):
        return self.enrolled_count >= self.capacity