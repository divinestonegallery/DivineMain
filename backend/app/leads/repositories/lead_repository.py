from django.db import connection
from django.db.models import F, Q
from django.utils import timezone

from app.accounts.models import Customer
from app.leads.constants import OPEN_LEAD_STATUSES
from app.leads.models import Lead, LeadActivity, LeadNote
from app.leads.normalization import normalize_phone
from app.leads.serializers import LeadActivitySerializer, LeadNoteSerializer, LeadPersonSerializer, LeadSerializer


def _paginate(queryset, page, page_size, serializer):
    total = queryset.count()
    start = (page - 1) * page_size
    return {
        'items': serializer(queryset[start:start + page_size], many=True).data,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total_items': total,
            'total_pages': (total + page_size - 1) // page_size if page_size else 0,
        },
    }


def _identity_query(email, phone):
    """Match an email case-insensitively or a already-normalized phone exactly.

    Blank values never match, so one missing contact field cannot pull in every
    lead that also left that field empty.
    """
    query = Q()
    if email:
        query |= Q(email__iexact=email)
    if phone:
        query |= Q(phone=phone)
    return query


def _scoped(queryset, scope):
    if scope.get('unrestricted'):
        return queryset
    actor_id = scope['actor_id']
    return queryset.filter(Q(created_by_id=actor_id) | Q(assigned_to_id=actor_id))


