# Requirements traceability

| Requirement | Implementation | Status |
|---|---|---|
| Generic hierarchy | normalized Campaign Plan, Activity, Communication, Destination schema | Implemented |
| Versioned Webinar template | activity template/version plus Webinar extension tables | Implemented |
| Governance boundary | typed provider + development adapter | Implemented; external API pending |
| Pending authority label | governance endpoint and UI | Implemented |
| Guided Webinar setup | `/new` and create-Webinar API | Implemented |
| Relative schedule | pure schedule engine + rules/instances | Implemented |
| Weekend business-day behavior | previous/next adjustment with reasons | Implemented |
| Registration suppression | branch rule modeled | Modeled; execution integration pending |
| Attendance/no-show | branch and attendance models | Modeled; event ingestion pending |
| Reschedule preview | preview and confirm APIs + dialog | Implemented |
| Protect sent/pinned | impact action rules | Implemented |
| Calendar/journey shared records | single workspace projection | Implemented as journey; alternate calendar modes pending |
| Activity workspace tabs | communication workspace and readiness tab | Partial |
| Destinations/readiness | destination persistence and readiness checks | Implemented |
| Dynamic fields | token catalog and mappings schema | Modeled; catalog UI pending |
| Company display names | governed model | Modeled; steward workflow pending |
| Approvals and audit | tables, status editing, change events | Implemented foundation |
| Excel export | export record + workbook requirements documented | Pending supplied SMF-238 source and object storage |
| Server-side roles | role/permission model | Pending production authentication |
| Automated tests | scheduling tests and typecheck | Partial; production suite listed in test strategy |
| Accessible UI routes | `/`, `/campaigns`, `/campaigns/:id`, `/new`, `/governance` | Implemented |