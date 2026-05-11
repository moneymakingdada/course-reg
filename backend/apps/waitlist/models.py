from django.db import models
from apps.users.models import CustomUser
from apps.courses.models import Course


class WaitlistEntry(models.Model):
    student    = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE,
        related_name='waitlist_entries',
        limit_choices_to={'role': 'student'}
    )
    course     = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name='waitlist'
    )
    semester   = models.CharField(max_length=50)
    position   = models.PositiveIntegerField()          # rank in queue (1 = next up)
    is_active  = models.BooleanField(default=True)      # False once accepted or removed
    notified   = models.BooleanField(default=False)     # True when a spot was offered
    notified_at = models.DateTimeField(null=True, blank=True)
    accepted   = models.BooleanField(default=False)     # True when student accepted spot
    joined_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'course', 'semester')
        ordering = ['course', 'position']

    def __str__(self):
        return f'{self.student.get_full_name()} — {self.course.code} (pos {self.position})'

    @classmethod
    def next_position(cls, course, semester):
        """Returns the next available position number for a given course/semester."""
        last = cls.objects.filter(
            course=course, semester=semester, is_active=True
        ).order_by('-position').first()
        return (last.position + 1) if last else 1


class Notification(models.Model):
    TYPE_SPOT_AVAILABLE = 'spot_available'
    TYPE_ENROLLED       = 'spot_enrolled'
    TYPE_REMOVED        = 'removed'
    TYPE_GENERAL        = 'general'

    TYPE_CHOICES = [
        (TYPE_SPOT_AVAILABLE, 'Spot Available'),
        (TYPE_ENROLLED,       'Enrolled from Waitlist'),
        (TYPE_REMOVED,        'Removed from Waitlist'),
        (TYPE_GENERAL,        'General'),
    ]

    recipient   = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications')
    type        = models.CharField(max_length=30, choices=TYPE_CHOICES, default=TYPE_GENERAL)
    title       = models.CharField(max_length=200)
    message     = models.TextField()
    is_read     = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)
    related_course = models.ForeignKey(Course, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.type}] → {self.recipient.get_full_name()}: {self.title}'
