---
id: TASK-002
title: Switch from KoBoToolbox to internal form
status: To Do
assignee: []
created_date: '2026-02-14 20:13'
labels:
  - feature
  - form
  - backend
dependencies: []
references:
  - form-site/cron/process-onedoc-emails.php
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In process-onedoc-emails.php, function sendFormInvitation(): change $formLink = buildKoboUrl($patientData) back to $formLink = FORM_URL . '/?edit=' . $editToken. The buildKoboUrl() function can then be deleted.

Test the full flow: cron creates draft → patient fills form via link → draft becomes submitted → INVITE → FORMULAIRE RECU
<!-- SECTION:DESCRIPTION:END -->
