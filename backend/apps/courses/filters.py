import django_filters
from django.db.models import Count, Q, F
from .models import Course


class CourseFilter(django_filters.FilterSet):
    department = django_filters.CharFilter(field_name='department__code', lookup_expr='iexact')
    semester   = django_filters.CharFilter(field_name='semester', lookup_expr='icontains')
    credits    = django_filters.NumberFilter(field_name='credits')
    instructor = django_filters.NumberFilter(field_name='instructor__id')

    # level: accept integer or numeric string (e.g. "300" from the URL)
    level = django_filters.CharFilter(method='filter_level')

    # available: frontend sends the string "true"
    available = django_filters.CharFilter(method='filter_available')

    class Meta:
        model  = Course
        fields = ['department', 'level', 'semester', 'credits', 'available', 'instructor']

    def filter_level(self, queryset, name, value):
        """Accept '100', '200', '300', '400', '500' as the level value."""
        try:
            return queryset.filter(level=int(value))
        except (ValueError, TypeError):
            return queryset

    def filter_available(self, queryset, name, value):
        """
        Filter to courses that still have open spots.
        Accepts 'true' / '1' / 'yes' (case-insensitive) as truthy values.
        Uses a subquery annotation to avoid clashing with the model property.
        """
        if value.lower() in ('true', '1', 'yes'):
            queryset = queryset.annotate(
                _enrolled_count=Count(
                    'enrollments',
                    filter=Q(enrollments__status='enrolled')
                )
            ).filter(_enrolled_count__lt=F('capacity'))
        return queryset