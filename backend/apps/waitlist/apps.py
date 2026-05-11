from django.apps import AppConfig


class WaitlistConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name               = 'apps.waitlist'
    verbose_name       = 'Waitlist'

    def ready(self):
        # Import signals so receivers are registered when Django starts
        import apps.waitlist.signals  # noqa: F401