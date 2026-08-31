# Decisions

1. **Generic core, typed extensions.** Webinar is an activity extension rather than the root data model.
2. **OpenAPI first.** The API specification generates both browser hooks and server validation schemas.
3. **Two schedule records.** A rule stores intent; a scheduled instance stores the original calculation and adjusted execution date.
4. **No duplicated calendar/journey records.** Both views project the same normalized entities.
5. **Governance is a port.** Authoritative logic is never copied into the Planner; a development adapter is visibly pending.
6. **No false integration claims.** Missing external systems stay explicit, and placeholder IDs/codes remain null.
7. **Sent and pinned records are protected.** Rescheduling previews changes and moves only eligible unsent, unpinned communications.