import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from app.accounts.models import Employee
from app.leads.constants import (
    ACTIVITY_ASSIGNED,
    ACTIVITY_CREATED,
    ACTIVITY_FOLLOW_UP_CHANGED,
    ACTIVITY_IDENTITY_CONFLICT,
    ACTIVITY_NOTE_ADDED,
    ACTIVITY_REASSIGNED,
    ACTIVITY_REOPENED,
    ACTIVITY_STATUS_CHANGED,
    ACTIVITY_UNASSIGNED,
    ADMIN_REOPEN_STATUS,
    ASSIGNEE_REJECTED,
    DUPLICATE_CONFIRMATION,
    IDENTITY_MATCH_LIMIT,
    LOGIN_RECENT_LEAD_DAYS,
    LEAD_SOURCE_GOOGLE_ADS,
    LEAD_SOURCE_MANUAL,
    LEAD_SOURCE_WEBSITE,
    LEAD_STATUS_LOST,
    LEAD_STATUS_NEW,
    LEAD_STATUS_ORDER,
    NOTE_BODY_LIMIT,
    TOUCHPOINT_CONTACT,
    TOUCHPOINT_CUSTOM,
    TOUCHPOINT_LEAD_FORM,
    TOUCHPOINT_LOGIN,
    TOUCHPOINT_PRODUCT,
    WEBSITE_TOUCHPOINTS,
    LEAD_TRANSITIONS,
    LEADS_ACCESS,
    LEADS_ADD_NOTE,
    LEADS_CREATE,
    LEADS_MANAGE_FOLLOW_UP,
    LEADS_UPDATE_STATUS,
    LEADS_VIEW_ACTIVITY,
    NOTIFICATION_ASSIGNED,
    NOT_FOUND,
    PERMISSION_DENIED,
    TERMINAL_LEAD_STATUSES,
)
from app.leads.normalization import normalize_email, normalize_phone
from app.leads.repositories.lead_repository import LeadRepository
from app.leads.repositories.notification_repository import NotificationRepository
from app.leads.services.access_service import AccessService

logger = logging.getLogger(__name__)


# Fields the lead desk already reads. A reused lead can have several provider
# events; this object stays the newest one so the existing response shape holds.
_GOOGLE_ADS_PUBLIC_FIELDS = (
    'form_id',
    'campaign_id',
    'adgroup_id',
    'creative_id',
    'asset_group_id',
    'gcl_id',
    'lead_stage',
    'form_origin',
    'submitted_at',
)


def _google_ads_attribution(lead_id):
    from app.integrations.google_ads.repository import GoogleAdsIngestionRepository
    events = GoogleAdsIngestionRepository.forms_for_lead(lead_id)
    if not events:
        return None, []
    latest = {field: events[0][field] for field in _GOOGLE_ADS_PUBLIC_FIELDS}
    return latest, events


def _moment(value):
    if not value:
        return None
    if isinstance(value, str):
        return parse_datetime(value.replace('Z', '+00:00'))
    return value


def _same_moment(left, right):
    return _moment(left) == _moment(right)


def _person_label(person):
    if not person:
        return 'Unassigned'
    return (person.get('name') or 'Staff member')[:200]


def _allowed_targets(status, actor):
    targets = set(LEAD_TRANSITIONS.get(status, set()))
    if actor.get('role') == Employee.Role.ADMIN and status in TERMINAL_LEAD_STATUSES:
        targets.add(ADMIN_REOPEN_STATUS)
    return targets


def _status_options(status, actor):
    targets = _allowed_targets(status, actor)
    return [status, *[item for item in LEAD_STATUS_ORDER if item in targets and item != status]]


def _visible_match(match, scope):
    if scope and scope.get('unrestricted'):
        return True
    if not scope:
        return False
    actor_id = scope['actor_id']
    return match.get('created_by_employee_id') == actor_id or match['assigned_to_id'] == actor_id


