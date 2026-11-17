# Firebase Data Model (Proposal)

This is a starting domain model for review, not a deployed schema. Prefer stable document IDs and references by ID. Add denormalized display fields only when a measured query need justifies them. Define Firestore indexes from actual queries.

## Candidate collections

| Collection | Purpose | Candidate fields |
|---|---|---|
| `users/{uid}` | Optional user profile data (initially denied to clients) | `displayName`, `email`, `createdAt`, `updatedAt` |
| `divisions/{divisionId}` | Operational areas | `name`, `isActive` |
| `bins/{binId}` | Bin registry; readings are populated only when a real source is connected | `code`, `name`, `divisionId`, optional `location` (latitude/longitude), `installationStatus`, `reportingEnabled`, optional latest reading fields |
| `vehicles/{vehicleId}` | Collection vehicles and latest known status | `code`, `registration`, `status`, `currentLocation`, `locationUpdatedAt`, `locationSource` |
| `routes/{routeId}` | A planned/assigned collection run | `divisionId`, `vehicleId`, `collectorUid`, `status`, ordered `stops`, `scheduledAt`, `startedAt`, `completedAt` |
| `collectionEvents/{eventId}` | Immutable record of a collection action | `routeId`, `binId`, `vehicleId`, `collectorUid`, `collectedAt`, `fillLevelBefore`, optional `fillLevelAfter`, `source` |
| `alerts/{alertId}` | Operational exceptions and acknowledgement | `binId`, `type`, `severity`, `status`, `thresholdPercent`, `createdAt`, `acknowledgedBy`, `acknowledgedAt` |
| `serviceReports/{reportId}` | Resident-submitted overflow or missed-collection reports | `residentUid`, trusted `divisionId`, approved `binId`, bin-derived `location`, `type`, `details`, `status`, `createdAt`, `updatedAt` |
| `serviceNotices/{noticeId}` | Official public service announcements | `title`, `body`, `divisionIds`, `publishedAt`, `expiresAt`, `publishedBy`, `isPublished` |
| `collectionSchedules/{scheduleId}` | Approved public collection schedule information | `divisionId`, `serviceDays`, `serviceWindow`, `effectiveFrom`, `effectiveUntil`, `isPublished`, `updatedAt` |

Use timestamps in a consistent UTC-compatible representation. Use stable IDs rather than document order. Validate latitude/longitude ranges, fill level (0–100), role values, status transitions, and references at application boundaries and in Security Rules where practical.

## Candidate enums and semantics

- **User roles:** `admin`, `supervisor`, `collector`, `resident` (detailed permissions pending stakeholder confirmation).
- Privileged role and supervisor division scope are trusted Authentication custom claims, not client-editable profile fields in `users/{uid}`.
- **Resident access:** public published schedules/notices and approved public bin data may be read without sign-in; submitting/tracking a personal report requires an authenticated resident account.
- **Bin operational status:** `active`, `maintenance`, `inactive`; keep this separate from fill-level urgency.
- **Route status:** `draft`, `assigned`, `in_progress`, `completed`, `cancelled`.
- **Alert status:** `open`, `acknowledged`, `resolved`.
- **Reading/location source:** explicit values such as `demo`, `manual`, and later `sensor`/`device`; do not label demo data as live.
- **Fill urgency:** calculate from a confirmed configurable threshold. The Figma prototype illustrates 85%; this is not yet a confirmed policy.

## Collection event behavior

Treat collection events as history rather than overwriting them. A successful collection should record who/what route serviced which bin and when, then update the bin's current operational snapshot in a consistent, authorized workflow. Decide whether this requires a transaction or trusted server operation when the write flow is implemented. Do not infer successful collection only from a route stop being opened.

## First workflow: resident service reports

