---
id: TASK-008
title: Support linking and resuming draft forms from practitioner view
status: To Do
assignee: []
created_date: '2026-02-14 21:51'
labels:
  - feature
  - practitioner-app
  - pending-forms
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a patient starts filling a form but doesn't finish (form stays in `draft` status), the practitioner should still be able to link that draft form to a calendar event and access the partial data the patient entered.

**Use case**: A patient receives an invitation email (OneDOC flow), starts filling the form, doesn't complete it, then shows up for the appointment anyway. The practitioner wants to retrieve whatever data the patient already entered rather than starting from scratch.

**Current behavior**:
- Draft forms linked to calendar events show INVITE badge (purple) — this is correct
- Clicking INVITE opens FormLinkModal to link/re-link forms
- After linking a draft form, the badge stays INVITE (correct, since form isn't submitted)
- But the practitioner cannot proceed to use the partial data from the draft form

**Desired behavior**:
- When a draft form is linked to a calendar event, the practitioner should be able to click through to the consultation/vaccination screen
- The partial form data should be loaded and pre-populated in the practitioner view
- The practitioner can then complete the missing fields manually during the visit

**Key files**:
- `app/js/components/PendingForms.js` — click handler for INVITE events, currently only shows FormLinkModal
- `app/js/components/FormLinkModal.js` — modal for linking forms
- `form-site/api/decrypt-form.php` — decrypts form data (needs to handle draft status)
- `app/js/app.js` — routing logic (onFormSelected, onCalendarSelected)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Practitioner can click an INVITE event to open the linked draft form data
- [ ] #2 Partial form data from draft is pre-populated in the consultation view
- [ ] #3 Missing fields are clearly indicated so the practitioner knows what to complete
- [ ] #4 Flow works for both consultation and vaccination screens
<!-- AC:END -->
