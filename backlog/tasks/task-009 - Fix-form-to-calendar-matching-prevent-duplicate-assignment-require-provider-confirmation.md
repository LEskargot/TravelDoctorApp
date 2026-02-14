---
id: TASK-009
title: >-
  Fix form-to-calendar matching: prevent duplicate assignment + require provider
  confirmation
status: To Do
assignee: []
created_date: '2026-02-14 22:37'
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
**Bug**: A submitted form gets matched to MULTIPLE calendar events simultaneously. Root cause: `get-calendar-events.php` builds `$matchedFormIds` array but never checks `in_array()` during matching — it's only used to compute `unlinked_forms`. So if two calendar events share the same email/name/DOB, both get the same `form_id`.

**UX problem**: Even after fixing the dedup bug, auto-matching is risky. A form matched by name-only (Tier 5) or shared family email (Tier 1) can silently link to the wrong event. The practitioner should confirm the link before it's used.

**Two changes needed:**

1. **Dedup guard** — Add `in_array($match['id'], $matchedFormIds)` check in Tiers 1-5 so once a form is claimed by one event, subsequent events skip it.

2. **Suggested matches instead of auto-linking** — For Tiers 1-5, return a `suggested_form` field (with match tier/reason) instead of setting `form_id` directly. Only Tier 0 (persistent manual link via `link-form-calendar.php`) sets `form_id`. Practitioner sees a new SUGGESTION badge (amber), clicks to confirm or refuse the match.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Same form cannot appear as matched on two different calendar events
- [ ] #2 Tiers 1-5 return suggested_form instead of auto-setting form_id
- [ ] #3 Only Tier 0 (persistent link) auto-assigns form_id
- [ ] #4 New SUGGESTION badge (amber) for events with suggested but unconfirmed matches
- [ ] #5 Clicking SUGGESTION shows match details (name, email, match reason) with Accept/Refuse buttons
- [ ] #6 Accept persists the link via link-form-calendar.php then navigates to consultation
- [ ] #7 Refuse opens FormLinkModal to pick a different form or skip
<!-- AC:END -->
