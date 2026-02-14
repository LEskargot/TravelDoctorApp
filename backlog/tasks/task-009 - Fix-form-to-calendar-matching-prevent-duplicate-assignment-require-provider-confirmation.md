---
id: TASK-009
title: >-
  Fix form-to-calendar matching: prevent duplicate assignment + require provider
  confirmation
status: To Do
assignee: []
created_date: '2026-02-14 22:37'
updated_date: '2026-02-14 22:41'
labels:
  - bug
  - practitioner-app
  - pending-forms
  - backend
dependencies: []
references:
  - form-site/api/get-calendar-events.php (lines 239-314 — matching loop)
  - 'app/js/components/PendingForms.js (itemState, onClickItem)'
  - app/js/components/FormLinkModal.js
  - form-site/api/link-form-calendar.php
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
**Bug**: A submitted form gets matched to MULTIPLE calendar events simultaneously. Root cause: `get-calendar-events.php` builds `$matchedFormIds` array but never checks `in_array()` during matching — only used for `unlinked_forms`. So if two events share the same email/name, both get the same `form_id`.

**Tier priority issue**: Tier 1 (email) fires before Tier 3 (appointment date+time), so even when the form specifies an appointment time, it matches ANY event with the same email regardless of time.

**UX concern**: Auto-matching is risky. Shared family emails, common names, etc. can silently link to the wrong event. Practitioner should confirm the link.

**Three changes needed:**

1. **Reorder tiers** — Promote appointment date+time+name match (old Tier 3) to top priority (new Tier A), above email/phone. Most specific match wins first.

2. **Dedup guard** — Add `in_array($match['id'], $matchedFormIds)` check in Tiers A-E. Once a form is claimed, skip it for subsequent events.

3. **Suggested matches instead of auto-linking** — Tiers A-E return `suggested_form` field (with tier/match_field info) instead of setting `form_id`. Only Tier 0 (persistent manual link) auto-assigns `form_id`. New SUGGESTION badge (amber). Click shows match details with Accepter/Refuser buttons.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Same form cannot appear as matched on two different calendar events (dedup guard)
- [ ] #2 Appointment date+time+name match is checked BEFORE email/phone tiers
- [ ] #3 Tiers A-E return suggested_form instead of auto-setting form_id
- [ ] #4 Only Tier 0 (persistent link) auto-assigns form_id
- [ ] #5 New SUGGESTION badge (amber) for events with suggested but unconfirmed matches
- [ ] #6 Clicking SUGGESTION shows match details (name, DOB, email, match reason) with Accepter/Refuser
- [ ] #7 Accepter persists link via link-form-calendar.php then navigates to consultation
- [ ] #8 Refuser opens FormLinkModal to pick a different form or skip
<!-- AC:END -->
