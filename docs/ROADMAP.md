# Software Roadmap

The sequence prioritizes a usable Firebase-backed app before device integration. It is an order of work, not a promise of calendar dates.

## Phase 0 — Confirm the product slice

- Resolve the proposal's schedule, pilot duration, baseline figures, and evaluation metrics.
- Confirm role names, permissions, user provisioning, and the first end-to-end workflows with stakeholders.
- Review the Figma prototype against field and admin tasks; choose the smallest set of screens for the first usable increment.
- Approve the initial data model and demo-data policy.

**Exit:** agreed MVP requirements, acceptance criteria, permission matrix, and data definitions.

## Phase 1 — App and Firebase foundation

- Replace starter-app content with the GCTS app shell and navigation. **Local preview in place:** role-aware overview, bins, operational route cards, and resident service/report screens use clearly labeled simulated data.
- Build one role-aware application for administrators, supervisors, collectors, and residents, with shared app foundations and task-specific navigation.
- Include residents in the same app; public approved information is readable without sign-in, while submitting/tracking reports requires resident authentication.
- Create development/staging Firebase project setup and safe configuration handling.
- Implement Authentication and an explicit account/role provisioning approach.
- Define Firestore Security Rules and test access by role before using real data.
- Add repository boundaries, typed document mapping, error handling, and a small set of realistic seed fixtures.

**Exit:** authorized test users can enter the app; access is enforced by rules; demo data is visibly identified.

## Phase 2 — Bins and operational overview

- **Implemented and owner-verified live:** connect signed-in bin lists to the typed Firestore repository, filter to `reportingEnabled == true`, validate document fields, and subscribe to realtime updates. Signed-out preview mode continues to use labeled demo fixtures.
- **Implemented and owner-reported published:** allow verified residents to read reportable bins, supervisors to read reportable bins in their claim-scoped divisions, and admins to read reportable bins. Client bin writes and collector bin reads remain denied.
- Keep absent sensor readings explicit; do not present planned records or simulated values as real telemetry.
- Derive alert/urgency state from a confirmed threshold and make stale data distinct from low fill.
- Build overview indicators from defined metrics rather than hard-coded prototype figures.

**Exit:** the owner confirmed the live resident report flow can select a reportable bin and create/read a report; scoped bin reads and loading/empty/error/offline states are implemented. The owner reports six planned locations enabled for controlled development testing; this does not verify physical installation or sensor telemetry.

## Phase 3 — Routes and collection workflow

- **Implemented:** In-app route creation for supervisors and administrators, with division scoping, vehicle assignment, optional collector assignment, and sequenced bin stops written to Firestore (`createRoute`).
- **Implemented:** Interactive OpenStreetMap/Leaflet map integration (`GctsMapView`) on both Bins and Routes screens with `[ List | Map ]` segment toggles, defaulting to Map view.
- **Implemented:** Dedicated SVG smart dustbin container metaphor for map markers, featuring status-coded lids (<70% green, 70-84% amber, ≥85% red, slate gray for offline), physical fill-level reservoirs, IoT digital percentage badges, and clean route stop sequences without duplicate numbering.
- **Implemented:** Streamlined navigation with Settings moved from bottom tabs to a 3-dots (`⋮`) header action in `AppPage`, and removal of repetitive role badge banners from all screens.
- Let collectors view their assigned route, start routes, and record stop/collection outcomes (`collected` or `skipped`).
- Persist collection events and route progress with authorization and consistent error handling.

**Exit:** an end-to-end route can be created, assigned, mapped, completed, and audited in the app.

## Phase 4 — Alerts and reports

- Implement alert lifecycle and acknowledgement according to the agreed policy.
- Build basic reports for collections, route completion, overflow/response time, and other metrics only after definitions are agreed.
- **Implemented and owner-verified live:** resident overflow/missed-collection report submission and own-report tracking, plus admin/supervisor triage, through typed Firestore repositories with ownership/division rules. The owner confirmed resident submission/read and admin status changes after enabling the required indexes.
- Validate usability and measurable outcomes with representative stakeholders and document limitations.

**Exit:** owner-verified live resident report create/read and admin status transitions; report metrics remain deferred until source events and definitions are agreed.

## Phase 5 — Device integration (later)

- Agree sensor/GPS hardware and payload contracts with the hardware workstream.
- Add trusted ingestion and production telemetry validation without coupling device code to UI.
- Define connectivity, retry, stale-data, retention, and device identity behavior.

**Exit:** simulated providers can be replaced by real sources through the same feature-facing boundary, with end-to-end integration tests.

## Current UI implementation milestone

