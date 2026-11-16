# Firebase Data Model (Proposal)

This is a starting domain model for review, not a deployed schema. Prefer stable document IDs and references by ID. Add denormalized display fields only when a measured query need justifies them. Define Firestore indexes from actual queries.

## Candidate collections

| Collection | Purpose | Candidate fields |
|---|---|---|
| `users/{uid}` | Authorized app users | `displayName`, `email`, `role`, `divisionId`, `isActive`, `createdAt`, `updatedAt` |
| `divisions/{divisionId}` | Operational areas | `name`, `isActive` |
| `bins/{binId}` | Bin registry and latest known status | `code`, `name`, `divisionId`, `location` (latitude/longitude), `capacity`, `fillLevelPercent`, `status`, `lastReadingAt`, `readingSource`, `updatedAt` |
| `vehicles/{vehicleId}` | Collection vehicles and latest known status | `code`, `registration`, `status`, `currentLocation`, `locationUpdatedAt`, `locationSource` |
| `routes/{routeId}` | A planned/assigned collection run | `divisionId`, `vehicleId`, `collectorUid`, `status`, ordered `stops`, `scheduledAt`, `startedAt`, `completedAt` |
| `collectionEvents/{eventId}` | Immutable record of a collection action | `routeId`, `binId`, `vehicleId`, `collectorUid`, `collectedAt`, `fillLevelBefore`, optional `fillLevelAfter`, `source` |
| `alerts/{alertId}` | Operational exceptions and acknowledgement | `binId`, `type`, `severity`, `status`, `thresholdPercent`, `createdAt`, `acknowledgedBy`, `acknowledgedAt` |
| `serviceReports/{reportId}` | Resident-submitted overflow or missed-collection reports | `residentUid`, `type`, `location` or `binId`, `details`, `status`, `createdAt`, `updatedAt` |
| `serviceNotices/{noticeId}` | Official public service announcements | `title`, `body`, `divisionIds`, `publishedAt`, `expiresAt`, `publishedBy`, `isPublished` |
| `collectionSchedules/{scheduleId}` | Approved public collection schedule information | `divisionId`, `serviceDays`, `serviceWindow`, `effectiveFrom`, `effectiveUntil`, `isPublished`, `updatedAt` |

Use timestamps in a consistent UTC-compatible representation. Use stable IDs rather than document order. Validate latitude/longitude ranges, fill level (0–100), role values, status transitions, and references at application boundaries and in Security Rules where practical.

## Candidate enums and semantics

- **User roles:** `admin`, `supervisor`, `collector`, `resident` (detailed permissions pending stakeholder confirmation).
- **Resident access:** public published schedules/notices and approved public bin data may be read without sign-in; submitting/tracking a personal report requires an authenticated resident account.
- **Bin operational status:** `active`, `maintenance`, `inactive`; keep this separate from fill-level urgency.
- **Route status:** `draft`, `assigned`, `in_progress`, `completed`, `cancelled`.
- **Alert status:** `open`, `acknowledged`, `resolved`.
- **Reading/location source:** explicit values such as `demo`, `manual`, and later `sensor`/`device`; do not label demo data as live.
- **Fill urgency:** calculate from a confirmed configurable threshold. The Figma prototype illustrates 85%; this is not yet a confirmed policy.

## Collection event behavior

Treat collection events as history rather than overwriting them. A successful collection should record who/what route serviced which bin and when, then update the bin's current operational snapshot in a consistent, authorized workflow. Decide whether this requires a transaction or trusted server operation when the write flow is implemented. Do not infer successful collection only from a route stop being opened.

## Initial versus later telemetry

For the first app phase, a bin can hold the latest simulated reading and source marker. Whether to retain a separate `binReadings` history collection is an open decision: it affects cost, retention, and whether the study needs time-series analysis. Add the collection only after agreeing on reading frequency, query/report needs, and retention.

Likewise, store only the latest simulated vehicle location initially unless route-history evaluation requires a location history. GPS data can be sensitive; define access and retention before using real device locations.

## Access-control baseline

Start Firestore Security Rules from deny-by-default. The proposed roles imply different permissions, but the exact matrix must be agreed before rules are considered complete:

- Collectors should only access assigned operational work and submit permitted progress events.
- Supervisors should manage operational records for authorized divisions.
- Administrators may manage user access and city-level reference data.
- Residents should only create reports for their own account and read their own report status; public reads should be limited to explicitly published/approved service data.

Never let a client assign its own role or grant itself broader access. UI visibility is not authorization. Test both allowed and denied access for each role and record type.

## Open schema decisions

See [DECISIONS.md](DECISIONS.md) for owner, role, threshold, telemetry-history, offline behavior, and reporting questions. Avoid committing to nested versus top-level route stops, custom claims, or denormalized report data until actual access patterns and rules are designed.
