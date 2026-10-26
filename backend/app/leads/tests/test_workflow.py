from datetime import timedelta

from django.utils import timezone

from app.leads.constants import (
    ACTIVITY_ASSIGNED,
    ACTIVITY_CREATED,
    ACTIVITY_NOTE_ADDED,
    ACTIVITY_REOPENED,
    ACTIVITY_STATUS_CHANGED,
)
from app.leads.models import Lead, LeadActivity, LeadNote, LeadNotification
from app.leads.tests.helpers import LeadApiTestCase, create_account


class LeadWorkflowTests(LeadApiTestCase):
    def test_staff_create_assigns_the_creator_and_records_activity(self):
        staff = create_account('creator@example.com', name='Creator Staff')
        response = self.create_lead(staff)
        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()['data']
        self.assertEqual(body['status'], 'new')
        self.assertEqual(body['source'], 'manual')
        self.assertEqual(body['assigned_to']['id'], staff.id)
        self.assertEqual(body['created_by']['id'], staff.id)
        self.assertEqual(body['phone'], '+919845011111')
        self.assertNotIn('id', body)
        lead = Lead.objects.get(uid=body['uid'])
        actions = list(lead.activities.order_by('id').values_list('action', flat=True))
        self.assertIn(ACTIVITY_CREATED, actions)
        self.assertIn(ACTIVITY_ASSIGNED, actions)
        self.assertTrue(LeadNotification.objects.filter(recipient=staff, lead=lead, kind='assigned').exists())

    def test_admin_can_assign_an_active_staff_member(self):
        admin = create_account('desk-admin@example.com', role='admin', sales=False, name='Desk Admin')
        staff = create_account('desk-staff@example.com', name='Desk Staff')
        created = self.create_lead(admin, email='desk@example.com', phone='9845055555')
        self.assertIsNone(created.json()['data']['assigned_to'])
        uid = created.json()['data']['uid']
        response = self.client.post(
            f'/api/admin/leads/{uid}/assignment',
            {'assigned_to': staff.id},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['data']['assigned_to']['id'], staff.id)
        self.assertTrue(LeadNotification.objects.filter(recipient=staff, kind='assigned').exists())
        self.assertTrue(LeadActivity.objects.filter(lead__uid=uid, action='assigned').exists())

    def test_invalid_assignment_is_rejected(self):
        admin = create_account('invalid-admin@example.com', role='admin', sales=False)
        inactive = create_account('inactive-assignee@example.com', active=False, sales=False)
        created = self.create_lead(admin, email='invalid-assign@example.com', phone='9845066666')
        uid = created.json()['data']['uid']
        response = self.client.post(
            f'/api/admin/leads/{uid}/assignment',
            {'assigned_to': inactive.id},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIsNone(Lead.objects.get(uid=uid).assigned_to_id)

    def test_status_transitions_loss_reason_and_admin_reopen(self):
        admin = create_account('status-admin@example.com', role='admin', sales=False, name='Status Admin')
        staff = create_account('status-staff@example.com', name='Status Staff')
        created = self.create_lead(staff, email='status@example.com', phone='9845077777')
        uid = created.json()['data']['uid']

        missing_reason = self.client.patch(f'/api/admin/leads/{uid}', {'status': 'lost'}, format='json')
        self.assertEqual(missing_reason.status_code, 400)
        self.assertIn('reason', missing_reason.json()['message'].lower())

        lost = self.client.patch(
            f'/api/admin/leads/{uid}',
            {'status': 'lost', 'lost_reason': 'Budget'},
            format='json',
        )
        self.assertEqual(lost.status_code, 200, lost.content)
        self.assertEqual(lost.json()['data']['status'], 'lost')
        self.assertEqual(lost.json()['data']['allowed_statuses'], ['lost'])

        reopen_denied = self.client.patch(f'/api/admin/leads/{uid}', {'status': 'new'}, format='json')
        self.assertEqual(reopen_denied.status_code, 400)
        self.assertEqual(Lead.objects.get(uid=uid).status, 'lost')

        backward = self.client.patch(f'/api/admin/leads/{uid}', {'status': 'quoted'}, format='json')
        self.assertEqual(backward.status_code, 400)

        self.as_user(admin)
        reopened = self.client.patch(f'/api/admin/leads/{uid}', {'status': 'new'}, format='json')
        self.assertEqual(reopened.status_code, 200, reopened.content)
        self.assertEqual(reopened.json()['data']['status'], 'new')
        self.assertEqual(reopened.json()['data']['lost_reason'], '')
        self.assertTrue(LeadActivity.objects.filter(lead__uid=uid, action=ACTIVITY_REOPENED).exists())
        self.assertTrue(LeadActivity.objects.filter(lead__uid=uid, action=ACTIVITY_STATUS_CHANGED, new_value='lost').exists())

    def test_notes_follow_up_and_activity_are_saved_together(self):
        staff = create_account('notes@example.com', name='Notes Staff')
        created = self.create_lead(staff, email='notes-lead@example.com', phone='9845088888')
        uid = created.json()['data']['uid']
        follow_up = (timezone.now() + timedelta(days=2)).replace(microsecond=0)
        updated = self.client.patch(
            f'/api/admin/leads/{uid}',
            {'follow_up_at': follow_up.isoformat(), 'status': 'contacted'},
            format='json',
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        note = self.client.post(
            f'/api/admin/leads/{uid}/notes',
            {'body': 'Called the family and shared stone options.'},
            format='json',
        )
        self.assertEqual(note.status_code, 201, note.content)
        activity = self.client.get(f'/api/admin/leads/{uid}/activity')
        actions = {item['action'] for item in activity.json()['data']['items']}
        self.assertIn(ACTIVITY_NOTE_ADDED, actions)
        self.assertIn('follow_up_changed', actions)
        self.assertIn(ACTIVITY_STATUS_CHANGED, actions)
        self.assertEqual(LeadNote.objects.filter(lead__uid=uid).count(), 1)
        lead = Lead.objects.get(uid=uid)
        self.assertEqual(lead.summary, 'Custom granite murti for a home shrine')
        self.assertIsNotNone(lead.follow_up_at)
        self.assertIsNone(lead.follow_up_notified_at)

    def test_duplicate_warning_does_not_create_until_confirmed(self):
        staff = create_account('dup@example.com', name='Dup Staff')
        first = self.create_lead(staff, email='dup@example.com', phone='9845099999')
        self.assertEqual(first.status_code, 201, first.content)
        warning = self.create_lead(staff, name='Second Meera', email='dup@example.com', phone='9000000000')
        self.assertEqual(warning.status_code, 409)
        self.assertEqual(warning.json()['data']['code'], 'duplicate_warning')
        self.assertEqual(warning.json()['data']['matches'][0]['uid'], first.json()['data']['uid'])
        self.assertEqual(Lead.objects.count(), 1)

        confirmed = self.create_lead(
            staff,
            name='Second Meera',
            email='dup@example.com',
            phone='9000000000',
            confirm_duplicate=True,
        )
        self.assertEqual(confirmed.status_code, 201, confirmed.content)
        self.assertEqual(Lead.objects.count(), 2)

    def test_hidden_duplicate_does_not_reveal_the_other_lead(self):
        owner = create_account('private-owner@example.com', name='Private Owner')
        other = create_account('private-other@example.com', name='Private Other')
        created = self.create_lead(owner, email='private@example.com', phone='9845000001', name='Private Buyer')
        uid = created.json()['data']['uid']
        warning = self.create_lead(other, email='private@example.com', phone='9845000002', name='Another Buyer')
        self.assertEqual(warning.status_code, 409)
        payload = warning.json()['data']
        self.assertEqual(payload['matches'], [])
        self.assertGreaterEqual(payload['hidden_match_count'], 1)
        self.assertNotIn(uid, warning.content.decode())
        self.assertNotIn('Private Buyer', warning.content.decode())
        self.assertEqual(Lead.objects.count(), 1)

    def test_notification_read_is_limited_to_the_recipient(self):
        staff = create_account('inbox@example.com', name='Inbox Staff')
        other = create_account('other-inbox@example.com', name='Other Inbox')
        created = self.create_lead(staff, email='inbox-lead@example.com', phone='9845000003')
        notification = LeadNotification.objects.get(recipient=staff)
        self.as_user(other)
        denied = self.client.post(f'/api/admin/notifications/{notification.id}/read', {}, format='json')
        self.assertEqual(denied.status_code, 404)
        notification.refresh_from_db()
        self.assertIsNone(notification.read_at)

        self.as_user(staff)
        listing = self.client.get('/api/admin/notifications')
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.json()['data']['items'][0]['lead_uid'], created.json()['data']['uid'])
        self.assertNotIn('inbox-lead@example.com', listing.content.decode())
        marked = self.client.post(f'/api/admin/notifications/{notification.id}/read', {}, format='json')
        self.assertEqual(marked.status_code, 200, marked.content)
        notification.refresh_from_db()
        self.assertIsNotNone(notification.read_at)