The mobile-first, role-driven application is fully implemented for all four roles (Administrator, Supervisor, Collector, Resident), operating exclusively on live Firebase data (Firestore bins, routes, collection events, staff profiles, and service reports). In-memory mock data, demo providers, and preview role switchers have been completely eliminated.

Unauthenticated users access a public information portal containing official municipal service guidelines, notices, and sign-in calls to action. The primary navigation defaults to Map view on both Bins and Routes, rendering an interactive OpenStreetMap/Leaflet map with an SVG smart dustbin metaphor showing live fill level and urgency colors. Route stop sequences are lean and clean without redundant `#2` numbering. Settings has moved from a bottom tab to a 3-dots top header overflow action, and repetitive role badges have been removed from screen headers to keep the UI user-centered. Email/password Authentication and email verification are live-tested and verified. There is no push delivery or live sensor/GPS ingestion yet.

## Phase 1 foundation increment — agreed scope and acceptance criteria

The project owner has approved the first slice: email/password Authentication; resident self-registration with verified email required for personal reports; trusted Admin SDK provisioning for the first admin and staff; division-scoped supervisors; collectors limited to explicitly assigned routes; and resident report submission/tracking plus staff triage. The owner supplied public Firebase app configuration for the development project, stored only in the ignored local `.env`. No credentials or service-account material is present in the repository.

Sequence:

1. Establish a local Firebase Emulator Suite setup and deny-by-default Firestore rules.
2. Implement Auth/session and trusted role boundaries without making the preview role selector authoritative.
3. Add rule tests for permitted and denied resident, supervisor, administrator, and assigned-collector access.
4. Add a validated, typed service-report repository boundary and explicit backend state/error handling.
5. Keep the demo provider as the signed-out preview adapter. For signed-in accounts, use the Firebase repositories and show explicit errors; never silently fall back to demo data after a Firebase error.

Acceptance criteria:

- Residents can submit and read only their own reports after email verification. Unverified users, anonymous users, cross-user access, and client attempts to set report ownership/status are denied.
- Report creation requires an existing bin record with `reportingEnabled: true`; Security Rules verify that flag, the submitted division, and canonical location against the trusted record. The controlled development project intentionally enables planned locations for end-to-end report testing; these reports are test data, not evidence of installed bins. Disable reporting before pilot/production use until locations are approved and installed. The demo bin fixtures are not readings or production telemetry.
- Supervisors can read and transition only reports within their trusted division scope; administrators can read and transition reports city-wide. Invalid lifecycle transitions and edits to immutable report fields are denied.
- Collectors can read only route documents explicitly assigned to their authenticated UID; an unassigned route is denied. Staffing shortages are handled through route reassignment, not division-wide collector access.
- Role claims are issued only through trusted Admin SDK provisioning. A user cannot obtain or elevate a role by editing client data or choosing a preview role.
- Security Rules tests cover both allowed and denied operations in the local emulator. Invalid remote report documents are surfaced as data errors, not coerced into valid-looking UI data.
- Repository/UI state distinguishes loading, empty, permission-denied, offline/stale, and other errors. Firebase errors never produce demo-shaped success.
- No live project credentials or secrets are committed. The UI remains in preview mode for signed-out sessions; signed-in bin/report screens use Firebase and surface backend failures rather than showing demo-shaped success.

The owner confirmed Email/Password Authentication and Firestore are enabled, verified registration, sign-in/out, and email verification, and reports publishing the updated Firestore rules. Do not request or accept service-account keys in chat. Product decisions about report retention, identity beyond email verification, and other unimplemented role permissions remain open.

### Current implementation state

The local foundation now includes the standard Firebase JavaScript SDK setup, React Native Auth persistence, Auth/session and trusted role-provisioning boundaries, dual-source role resolution (Auth claims with `staffProfiles` fallback), deny-by-default Firestore rules, rules-unit tests, indexes, and typed repositories for bins, routes, collection events, staff profiles, and service reports. In-memory demo data and mock role switchers have been completely removed. The Settings account panel calls through the Auth repository and supports email/password sign-in, resident registration, verification email resend/refresh, and sign-out. The owner has confirmed live registration, sign-in/out, and email verification. The project's public web-app configuration is stored in the ignored local `.env`, and a web export builds successfully. All 17 local Firestore Security Rules emulator tests pass against the `demo-gcts` local project. A user-local Java 21 JRE is available at `$HOME/.local/share/gcts/openjdk-21`; it is not part of the app or repository.

