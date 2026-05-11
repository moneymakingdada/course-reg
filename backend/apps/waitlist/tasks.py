from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


# ─── Helper ───────────────────────────────────────────────────────────────────

def _send_email(subject, to_email, txt_template, html_template, context):
    """
    Send a plain-text + HTML multipart email.
    Adds frontend_url to every context automatically.
    """
    context.setdefault('frontend_url', settings.FRONTEND_URL)

    text_body = render_to_string(txt_template, context)
    html_body = render_to_string(html_template, context)

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )
    msg.attach_alternative(html_body, 'text/html')
    msg.send(fail_silently=False)


# ─── Task 1: Notify next student a spot is available ─────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notify_next_on_waitlist(self, course_id):
    """
    Called whenever a student drops a course or a waitlist spot is freed.
    Finds the next active, un-notified entry on the waitlist,
    marks them as notified, creates an in-app Notification, and sends email.
    """
    from apps.waitlist.models import WaitlistEntry, Notification
    from apps.courses.models import Course

    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        logger.warning(f'notify_next_on_waitlist: course {course_id} not found')
        return

    # Only trigger if there is actually space
    if course.is_full:
        logger.info(f'notify_next_on_waitlist: {course.code} still full, skipping')
        return

    entry = (
        WaitlistEntry.objects
        .filter(course=course, is_active=True, notified=False)
        .select_related('student')
        .order_by('position')
        .first()
    )

    if not entry:
        logger.info(f'notify_next_on_waitlist: no waiting students for {course.code}')
        return

    # Mark notified + record deadline
    accept_hours = getattr(settings, 'WAITLIST_ACCEPT_WINDOW_HOURS', 48)
    entry.notified    = True
    entry.notified_at = timezone.now()
    entry.save(update_fields=['notified', 'notified_at'])

    # Create in-app notification
    Notification.objects.create(
        recipient=entry.student,
        type=Notification.TYPE_SPOT_AVAILABLE,
        title=f'Spot available — {course.code}',
        message=(
            f'A spot opened in {course.title}. '
            f'You have {accept_hours} hours to accept.'
        ),
        related_course=course,
    )

    # Build email context
    deadline   = entry.notified_at + timezone.timedelta(hours=accept_hours)
    accept_url = f'{settings.FRONTEND_URL}/student/waitlist'
    decline_url = f'{settings.FRONTEND_URL}/student/waitlist'
    waitlist_url = f'{settings.FRONTEND_URL}/student/waitlist'

    context = {
        'student_name': entry.student.get_full_name(),
        'course_code':  course.code,
        'course_title': course.title,
        'schedule':     course.schedule,
        'room':         course.room,
        'credits':      course.credits,
        'semester':     course.semester,
        'position':     entry.position,
        'accept_hours': accept_hours,
        'deadline':     deadline.strftime('%A, %d %B %Y at %H:%M'),
        'accept_url':   accept_url,
        'decline_url':  decline_url,
        'waitlist_url': waitlist_url,
    }

    try:
        _send_email(
            subject=f'Spot available: {course.code} — {course.title}',
            to_email=entry.student.email,
            txt_template='emails/spot_available.txt',
            html_template='emails/spot_available.html',
            context=context,
        )
        logger.info(f'Spot notification sent to {entry.student.email} for {course.code}')
    except Exception as exc:
        logger.error(f'Failed to send spot email to {entry.student.email}: {exc}')
        raise self.retry(exc=exc)


# ─── Task 2: Confirm enrollment from waitlist ─────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_enrolled_from_waitlist_email(self, student_id, course_id):
    """
    Sends a confirmation email after a student accepts their waitlist spot.
    """
    from apps.users.models import CustomUser
    from apps.courses.models import Course

    try:
        student = CustomUser.objects.get(id=student_id)
        course  = Course.objects.get(id=course_id)
    except (CustomUser.DoesNotExist, Course.DoesNotExist) as exc:
        logger.warning(f'send_enrolled_from_waitlist_email: {exc}')
        return

    context = {
        'student_name': student.get_full_name(),
        'course_code':  course.code,
        'course_title': course.title,
        'schedule':     course.schedule,
        'room':         course.room,
        'credits':      course.credits,
        'semester':     course.semester,
        'dashboard_url': f'{settings.FRONTEND_URL}/student/dashboard',
    }

    try:
        _send_email(
            subject=f'Enrolled: {course.code} — {course.title}',
            to_email=student.email,
            txt_template='emails/spot_available.txt',   # reuse txt as fallback
            html_template='emails/enrolled_from_waitlist.html',
            context=context,
        )
        logger.info(f'Enrollment confirmation sent to {student.email} for {course.code}')
    except Exception as exc:
        logger.error(f'Failed to send enrollment email to {student.email}: {exc}')
        raise self.retry(exc=exc)


# ─── Task 3: Expire un-accepted spots (run via Celery Beat) ──────────────────

@shared_task
def expire_stale_waitlist_notifications():
    """
    Periodic task — run every hour via Celery Beat.
    Finds notified waitlist entries whose deadline has passed,
    resets them, and notifies the next student.
    """
    from apps.waitlist.models import WaitlistEntry, Notification
    from apps.courses.models import Course

    accept_hours = getattr(settings, 'WAITLIST_ACCEPT_WINDOW_HOURS', 48)
    cutoff       = timezone.now() - timezone.timedelta(hours=accept_hours)

    expired = (
        WaitlistEntry.objects
        .filter(is_active=True, notified=True, accepted=False, notified_at__lt=cutoff)
        .select_related('student', 'course')
    )

    for entry in expired:
        course = entry.course
        student = entry.student

        logger.info(f'Expiring waitlist spot: {student.email} for {course.code}')

        # Reset notification — student stays on the waitlist at the same position
        entry.notified    = False
        entry.notified_at = None
        entry.save(update_fields=['notified', 'notified_at'])

        # In-app notification
        Notification.objects.create(
            recipient=student,
            type=Notification.TYPE_GENERAL,
            title=f'Spot expired — {course.code}',
            message=(
                f'Your reserved spot in {course.title} expired. '
                f"You're still on the waitlist at position #{entry.position}."
            ),
            related_course=course,
        )

        # Send expiry email
        context = {
            'student_name': student.get_full_name(),
            'course_code':  course.code,
            'course_title': course.title,
            'accept_hours': accept_hours,
            'new_position': entry.position,
            'waitlist_url': f'{settings.FRONTEND_URL}/student/waitlist',
        }
        try:
            _send_email(
                subject=f'Spot expired: {course.code}',
                to_email=student.email,
                txt_template='emails/spot_available.txt',
                html_template='emails/spot_expired.html',
                context=context,
            )
        except Exception as exc:
            logger.error(f'Failed to send expiry email to {student.email}: {exc}')

        # Offer the spot to the next student on the waitlist
        notify_next_on_waitlist.delay(course.id)

    logger.info(f'expire_stale_waitlist_notifications: expired {expired.count()} entries')