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

- Connect the current sample bin list/detail and division/status filters to a typed repository.
- Define and expose only approved public bin location/status fields to residents.
- Show fill level, latest update time, and data source.
- Derive alert/urgency state from a confirmed threshold and make stale data distinct from low fill.
- Build overview indicators from defined metrics rather than hard-coded prototype figures.

**Exit:** a supervisor can find and prioritize bins, with loading/empty/error/offline states handled.

## Phase 3 — Routes and collection workflow

- Let supervisors create/assign a route and collector/vehicle using the agreed workflow.
- Let collectors view their assigned route and record stop/collection outcomes.
- Persist collection events and route progress with authorization and consistent error handling.
- Use simulated locations only if location display is needed for the demo; label them as simulated.

**Exit:** an end-to-end route can be assigned, completed, and audited in the app.

## Phase 4 — Alerts and reports

- Implement alert lifecycle and acknowledgement according to the agreed policy.
- Build basic reports for collections, route completion, overflow/response time, and other metrics only after definitions are agreed.
- Add resident overflow/missed-collection report submission and status tracking, with ownership-enforced access.
- Validate usability and measurable outcomes with representative stakeholders and document limitations.

**Exit:** reported metrics can be traced to stored events and their calculation is documented.

## Phase 5 — Device integration (later)

- Agree sensor/GPS hardware and payload contracts with the hardware workstream.
- Add trusted ingestion and production telemetry validation without coupling device code to UI.
- Define connectivity, retry, stale-data, retention, and device identity behavior.

**Exit:** simulated providers can be replaced by real sources through the same feature-facing boundary, with end-to-end integration tests.

## Current UI preview milestone

The mobile-first, role-aware UI increment is implemented for all four roles. It includes overview/bin/route screens, resident service information and report submission, an admin resident-report queue with received → under review → resolved status changes, a basic settings screen, a notification panel, a responsive web admin sidebar, and compact mobile navigation.

All of these remain prototype interactions. The demo provider stores role selection and reports in memory; settings are screen-local; notification entries are illustrative; no Authentication, Firestore persistence, push delivery, verified schedules, or live sensor/GPS data is connected. The preview role selector is not a security boundary. The worktree also contains earlier project scaffold/documentation changes; preserve work already present and review `git status` before touching files.

## Immediate next implementation increment

Start Phase 1 by confirming MVP acceptance criteria, user provisioning, and a role/permission matrix with the project owner. Then establish a Firebase development project and safe app configuration, implement Firebase Authentication and typed role resolution, and add deny-by-default Firestore rules with tests before connecting UI screens. Build typed repositories/adapters for approved public bin data and resident-owned reports, with explicit loading, empty, permission-denied, offline, and error states. Keep the demo provider as a deliberate preview/test adapter until Firebase paths and authorization are verified. Avoid route optimization and hardware integration until data and authorization paths are proven.