The initial Firebase-backed feature is resident report submission/tracking and staff triage. Its document contains `residentUid`, trusted `divisionId`, approved `binId`, the bin's canonical `location` name, `type` (`overflowing_bin` or `missed_collection`), `details`, `status`, `createdAt`, and `updatedAt`. New reports start as `received`; an authorized staff member may move them through `under_review` and `resolved`. The client cannot choose an owner UID, initial status, privileged reviewer identity, bin, division, or canonical location.

Residents must have a verified Firebase Authentication email to create or read personal reports and can access only documents whose `residentUid` matches their UID. Supervisors can read and transition reports in assigned divisions; administrators can read and transition reports city-wide. Report creation requires an existing `bins/{binId}` record with `reportingEnabled: true`; Security Rules verify that flag, the submitted division, and canonical location against the trusted document. In the controlled development project, planned locations are intentionally reportable for end-to-end testing; reports created against them are development/test data, not evidence that bins are installed or operational. Set `reportingEnabled` to `false` before any pilot/production use until the site is approved. The owner confirmed the preview list's names and divisions as planned deployment locations; the seed adds these and `mmu-lab` without coordinates or simulated fill readings. The preview fixtures remain simulated and are not written as telemetry.

Report reads and writes must expose loading, empty, permission-denied, offline/stale, invalid-data, and other error states. A backend failure must never fall back to the in-memory demo provider. Keep the existing provider as an explicit preview adapter. The owner reports that the live resident create/read and admin review/status-update flow has been verified.

### Firestore index operations

The resident report list filters by `residentUid` and sorts by `createdAt`; the supervisor list filters by `divisionId` and sorts by `createdAt`. The owner created and enabled the matching `serviceReports` composite indexes listed in `firestore.indexes.json`. The admin list sorts only by `createdAt` and uses Firestore's automatic single-field index. Firestore rules deployment does not create indexes. When adding a compound query, keep the index file aligned and create/deploy the required index; if Firestore returns a missing-index link, inspect it and update the checked-in index definition as part of the change.

## Local setup and trusted role provisioning

The app uses the Firebase JavaScript SDK with a public Firebase web-app configuration supplied through `EXPO_PUBLIC_FIREBASE_*` variables. These values are included in the client bundle and are not server credentials. Copy `.env.example` to the ignored `.env` only after the owner creates the development project. Never put Admin SDK credentials in `.env`, `EXPO_PUBLIC_*`, or the mobile app.

Run `pnpm test:firestore-rules` for the emulator-backed access tests; the Firebase CLI and a Java JDK (version 11 or later) are required for the local Firestore Emulator. Java is not required by the app or Firebase JavaScript SDK. Run `pnpm firebase:emulators` to start the local Auth and Firestore emulators for app development. Use the `demo-gcts` project ID for local emulators only.

Create staff Authentication accounts through owner-controlled Firebase administration. Assign roles with trusted Admin SDK provisioning, for example `pnpm run provision:firebase-role -- --project <project-id> --uid <auth-uid> --role admin`, in an environment configured with Application Default Credentials. Supervisors require one or more `--division <division-id>` arguments. The tool preserves unrelated custom claims, updates GCTS claims, and revokes refresh tokens; users must sign in again to receive updated claims. The owner successfully assigned the initial admin using Cloud Shell. Firebase Console does not provide a supported custom-claims field; do not add a client-editable role field. The current custom-claims model remains in place for the operational phases; a simpler trusted role-management GUI/workflow is deferred until the final planned phase. Staff invitation and password setup are handled outside the mobile app. Do not copy credential files or verification links into source control or chat.

## Realtime and sensor data

The owner shared an illustrative entity/payload shape for bins, vehicles, routes, and users. It is not an approved wire protocol or real data; do not seed its example IDs, coordinates, names, or readings. The initial cadence estimate is periodic/on-change bin readings (15+ minutes or on value change) and periodic vehicle updates. Confirm exact intervals, units, clock behavior, and retention with the IoT team before connecting devices.

