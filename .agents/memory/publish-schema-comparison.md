---
name: Publish schema comparison
description: Diagnose missing production fields when publishing reports no schema changes.
---

Compare the actual development database to the application's schema before treating an empty development-to-production diff as healthy.

**Why:** Both databases can share an older schema while the application expects newer fields. Publishing can succeed with no database changes and leave data queries failing.

**How to apply:** Inspect both schemas read-only, apply the existing schema source through the development-only schema push, and verify development queries and the resulting non-destructive publish diff. Production changes must still go through Publish, never startup migrations or direct production DDL.