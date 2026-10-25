"""Stable lead and security-group codes for the manual LMS."""

SALES_GROUP_CODE = 'sales'
SALES_GROUP_NAME = 'Sales'

LEADS_ACCESS = 'leads.access'
LEADS_VIEW_OWN = 'leads.view_own'
LEADS_VIEW_ALL = 'leads.view_all'
LEADS_CREATE = 'leads.create'
LEADS_UPDATE_STATUS = 'leads.update_status'
LEADS_ADD_NOTE = 'leads.add_note'
LEADS_MANAGE_FOLLOW_UP = 'leads.manage_follow_up'
LEADS_ASSIGN = 'leads.assign'
LEADS_VIEW_ACTIVITY = 'leads.view_activity'
STAFF_MANAGE_GROUPS = 'staff.manage_groups'

PERMISSION_CATALOGUE = (
    (LEADS_ACCESS, 'Open the lead desk'),
    (LEADS_VIEW_OWN, 'View leads they created or that are assigned to them'),
    (LEADS_VIEW_ALL, 'View every lead'),
    (LEADS_CREATE, 'Create leads'),
    (LEADS_UPDATE_STATUS, 'Update lead status and contact details'),
    (LEADS_ADD_NOTE, 'Add notes to visible leads'),
    (LEADS_MANAGE_FOLLOW_UP, 'Set follow-up times on visible leads'),
    (LEADS_ASSIGN, 'Assign visible leads to other staff'),
    (LEADS_VIEW_ACTIVITY, 'View activity for visible leads'),
    (STAFF_MANAGE_GROUPS, 'Manage security groups and memberships'),
)

PERMISSION_CODES = tuple(code for code, _label in PERMISSION_CATALOGUE)

SALES_PERMISSIONS = (
    LEADS_ACCESS,
    LEADS_VIEW_OWN,
    LEADS_CREATE,
    LEADS_UPDATE_STATUS,
    LEADS_ADD_NOTE,
    LEADS_MANAGE_FOLLOW_UP,
    LEADS_VIEW_ACTIVITY,
)

LEAD_SOURCE_MANUAL = 'manual'
LEAD_SOURCE_WEBSITE = 'website'
LEAD_SOURCE_GOOGLE_ADS = 'google_ads'
LEAD_SOURCES = (
    (LEAD_SOURCE_MANUAL, 'Manual'),
    (LEAD_SOURCE_WEBSITE, 'Website'),
    (LEAD_SOURCE_GOOGLE_ADS, 'Google Ads'),
)
LEAD_SOURCE_ORDER = tuple(code for code, _label in LEAD_SOURCES)

TOUCHPOINT_CONTACT = 'contact_us'
TOUCHPOINT_PRODUCT = 'product_enquiry'
TOUCHPOINT_CUSTOM = 'custom_moorti'
TOUCHPOINT_LEAD_FORM = 'lead_form'
TOUCHPOINT_LOGIN = 'login'
LEAD_TOUCHPOINTS = (
    (TOUCHPOINT_CONTACT, 'Contact us'),
    (TOUCHPOINT_PRODUCT, 'Product enquiry'),
    (TOUCHPOINT_CUSTOM, 'Custom moorti'),
    (TOUCHPOINT_LEAD_FORM, 'Lead form'),
    (TOUCHPOINT_LOGIN, 'Login'),
)
LEAD_TOUCHPOINT_ORDER = tuple(code for code, _label in LEAD_TOUCHPOINTS)
CONTACT_TOUCHPOINTS = (TOUCHPOINT_CONTACT, TOUCHPOINT_PRODUCT)
# Touchpoints a website visitor is allowed to claim. lead_form belongs to a
# provider webhook, so a website payload must never be accepted as one.
WEBSITE_TOUCHPOINTS = (TOUCHPOINT_CONTACT, TOUCHPOINT_PRODUCT, TOUCHPOINT_CUSTOM)

LEAD_STATUS_NEW = 'new'
LEAD_STATUS_CONTACTED = 'contacted'
LEAD_STATUS_QUALIFIED = 'qualified'
LEAD_STATUS_QUOTED = 'quoted'
LEAD_STATUS_WON = 'won'
LEAD_STATUS_LOST = 'lost'

