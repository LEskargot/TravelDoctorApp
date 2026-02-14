---
id: TASK-001
title: Fix Tier 0 manual linking not reflecting in calendar view
status: To Do
assignee: []
created_date: '2026-02-14 20:13'
labels:
  - bug
  - calendar
  - backend
dependencies: []
references:
  - form-site/api/get-calendar-events.php
  - form-site/api/link-form-calendar.php
  - app/js/components/FormLinkModal.js
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
link-form-calendar.php API returns success and PocketBase calendar_event_id IS saved on the form record, but get-calendar-events.php doesn't reflect the change — events keep showing the old email-matched form. Tier 0 code IS deployed on server (verified with grep).

Debug approach: link a form to an event that has form_id: null (e.g., Giorgio Savonarola, Mana McBride) and check if form_id changes in the response. This isolates whether tier 0 works at all vs being overridden by email matching. If tier 0 doesn't work at all: add debug logging to get-calendar-events.php to trace the matching.
<!-- SECTION:DESCRIPTION:END -->
