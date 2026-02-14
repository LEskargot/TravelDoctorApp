---
id: TASK-006
title: Fix FormLinkModal radio button width bug
status: In Progress
assignee: []
created_date: '2026-02-14 20:13'
labels:
  - bug
  - ui
  - css
dependencies: []
references:
  - app/css/style.css
  - app/js/components/FormLinkModal.js
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Global CSS rule `input { width: 100% }` caused the radio input inside FormLinkModal to expand to 417px, pushing form-link-details to 0px width. Content overflowed outside the card boundaries.

Fix applied locally: added `width: auto; margin: 0;` to `.form-link-radio` in app/css/style.css. Needs deploy (git pull + bump ?v=N cache buster).
<!-- SECTION:DESCRIPTION:END -->