LEAD_STATUSES = (
    (LEAD_STATUS_NEW, 'New'),
    (LEAD_STATUS_CONTACTED, 'Contacted'),
    (LEAD_STATUS_QUALIFIED, 'Qualified'),
    (LEAD_STATUS_QUOTED, 'Quoted'),
    (LEAD_STATUS_WON, 'Won'),
    (LEAD_STATUS_LOST, 'Lost'),
)
LEAD_STATUS_ORDER = tuple(code for code, _label in LEAD_STATUSES)
OPEN_LEAD_STATUSES = (
    LEAD_STATUS_NEW,
    LEAD_STATUS_CONTACTED,
    LEAD_STATUS_QUALIFIED,
    LEAD_STATUS_QUOTED,
)
TERMINAL_LEAD_STATUSES = (LEAD_STATUS_WON, LEAD_STATUS_LOST)

# Staff may move forward or mark an open lead lost or won.
# Terminal leads stay closed unless an administrator reopens them to new.
LEAD_TRANSITIONS = {
    LEAD_STATUS_NEW: {
        LEAD_STATUS_CONTACTED,
        LEAD_STATUS_QUALIFIED,
        LEAD_STATUS_QUOTED,
        LEAD_STATUS_WON,
        LEAD_STATUS_LOST,
    },
    LEAD_STATUS_CONTACTED: {
        LEAD_STATUS_QUALIFIED,
        LEAD_STATUS_QUOTED,
        LEAD_STATUS_WON,
        LEAD_STATUS_LOST,
    },
    LEAD_STATUS_QUALIFIED: {
        LEAD_STATUS_QUOTED,
        LEAD_STATUS_WON,
        LEAD_STATUS_LOST,
    },
    LEAD_STATUS_QUOTED: {
        LEAD_STATUS_WON,
        LEAD_STATUS_LOST,
    },
    LEAD_STATUS_WON: set(),
    LEAD_STATUS_LOST: set(),
}

ADMIN_REOPEN_STATUS = LEAD_STATUS_NEW

ACTIVITY_CREATED = 'created'
ACTIVITY_ASSIGNED = 'assigned'
ACTIVITY_REASSIGNED = 'reassigned'
ACTIVITY_UNASSIGNED = 'unassigned'
ACTIVITY_STATUS_CHANGED = 'status_changed'
ACTIVITY_REOPENED = 'reopened'
ACTIVITY_NOTE_ADDED = 'note_added'
ACTIVITY_FOLLOW_UP_CHANGED = 'follow_up_changed'
# Recorded on a newly created lead when matching open leads existed but their
# contact details were too ambiguous to reuse one safely.
ACTIVITY_IDENTITY_CONFLICT = 'identity_conflict'
# No longer written. Kept so historical rows created before active-lead reuse
# still have a documented action code.
ACTIVITY_POSSIBLE_DUPLICATE = 'possible_duplicate'

# An enquiry, login or provider event that reuses an active lead appends one
# note. Bodies are capped so one long submission cannot dominate the lead desk.
NOTE_BODY_LIMIT = 2000
# More than this many active leads for one email or phone is treated as
# ambiguous identity rather than a person with many open enquiries.
IDENTITY_MATCH_LIMIT = 20
# Login suppression window. A lead created exactly this many days ago still
# counts as recent, so the comparison is inclusive.
LOGIN_RECENT_LEAD_DAYS = 30

# Authentication events that establish a customer's session. Each reads as
# "Customer <event>." in the note appended to an active lead.
SESSION_EVENT_LOGIN = 'signed in'
SESSION_EVENT_SIGNUP = 'completed signup'
SESSION_EVENT_VERIFICATION = 'verified their email address'

NOTIFICATION_ASSIGNED = 'assigned'
NOTIFICATION_FOLLOW_UP_DUE = 'follow_up_due'

NOT_FOUND = 'Lead not found.'
NOTIFICATION_NOT_FOUND = 'Notification not found.'
GROUP_NOT_FOUND = 'Security group not found.'
MEMBERSHIP_NOT_FOUND = 'Group membership not found.'
PERMISSION_DENIED = 'You do not have permission to perform this action.'
DUPLICATE_CONFIRMATION = 'confirm_duplicate'
ASSIGNEE_REJECTED = 'Leads can only be assigned to active staff or administrators.'
MEMBER_REJECTED = 'Only active staff or administrators can belong to a security group.'
