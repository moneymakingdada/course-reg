from django.db import models
from apps.users.models import CustomUser
from apps.courses.models import Course


class Registration(models.Model):
    STATUS_ENROLLED  = 'enrolled'
    STATUS_DROPPED   = 'dropped'
    STATUS_COMPLETED = 'completed'

    STATUS_CHOICES = [
        (STATUS_ENROLLED,  'Enrolled'),
        (STATUS_DROPPED,   'Dropped'),
        (STATUS_COMPLETED, 'Completed'),
    ]

    student      = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE,
        related_name='registrations',
        limit_choices_to={'role': 'student'}
    )
    course       = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name='enrollments'
    )
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ENROLLED)
    registered_at = models.DateTimeField(auto_now_add=True)
    dropped_at   = models.DateTimeField(null=True, blank=True)
    semester     = models.CharField(max_length=50)

    class Meta:
        unique_together = ('student', 'course', 'semester')
        ordering = ['-registered_at']

    def __str__(self):
        return f'{self.student.get_full_name()} → {self.course.code} ({self.status})'

    @property
    def credits(self):
        return self.course.credits


class Payment(models.Model):
    METHOD_BANK    = 'bank'
    METHOD_MOMO    = 'mobile_money'
    METHOD_CARD    = 'card'

    METHOD_CHOICES = [
        (METHOD_BANK, 'Bank Transfer'),
        (METHOD_MOMO, 'Mobile Money'),
        (METHOD_CARD, 'Card'),
    ]

    STATUS_PENDING   = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_FAILED    = 'failed'

    PAYMENT_STATUS = [
        (STATUS_PENDING,   'Pending'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_FAILED,    'Failed'),
    ]

    student        = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='payments')
    registrations  = models.ManyToManyField(Registration, related_name='payments')
    amount         = models.DecimalField(max_digits=10, decimal_places=2)
    method         = models.CharField(max_length=20, choices=METHOD_CHOICES)
    status         = models.CharField(max_length=20, choices=PAYMENT_STATUS, default=STATUS_PENDING)
    reference      = models.CharField(max_length=100, unique=True)
    semester       = models.CharField(max_length=50)
    paid_at        = models.DateTimeField(null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    notes          = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.student.get_full_name()} — GHS {self.amount} ({self.status})'