class LeadRepository:
    @staticmethod
    def list_leads(params, scope):
        queryset = Lead.objects.select_related('assigned_to', 'created_by').all()
        queryset = _scoped(queryset, scope)
        if params.get('status'):
            queryset = queryset.filter(status=params['status'])
        if params.get('source'):
            queryset = queryset.filter(source=params['source'])
        if params.get('touchpoint'):
            queryset = queryset.filter(touchpoint=params['touchpoint'])
        if params.get('assignee'):
            queryset = queryset.filter(assigned_to_id=params['assignee'])
        if params.get('assignment') == 'unassigned':
            queryset = queryset.filter(assigned_to__isnull=True)
        search = (params.get('search') or '').strip()
        if search:
            phone_key = normalize_phone(search)
            query = (
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(summary__icontains=search)
            )
            if phone_key:
                query = query | Q(phone__icontains=phone_key)
            queryset = queryset.filter(query)
        follow_up = params.get('follow_up')
        if follow_up == 'overdue':
            queryset = queryset.filter(
                follow_up_at__isnull=False,
                follow_up_at__lte=timezone.now(),
                status__in=OPEN_LEAD_STATUSES,
            )
        elif follow_up == 'upcoming':
            queryset = queryset.filter(follow_up_at__gt=timezone.now())
        return _paginate(queryset, params['page'], params['page_size'], LeadSerializer)

    @staticmethod
    def get_lead(uid, scope):
        lead = _scoped(
            Lead.objects.select_related('assigned_to', 'created_by'),
            scope,
        ).filter(uid=uid).first()
        return LeadSerializer(lead).data if lead else None

    @staticmethod
    def get_lead_id(uid, scope):
        return _scoped(Lead.objects.all(), scope).filter(uid=uid).values_list('id', flat=True).first()

    @staticmethod
    def open_matches(email, phone):
        query = Q()
        if email:
            query |= Q(email__iexact=email)
        if phone:
            query |= Q(phone=phone)
        if not query:
            return []
        matches = Lead.objects.filter(query, status__in=OPEN_LEAD_STATUSES).select_related(
            'assigned_to', 'created_by',
        ).order_by('-created_at', '-id')
        return [
            {
                'uid': str(lead.uid),
                'name': lead.name,
                'status': lead.status,
                'city': lead.city,
                'source': lead.source,
                'created_by_id': lead.created_by_id,
                'assigned_to_id': lead.assigned_to_id,
            }
            for lead in matches[:20]
        ]

    @staticmethod
    def active_identity_matches(email, phone, limit):
        """Open leads whose email or phone belongs to this person, newest first."""
        query = _identity_query(email, phone)
        if not query:
            return []
        matches = Lead.objects.filter(query, status__in=OPEN_LEAD_STATUSES).order_by(
            '-created_at', '-id',
        ).values('id', 'uid', 'email', 'phone', 'status')
        return [
            {**match, 'uid': str(match['uid'])}
            for match in matches[:limit]
        ]

    @staticmethod
    def recent_lead_exists(email, phone, since):
        """Whether this person has a lead in any status created at or after `since`."""
        query = _identity_query(email, phone)
        if not query:
            return False
        return Lead.objects.filter(query, created_at__gte=since).exists()

    @staticmethod
    def lock_identity(email, phone):
        """Serialize the match-then-write decision for one person.

        Two enquiries for the same person can otherwise both find no active lead
        and both insert. PostgreSQL holds a transaction-scoped advisory lock on
        each supplied contact detail; SQLite serializes writers already, so the
        lock is a no-op there. Keys are taken in a stable order to avoid
        deadlocking two requests that share one of the two details.
        """
        if connection.vendor != 'postgresql':
            return
        keys = sorted(
            key for key in (f'email:{email}' if email else '', f'phone:{phone}' if phone else '') if key
        )
        with connection.cursor() as cursor:
            for key in keys:
                cursor.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))', [key])

    @staticmethod
    def create_lead(data):
        lead = Lead.objects.create(**data)
        lead = Lead.objects.select_related('assigned_to', 'created_by').get(pk=lead.pk)
        return LeadSerializer(lead).data

    @staticmethod
    def update_lead(lead_id, changes):
        lead = Lead.objects.select_related('assigned_to', 'created_by').filter(id=lead_id).first()
        if not lead:
            return None
        for field, value in changes.items():
            setattr(lead, field, value)
        lead.save(update_fields=[*changes.keys(), 'updated_at'])
        lead.refresh_from_db()
        lead = Lead.objects.select_related('assigned_to', 'created_by').get(pk=lead.pk)
        return LeadSerializer(lead).data

    @staticmethod
    def list_notes(lead_id):
        notes = LeadNote.objects.select_related('author').filter(lead_id=lead_id)
        return LeadNoteSerializer(notes, many=True).data

    @staticmethod
    def add_note(lead_id, author_id, body):
        note = LeadNote.objects.create(lead_id=lead_id, author_id=author_id, body=body)
        note = LeadNote.objects.select_related('author').get(pk=note.pk)
        return LeadNoteSerializer(note).data

    @staticmethod
    def add_activity(lead_id, actor_id, action, field_name='', old_value='', new_value=''):
        activity = LeadActivity.objects.create(
            lead_id=lead_id,
            actor_id=actor_id,
            action=action,
            field_name=field_name,
            old_value=(old_value or '')[:500],
            new_value=(new_value or '')[:500],
        )
        activity = LeadActivity.objects.select_related('actor').get(pk=activity.pk)
        return LeadActivitySerializer(activity).data

    @staticmethod
    def list_activity(lead_id, page, page_size):
        queryset = LeadActivity.objects.select_related('actor').filter(lead_id=lead_id)
        return _paginate(queryset, page, page_size, LeadActivitySerializer)

    @staticmethod
    def active_employee(customer_id):
        customer = Customer.objects.filter(
            id=customer_id,
            is_active=True,
            role__in=(Customer.Role.STAFF, Customer.Role.ADMIN),
        ).first()
        return LeadPersonSerializer(customer).data if customer else None

    @staticmethod
    def due_follow_up_ids(now):
        return list(
            Lead.objects.filter(
                follow_up_at__isnull=False,
                follow_up_at__lte=now,
                assigned_to__isnull=False,
                status__in=OPEN_LEAD_STATUSES,
            ).exclude(
                follow_up_notified_at=F('follow_up_at'),
            ).values_list('id', 'assigned_to_id')
        )

    @staticmethod
    def claim_due_follow_up(lead_id, assignee_id, now):
        updated = Lead.objects.filter(
            id=lead_id,
            assigned_to_id=assignee_id,
            follow_up_at__isnull=False,
            follow_up_at__lte=now,
            status__in=OPEN_LEAD_STATUSES,
        ).exclude(
            follow_up_notified_at=F('follow_up_at'),
        ).update(follow_up_notified_at=F('follow_up_at'))
        return updated == 1

    @staticmethod
    def list_active_employees():
        queryset = Customer.objects.filter(
            is_active=True,
            role__in=(Customer.Role.STAFF, Customer.Role.ADMIN),
        ).order_by('name', 'email')
        return LeadPersonSerializer(queryset, many=True).data