def _duplicate_payload(matches, scope):
    visible = []
    hidden = 0
    for match in matches:
        if _visible_match(match, scope):
            visible.append({
                'uid': match['uid'],
                'name': match['name'],
                'status': match['status'],
                'city': match['city'],
                'source': match['source'],
            })
        else:
            hidden += 1
    return {
        'code': 'duplicate_warning',
        'requires_confirmation': True,
        'matches': visible,
        'hidden_match_count': hidden,
    }


def _public_lead(data, actor, include_notes=False):
    lead_id = data.pop('id', None)
    data['allowed_statuses'] = _status_options(data['status'], actor)
    if include_notes:
        data['notes'] = LeadRepository.list_notes(lead_id)
    return data


def _enquiry_note(touchpoint, summary):
    """One sentence of context for the sales desk, without contact details."""
    opening = {
        TOUCHPOINT_CONTACT: 'Contact us enquiry received.',
        TOUCHPOINT_PRODUCT: 'Product enquiry received.',
        TOUCHPOINT_CUSTOM: 'Custom moorti enquiry received.',
    }.get(touchpoint, 'Website enquiry received.')
    summary = (summary or '').strip()
    return f'{opening} {summary}'.strip() if summary else opening


def resolve_active_lead(email, phone):
    """Find the one active lead that unambiguously belongs to this person.

    Returns (lead, conflict_uids). An empty uid list means there is no
    conflict. A non-empty list means the open leads could describe more than
    one person, so the caller must not mutate any of them. The uids are the
    leads that were left unchanged. They contain no email or phone.

    A later distinct enquiry still opens its own lead while those candidates
    disagree. A lead that carries both the email and the phone can become the
    unambiguous match for a later event with that same pair. Two open leads
    that share an email but have different phones stay in conflict, and each
    new distinct submission adds another separate lead.
    """
    matches = LeadRepository.active_identity_matches(email, phone, IDENTITY_MATCH_LIMIT + 1)
    if not matches:
        return None, []
    if len(matches) > IDENTITY_MATCH_LIMIT:
        return None, [match['uid'] for match in matches]

    emails = {match['email'].strip().lower() for match in matches if match['email']}
    phones = {match['phone'] for match in matches if match['phone']}
    if email:
        emails.add(email)
    if phone:
        phones.add(phone)
    # Two different emails or two different phones across the candidates means
    # one contact detail is shared by people who are not the same person.
    if len(emails) > 1 or len(phones) > 1:
        return None, [match['uid'] for match in matches]

    if email and phone:
        by_email = {match['id'] for match in matches if match['email'].strip().lower() == email}
        by_phone = {match['id'] for match in matches if match['phone'] == phone}
        # The email points at one lead and the phone at a different one, with
        # nothing tying the two records together.
        if by_email and by_phone and not by_email & by_phone:
            return None, [match['uid'] for match in matches]

    return matches[0], []


def _conflict_reference(uids):
    """Staff-facing activity text. It names lead uids and no contact details."""
    shown = []
    for uid in uids:
        if uid and uid not in shown:
            shown.append(uid)
        if len(shown) == 8:
            break
    text = 'ambiguous contact details'
    if shown:
        text = f'{text}; unchanged_lead_uids={",".join(shown)}'
    remaining = len([uid for uid in uids if uid]) - len(shown)
    if remaining > 0:
        text = f'{text}; +{remaining} more'
    return text[:500]


def append_event_note(lead_id, body, touchpoint):
    """Record one append-only note plus its activity entry on an existing lead.

    Nothing else on the lead changes: status, assignment, source and the
    original summary all stay as the sales desk left them.
    """
    note = LeadRepository.add_note(lead_id, None, body[:NOTE_BODY_LIMIT])
    LeadRepository.add_activity(
        lead_id,
        None,
        ACTIVITY_NOTE_ADDED,
        field_name='note',
        new_value=touchpoint,
    )
    return note


