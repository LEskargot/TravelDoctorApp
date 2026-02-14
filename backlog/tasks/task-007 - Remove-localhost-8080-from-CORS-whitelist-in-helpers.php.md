---
id: TASK-007
title: 'Remove localhost:8080 from CORS whitelist in helpers.php'
status: To Do
assignee: []
created_date: '2026-02-14 21:04'
labels:
  - cleanup
  - security
dependencies: []
references:
  - 'form-site/api/helpers.php:75'
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After testing the form-to-calendar linking fix locally, remove `http://localhost:8080` from the `$allowed` array in `form-site/api/helpers.php` line 75. This was added temporarily for local development testing.
<!-- SECTION:DESCRIPTION:END -->
