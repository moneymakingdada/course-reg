from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from apps.registration.models import Registration


@receiver(post_save, sender=Registration)
def on_registration_change(sender, instance, created, **kwargs):
    """
    Fires when a Registration is saved.
    - If a student just dropped a course → check if anyone is waiting.
    - If a new enrollment is created from the waitlist accept flow → send confirmation.
    """
    from apps.waitlist.tasks import notify_next_on_waitlist

    if instance.status == Registration.STATUS_DROPPED:
        # A spot just freed up — notify the next person asynchronously
        notify_next_on_waitlist.delay(instance.course_id)