class LeadService:
    @staticmethod
    def access(actor):
        if actor.get('role') not in {Employee.Role.STAFF, Employee.Role.ADMIN} or not actor.get('is_active'):
            return PERMISSION_DENIED, None
        return None, AccessService.describe(actor)

    @staticmethod
    def list_assignees(actor):
        error = AccessService.require(actor, LEADS_ACCESS)
        if error:
            return error, None
        if not AccessService.can_assign_others(actor):
            return PERMISSION_DENIED, None
        return None, {'items': LeadRepository.list_active_employees()}

    @staticmethod
    def list_leads(actor, params):
        error = AccessService.require(actor, LEADS_ACCESS)
        if error:
            return error, None
        scope = AccessService.visibility_scope(actor)
        if scope is None:
            return PERMISSION_DENIED, None
        payload = LeadRepository.list_leads(params, scope)
        payload['items'] = [_public_lead(item, actor) for item in payload['items']]
        return None, payload

    @staticmethod
    def get_lead(actor, uid):
        error = AccessService.require(actor, LEADS_ACCESS)
        if error:
            return error, None
        scope = AccessService.visibility_scope(actor)
        if scope is None:
            return NOT_FOUND, None
        lead = LeadRepository.get_lead(uid, scope)
        if not lead:
            return NOT_FOUND, None
        lead_id = lead['id']
        public_lead = _public_lead(lead, actor, include_notes=True)
        google_ads, google_ads_events = _google_ads_attribution(lead_id)
        if google_ads:
            public_lead['google_ads'] = google_ads
            public_lead['google_ads_events'] = google_ads_events
        return None, public_lead

    @staticmethod
    def create_lead(actor, data):
        """Create a manual lead.

        Phone and email matches against open leads are warnings until the caller
        sends confirm_duplicate. Two requests that pass the check together can
        both create leads: phone and email are not unique, because a confirmed
        duplicate is a legitimate second enquiry.
        """
        error = AccessService.require(actor, LEADS_ACCESS)
        if error:
            return error, None
        error = AccessService.require(actor, LEADS_CREATE)
        if error:
            return error, None
        scope = AccessService.visibility_scope(actor)
        assignee_id, assignee_error = _assignee_for_create(actor, data.get('assigned_to'))
        if assignee_error:
            return assignee_error, None

        with transaction.atomic():
            matches = LeadRepository.open_matches(data.get('email') or '', data.get('phone') or '')
            if matches and not data.get('confirm_duplicate'):
                return DUPLICATE_CONFIRMATION, _duplicate_payload(matches, scope)
            lead = LeadRepository.create_lead({
                'name': data['name'],
                'email': data.get('email') or '',
                'phone': data.get('phone') or '',
                'city': data.get('city') or '',
                'summary': data['summary'],
            'source': LEAD_SOURCE_MANUAL,
            'touchpoint': '',
            'external_id': None,
                'status': LEAD_STATUS_NEW,
                'assigned_to_id': assignee_id,
                'user_id': None,
                'created_by_id': None,
                'created_by_employee_id': actor['id'],
                'follow_up_at': data.get('follow_up_at'),
                'lost_reason': '',
            })
            lead_id = lead['id']
            LeadRepository.add_activity(
                lead_id,
                actor['id'],
                ACTIVITY_CREATED,
                field_name='status',
                new_value=LEAD_STATUS_NEW,
            )
            if assignee_id:
                LeadRepository.add_activity(
                    lead_id,
                    actor['id'],
                    ACTIVITY_ASSIGNED,
                    field_name='assigned_to',
                    new_value=_person_label(lead.get('assigned_to')),
                )
                NotificationRepository.create_notification(
                    recipient_id=assignee_id,
                    lead_id=lead_id,
                    kind=NOTIFICATION_ASSIGNED,
                    title='Lead assigned',
                    message='A lead was assigned to you.',
                )
            if data.get('follow_up_at'):
                LeadRepository.add_activity(
                    lead_id,
                    actor['id'],
                    ACTIVITY_FOLLOW_UP_CHANGED,
                    field_name='follow_up_at',
                    new_value=data['follow_up_at'].isoformat(),
                )
        return None, _public_lead(lead, actor, include_notes=True)

    @staticmethod
    def record_website_enquiry(data, created_by_id=None, account_email=''):
        """Attach a website enquiry to this person's active lead, or create one.

        The caller owns the transaction and keeps its own enquiry record, which
        points at whichever lead this returns. An active lead is reused and
        receives a note, however old it is; the 30-day login suppression window
        does not apply here, so a person whose only lead is won or lost gets a
        new one. Ambiguous contact details create a separate lead rather than
        writing into a lead that may belong to someone else. Repeated calls are
        not idempotent by themselves; the enquiry record's submission key is.

        account_email is the signed-in customer's own address where the flow has
        one. It is the most reliable identifier available, so it fills in a
        submission that left the email blank and is recorded on a new lead to
        keep later matching consistent.

        When the contact details conflict, this creates a separate lead and
        records the uids of the leads it refused to change. Repeating a new
        submission while those leads still disagree creates another separate
        lead. It does not merge them and it does not copy their email or phone
        into the activity row.
        """
        email = data.get('email') or ''
        phone = data.get('phone') or ''
        if not email and not phone:
            return 'Provide an email address or phone number.', None
        if data.get('source') != LEAD_SOURCE_WEBSITE:
            return 'Unsupported lead source.', None
        touchpoint = data.get('touchpoint')
        if touchpoint not in WEBSITE_TOUCHPOINTS:
            return 'Unsupported lead touchpoint.', None

        account_mismatch = bool(account_email) and bool(email) and account_email != email
        if account_email and not email:
            email = account_email

        LeadRepository.lock_identity(email, phone)
        active, conflict_uids = resolve_active_lead(email, phone)
        if account_mismatch:
            # The signed-in account and the typed address disagree, so neither
            # one proves which person this enquiry belongs to.
            if active and active['uid'] not in conflict_uids:
                conflict_uids = [active['uid'], *conflict_uids]
            active = None
        if active:
            append_event_note(
                active['id'],
                _enquiry_note(touchpoint, data.get('summary')),
                touchpoint,
            )
            return None, {'id': active['id'], 'uid': active['uid'], 'reused': True}
        if conflict_uids or account_mismatch:
            logger.warning(
                'website enquiry outcome=identity_conflict touchpoint=%s has_email=%s has_phone=%s',
                touchpoint,
                bool(email),
                bool(phone),
            )

        lead = LeadRepository.create_lead({
            'name': data['name'],
            'email': email,
            'phone': phone,
            'city': data.get('city') or '',
            'summary': data['summary'],
            'source': LEAD_SOURCE_WEBSITE,
            'touchpoint': touchpoint,
            'utm_source': data.get('utm_source') or '',
            'utm_medium': data.get('utm_medium') or '',
            'utm_campaign': data.get('utm_campaign') or '',
            'utm_term': data.get('utm_term') or '',
            'utm_content': data.get('utm_content') or '',
            'landing_path': data.get('landing_path') or '',
            'external_id': None,
            'status': LEAD_STATUS_NEW,
            'assigned_to_id': None,
            'user_id': created_by_id,
            'created_by_id': created_by_id,
            'created_by_employee_id': None,
            'lost_reason': '',
        })
        LeadRepository.add_activity(
            lead['id'],
            None,
            ACTIVITY_CREATED,
            field_name='touchpoint',
            new_value=touchpoint,
        )
        if conflict_uids or account_mismatch:
            LeadRepository.add_activity(
                lead['id'],
                None,
                ACTIVITY_IDENTITY_CONFLICT,
                field_name='open_leads',
                new_value=_conflict_reference(conflict_uids),
            )
        return None, {'id': lead['id'], 'uid': str(lead['uid']), 'reused': False}

    @staticmethod
    def record_customer_session(customer, event):
        """Apply the organic lead rule for one successful customer session.

        The order is deliberate. An active lead is reused and noted however old
        it is. Otherwise any lead created inside the suppression window, in any
        status including won and lost, stops a second lead from appearing and
        leaves that lead completely untouched. Only a customer with neither
        gets a new login lead.

        This owns its own transaction because the caller is an authentication
        flow whose success must not depend on lead bookkeeping.
        """
        if customer.get('role') in {Employee.Role.STAFF, Employee.Role.ADMIN}:
            return None, {'outcome': 'skipped_not_a_customer'}
        email = normalize_email(customer.get('email'))
        phone = normalize_phone(customer.get('phone'))
        if not email and not phone:
            return None, {'outcome': 'skipped_no_contact_details'}

        with transaction.atomic():
            LeadRepository.lock_identity(email, phone)
            active, conflict_uids = resolve_active_lead(email, phone)
            if active:
                append_event_note(active['id'], f'Customer {event}.', TOUCHPOINT_LOGIN)
                return None, {'outcome': 'note_added', 'lead_uid': active['uid']}
            if conflict_uids:
                logger.warning(
                    'customer session lead outcome=identity_conflict customer_id=%s open_leads=%s',
                    customer.get('id'),
                    len(conflict_uids),
                )
                return None, {'outcome': 'skipped_identity_conflict'}
            window_start = timezone.now() - timedelta(days=LOGIN_RECENT_LEAD_DAYS)
            if LeadRepository.recent_lead_exists(email, phone, window_start):
                return None, {'outcome': 'skipped_recent_lead'}
            lead = LeadRepository.create_lead({
                'name': (customer.get('name') or email or phone)[:255],
                'email': email,
                'phone': phone,
                'city': '',
                'summary': f'Organic lead recorded when the customer {event}.',
                'source': LEAD_SOURCE_WEBSITE,
                'touchpoint': TOUCHPOINT_LOGIN,
                'external_id': None,
                'status': LEAD_STATUS_NEW,
                'assigned_to_id': None,
                'user_id': customer.get('id'),
                'created_by_id': customer.get('id'),
                'created_by_employee_id': None,
                'lost_reason': '',
            })
            LeadRepository.add_activity(
                lead['id'],
                None,
                ACTIVITY_CREATED,
                field_name='touchpoint',
                new_value=TOUCHPOINT_LOGIN,
            )
        return None, {'outcome': 'created', 'lead_uid': str(lead['uid'])}

    @staticmethod
    def create_provider_lead(data):
        """Attach one provider event to this person's active lead, or open one.

        The caller owns the transaction and records the event's attribution
        separately. The 30-day login window does not apply: a won or lost lead
        does not block a new provider lead. An active lead is reused and noted
        without changing its status, source, assignee or external id, so a
        second provider event can keep its own attribution row.         Conflicting
        contact details do not update either existing lead. Each new provider
        event that still cannot choose one person creates its own lead and
        points staff at the unchanged lead uids. The same provider event id
        stays idempotent and does not add another lead.
        """
        email = data.get('email') or ''
        phone = data.get('phone') or ''
        external_id = (data.get('external_id') or '').strip()
        if not email and not phone:
            return 'Provide an email address or phone number.', None
        if not external_id:
            return 'A provider lead id is required.', None
        if data.get('source') != LEAD_SOURCE_GOOGLE_ADS or data.get('touchpoint') != TOUCHPOINT_LEAD_FORM:
            return 'Unsupported provider attribution.', None

        summary = (data.get('summary') or 'Google Ads lead form submission.')[:5000]
        LeadRepository.lock_identity(email, phone)
        active, conflict_uids = resolve_active_lead(email, phone)
        if active:
            interest = '' if summary == 'Google Ads lead form submission.' else summary
            body = f'Google Ads lead form received ({external_id[:255]}).'
            append_event_note(active['id'], f'{body} {interest}'.strip(), TOUCHPOINT_LEAD_FORM)
            return None, {'id': active['id'], 'uid': active['uid'], 'reused': True}
        if conflict_uids:
            logger.warning(
                'provider lead outcome=identity_conflict has_email=%s has_phone=%s open_leads=%s',
                bool(email),
                bool(phone),
                len(conflict_uids),
            )

        lead = LeadRepository.create_lead({
            'name': data['name'][:255],
            'email': email,
            'phone': phone,
            'city': (data.get('city') or '')[:100],
            'summary': summary,
            'source': LEAD_SOURCE_GOOGLE_ADS,
            'touchpoint': TOUCHPOINT_LEAD_FORM,
            'external_id': external_id[:255],
            'status': LEAD_STATUS_NEW,
            'assigned_to_id': None,
            'user_id': None,
            'created_by_id': None,
            'created_by_employee_id': None,
            'lost_reason': '',
        })
        LeadRepository.add_activity(
            lead['id'],
            None,
            ACTIVITY_CREATED,
            field_name='source',
            new_value=LEAD_SOURCE_GOOGLE_ADS,
        )
        if conflict_uids:
            LeadRepository.add_activity(
                lead['id'],
                None,
                ACTIVITY_IDENTITY_CONFLICT,
                field_name='open_leads',
                new_value=_conflict_reference(conflict_uids),
            )
        return None, {'id': lead['id'], 'uid': str(lead['uid']), 'reused': False}

    @staticmethod
    def update_lead(actor, uid, data):
        error = AccessService.require(actor, LEADS_ACCESS)
        if error:
            return error, None
        scope = AccessService.visibility_scope(actor)
        if scope is None:
            return NOT_FOUND, None
        contact_fields = {'name', 'email', 'phone', 'city', 'summary'}
        if 'status' in data or contact_fields.intersection(data):
            error = AccessService.require(actor, LEADS_UPDATE_STATUS)
            if error:
                return error, None
        if 'follow_up_at' in data:
            error = AccessService.require(actor, LEADS_MANAGE_FOLLOW_UP)
            if error:
                return error, None

        with transaction.atomic():
            current = LeadRepository.get_lead(uid, scope)
            if not current:
                return NOT_FOUND, None
            lead_id = current['id']
            changes = {}
            activities = []

            for field in ('name', 'city', 'summary'):
                if field in data and data[field] != current.get(field):
                    changes[field] = data[field]
            if 'email' in data and (data.get('email') or '') != (current.get('email') or ''):
                if not (data.get('email') or current.get('phone') or data.get('phone')):
                    return 'Provide an email address or phone number.', None
                changes['email'] = data.get('email') or ''
            if 'phone' in data and (data.get('phone') or '') != (current.get('phone') or ''):
                resulting_email = changes.get('email', current.get('email') or '')
                if not (data.get('phone') or resulting_email):
                    return 'Provide an email address or phone number.', None
                changes['phone'] = data.get('phone') or ''

            if 'status' in data and data['status'] != current['status']:
                status_error = _validate_status_change(actor, current, data)
                if status_error:
                    return status_error, None
                changes['status'] = data['status']
                if data['status'] == LEAD_STATUS_LOST:
                    changes['lost_reason'] = data.get('lost_reason', '').strip()
                elif current['status'] == LEAD_STATUS_LOST or data['status'] != LEAD_STATUS_LOST:
                    if current.get('lost_reason'):
                        changes['lost_reason'] = ''
                action = ACTIVITY_REOPENED if (
                    current['status'] in TERMINAL_LEAD_STATUSES and data['status'] == ADMIN_REOPEN_STATUS
                ) else ACTIVITY_STATUS_CHANGED
                activities.append((action, 'status', current['status'], data['status']))
                if 'lost_reason' in changes and changes['lost_reason'] != (current.get('lost_reason') or ''):
                    activities.append((
                        ACTIVITY_STATUS_CHANGED,
                        'lost_reason',
                        current.get('lost_reason') or '',
                        changes['lost_reason'],
                    ))

            if 'follow_up_at' in data and not _same_moment(data.get('follow_up_at'), current.get('follow_up_at')):
                changes['follow_up_at'] = data.get('follow_up_at')
                changes['follow_up_notified_at'] = None
                activities.append((
                    ACTIVITY_FOLLOW_UP_CHANGED,
                    'follow_up_at',
                    current.get('follow_up_at') or '',
                    data['follow_up_at'].isoformat() if data.get('follow_up_at') else '',
                ))

            if not changes:
                return None, _public_lead(current, actor, include_notes=True)

            updated = LeadRepository.update_lead(lead_id, changes)
            for action, field_name, old_value, new_value in activities:
                LeadRepository.add_activity(
                    lead_id,
                    actor['id'],
                    action,
                    field_name=field_name,
                    old_value=str(old_value or ''),
                    new_value=str(new_value or ''),
                )
        return None, _public_lead(updated, actor, include_notes=True)

    @staticmethod
    def add_note(actor, uid, body):
        error = AccessService.require(actor, LEADS_ACCESS)
        if error:
            return error, None
        error = AccessService.require(actor, LEADS_ADD_NOTE)
        if error:
            return error, None
        scope = AccessService.visibility_scope(actor)
        if scope is None:
            return NOT_FOUND, None
        with transaction.atomic():
            lead_id = LeadRepository.get_lead_id(uid, scope)
            if not lead_id:
                return NOT_FOUND, None
            note = LeadRepository.add_note(lead_id, actor['id'], body)
            LeadRepository.add_activity(
                lead_id,
                actor['id'],
                ACTIVITY_NOTE_ADDED,
                field_name='note',
            )
        return None, note

    @staticmethod
    def assign(actor, uid, assigned_to):
        error = AccessService.require(actor, LEADS_ACCESS)
        if error:
            return error, None
        if not AccessService.can_assign_others(actor):
            return PERMISSION_DENIED, None
        scope = AccessService.visibility_scope(actor)
        if scope is None:
            return NOT_FOUND, None
        assignee = None
        if assigned_to is not None:
            assignee = LeadRepository.active_employee(assigned_to)
            if not assignee:
                return ASSIGNEE_REJECTED, None

        with transaction.atomic():
            current = LeadRepository.get_lead(uid, scope)
            if not current:
                return NOT_FOUND, None
            previous = current.get('assigned_to')
            previous_id = previous['id'] if previous else None
            next_id = assignee['id'] if assignee else None
            if previous_id == next_id:
                return None, _public_lead(current, actor, include_notes=True)
            updated = LeadRepository.update_lead(current['id'], {'assigned_to_id': next_id})
            if next_id is None:
                action = ACTIVITY_UNASSIGNED
            elif previous_id is None:
                action = ACTIVITY_ASSIGNED
            else:
                action = ACTIVITY_REASSIGNED
            LeadRepository.add_activity(
                current['id'],
                actor['id'],
                action,
                field_name='assigned_to',
                old_value=_person_label(previous),
                new_value=_person_label(assignee),
            )
            if next_id is not None:
                NotificationRepository.create_notification(
                    recipient_id=next_id,
                    lead_id=current['id'],
                    kind=NOTIFICATION_ASSIGNED,
                    title='Lead assigned',
                    message='A lead was assigned to you.',
                )
        return None, _public_lead(updated, actor, include_notes=True)

    @staticmethod
    def list_activity(actor, uid, params):
        error = AccessService.require(actor, LEADS_ACCESS)
        if error:
            return error, None
        error = AccessService.require(actor, LEADS_VIEW_ACTIVITY)
        if error:
            return error, None
        scope = AccessService.visibility_scope(actor)
        if scope is None:
            return NOT_FOUND, None
        lead_id = LeadRepository.get_lead_id(uid, scope)
        if not lead_id:
            return NOT_FOUND, None
        return None, LeadRepository.list_activity(lead_id, params['page'], params['page_size'])


def _assignee_for_create(actor, requested):
    if AccessService.can_assign_others(actor):
        if requested is None and actor.get('role') != Employee.Role.ADMIN:
            requested = actor['id']
        if requested is None:
            return None, None
        assignee = LeadRepository.active_employee(requested)
        if not assignee:
            return None, ASSIGNEE_REJECTED
        return assignee['id'], None

    if requested not in (None, actor['id']):
        return None, PERMISSION_DENIED
    if not LeadRepository.active_employee(actor['id']):
        return None, ASSIGNEE_REJECTED
    return actor['id'], None


def _validate_status_change(actor, current, data):
    target = data['status']
    if target not in _allowed_targets(current['status'], actor):
        return f"Cannot move a lead from {current['status']} to {target}."
    if target == LEAD_STATUS_LOST and not (data.get('lost_reason') or '').strip():
        return 'A loss reason is required.'
    return None