For that expected cadence, keep one datastore: Firestore is the source of truth and its realtime listeners can update screens without adding Realtime Database. Keep bin metadata and its current reading in `bins/{binId}`, and current vehicle status/location in `vehicles/{vehicleId}`. Keep route assignments and reports in their existing Firestore collections. Attach listeners only to specific documents or bounded queries; never subscribe at the root. If research requires historical trends, add an explicitly retained readings collection only after agreeing on frequency and retention.

Map the payload carefully at a trusted ingestion boundary:

- The document ID is the bin/truck/route identity; do not duplicate IDs unless a transport protocol requires them.
- Keep static bin coordinates and canonical display name in the bin registry, not repeated in each reading. Store `divisionId` separately rather than embedding it in a location string.
- Store a bin's current `fillLevelPercent`, `lidStatus`, and `batteryVoltage` as validated latest-reading fields. Store vehicle current coordinates, speed, and operational status separately from driver identity.
- Record both device measurement time (`measuredAt`) and server ingestion time (`receivedAt`). Validate ranges and units; do not treat a device clock as authoritative.
- Do not store `users.role` as an authorization source. Firebase Auth custom claims remain authoritative. Do not include names/emails in telemetry. Limit access to exact vehicle coordinates and device diagnostics according to an approved role matrix.
- Devices must not write through an app-shared credential. A trusted ingestion service or gateway must authenticate each device, validate its payload, and perform privileged Firestore writes. The exact device-authentication protocol is pending IoT team input.

Configure actual transmission cadence on the device or trusted gateway, not Expo `.env`; app environment variables are build configuration, not secure remote policy. If operators later need to adjust cadence centrally, define an authenticated, server-managed device policy after the hardware protocol is known. Reconsider Firebase Realtime Database only if measured update frequency, latency, throughput, or cost justifies its separate schema, rules, and operational surface.

Likewise, store only the latest simulated vehicle location initially unless route-history evaluation requires a location history. GPS data can be sensitive; define access and retention before using real device locations.

## Planned bin seed

The owner reports that the eight planned registry records were entered manually in the Firebase Console, with six set to `reportingEnabled: true` for controlled development report-flow testing; this workspace cannot independently verify or change the live fields. The optional `pnpm seed:firestore-bins` command previews the same records without writing. `pnpm seed:firestore-bins -- --apply` creates only missing records in the fixed development project `gcts-14674`, using Firebase Admin SDK Application Default Credentials in the trusted operator environment. It never overwrites an existing record; a conflicting existing identity aborts the transaction. New development records have `reportingEnabled: true`, omit coordinates and readings, and are readable by eligible clients under the updated rules. The owner reports publishing those rules. Set reporting to false before pilot/production use until locations are approved and installed.

## Access-control baseline

Start Firestore Security Rules from deny-by-default. The proposed roles imply different permissions, but the exact matrix must be agreed before rules are considered complete:

- Residents must have a verified email and may create reports for their own account and read only their own report status.
- Supervisors may review reports only for divisions in trusted role claims.
- Administrators may review reports city-wide and manage access through trusted provisioning tooling.
- Collectors may read only routes explicitly assigned to them. Staffing shortages are handled by an authorized route reassignment, not broader division-wide reads.
- Public reads remain denied until a collection and fields are explicitly approved for publication.

Never let a client assign its own role or grant itself broader access. UI visibility is not authorization. The current report rules and tests cover residents, supervisors, administrators, and assigned-collector route reads. Reportable bin metadata can be read by verified residents, administrators, and supervisors within their assigned divisions; clients cannot write bin records. Bin queries must constrain `reportingEnabled == true`; supervisor queries must also constrain `divisionId` to an assigned division. Disabled bins, unverified/anonymous readers, and collectors are denied. Other operational collection permissions remain denied until designed and tested.

## Open schema decisions

See [DECISIONS.md](DECISIONS.md) for owner, threshold, telemetry-history, offline behavior, and reporting questions. Avoid committing to nested versus top-level route stops or denormalized report data until actual access patterns and rules are designed.
