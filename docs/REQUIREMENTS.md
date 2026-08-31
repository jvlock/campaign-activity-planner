# Requirements

## Product hierarchy

Campaign Plan → Campaign Activity → Communication → Destination.

Calendar and journey are projections of the same activity, branch, communication, and schedule records.

## Webinar MVP

The setup flow captures campaign context and the Webinar's audience, subject, objective, timing, timezone, platform, and registration destination. Creating a Webinar generates the recruitment, registrant, attendee, and no-show communication branches from template version 1.

Pre-event weekend or holiday dates move backward. Post-event dates move forward. Original and adjusted dates are retained. Rescheduling requires an impact preview and does not move sent or pinned communications.

## Governance

All authoritative identity operations must go through `GovernanceProvider`. Development records remain pending authoritative assignment; development titles and empty codes are not final.

## Readiness

A communication is not Ready for Build until identity, codes, title, audience, timing, destination, content, dynamic fields, links, approvals, and blocking QA checks pass.

## MVP exclusions

Social, paid, and partner execution workflows are excluded. Live Salesforce, email, webinar, governance, and file-export integrations are excluded until configured and verified.