The planned-bin seed command includes the seven confirmed preview locations and a North Division `mmu-lab` test record. The owner reports manually creating these records in the Firebase Console and has chosen to enable `reportingEnabled` for controlled end-to-end testing; this workspace cannot independently verify or change the live fields. The Admin SDK seed remains available as a dry run/idempotent option and has not been applied here. Test reports against these locations do not indicate that bins are installed or operational; disable reporting before pilot/production use until locations are approved and installed. Rules require `reportingEnabled: true` before a report can be created for a bin. The owner estimates periodic/on-change bin readings (15+ minutes or on value change) and periodic vehicle updates; Firestore remains the simplest initial datastore with scoped realtime listeners. The example sensor JSON is illustrative only. Device ingestion remains deferred until the IoT team confirms its protocol, authentication, and retention requirements; rules deployment is owner-reported as complete.

### Current Firebase setup status

1. Email/Password Authentication and Firestore are enabled in the owner-controlled project. The owner reports publishing the current rules and creating the two report indexes needed by resident and supervisor list queries.
2. The public Firebase app configuration is already in the local ignored `.env`; do not share service-account keys, passwords, or other credentials.
3. Run rules tests with `JAVA_HOME="$HOME/.local/share/gcts/openjdk-21" PATH="$HOME/.local/share/gcts/openjdk-21/bin:$PATH" pnpm test:firestore-rules`. Java is required for the local Firestore Emulator only, not for the Expo app or Firebase JavaScript SDK.
4. Before future rule changes, rerun Emulator tests, review the complete proposed rules, and ask the owner before deployment. For new compound queries, update `firestore.indexes.json` and arrange index deployment/creation; rules publication does not create indexes.
5. Staff custom claims are assigned through trusted Admin SDK provisioning. The owner successfully assigned the first admin using Cloud Shell. The repository provisioning script requires ADC; the owner's local attempt failed for lack of credentials, so use a trusted environment. Do not put Admin SDK credentials in the client or chat.

The planned-bin records are reported as manually seeded in the Firebase Console. The owner reports six have `reportingEnabled: true` for development testing. The rules allow verified residents to read reportable bins, supervisors to read reportable bins in their assigned divisions, and admins to read all reportable bins; disabled bins and all client writes remain denied. The owner reports publishing this rules version. Bins, resident report submission/tracking, and staff report triage are wired to Firestore repositories for signed-in accounts. The owner confirmed the live resident report create/read and admin status-update flow. Before pilot/production use, set `reportingEnabled` false until sites are approved and installed.

### Phase 3 implementation state — route assignment and collection workflow

Route assignment and collection workflows are implemented with typed repositories, runtime validation, and emulator-verified rules:
- `FirebaseRouteRepository` handles route subscription, collector assignment, starting routes, recording stop outcomes, and completing routes.
- Collection stops require explicit collector action to mark `collected` or `skipped`, persisting an immutable `collectionEvents/{eventId}` audit record with `source: 'manual'`. Opening a stop does not record collection.
- Security Rules enforce division-scoped supervisor creation and assignment, collector assigned-route restriction, lifecycle progression (`assigned` → `in_progress` → `completed`), and deny residents access to operational routes.
- `staffProfiles/{docId}` enables human-friendly collector names in assignment dialogs, and provides a direct role-assignment mechanism as a fallback when Auth custom claims are absent. Document ID must be the user's Auth UID or email (not Auto-ID). Role matching is case-insensitive and accepts both `role` and `Role` field names. `FirebaseStaffProfileRepository` subscribes to the collection for real-time name resolution.
- The owner has published the updated Firestore Security Rules and confirmed the live round-trip: a collector signed in, the app resolved their role from their staffProfile, and assigned routes appeared. All 17 local Firestore Emulator tests pass.
- All demo/mock data has been completely eliminated from the codebase (`demo-bins.ts` deleted, demo routes and demo resident reports removed). All screens operate 100% on live Firebase data (bins, routes, reports, staff profiles).
- The manual "View as" role switcher modal has been removed. Role and navigation tabs are reactively derived from the user's authenticated identity. Unauthenticated visitors see public services and sign-in prompts; collectors see their route work; operations staff see triage and management.
- Developer jargon ("Firestore", "Firebase") and technical status badges have been replaced with user-friendly language ("Live updates", "Offline mode: showing saved data") to reduce cognitive load on mobile devices.

### Deferred final-phase improvement — staff role-management workflow

Keep the current trusted Authentication custom-claims model through the operational feature phases. Staff accounts are created by an authorized operator and roles/scopes are assigned using the Admin SDK from a trusted environment; the owner has successfully used Cloud Shell for the initial admin. Firebase Console does not expose a supported custom-claims field. Defer simplifying role assignment with a trusted GUI/workflow until the final planned project phase. At that time, evaluate options without allowing ordinary users to edit their own roles, and do not migrate to a Firestore role registry without reviewing and testing the authorization changes.
