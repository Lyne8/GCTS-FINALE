# Software Roadmap

The sequence prioritizes a usable Firebase-backed app before device integration. It is an order of work, not a promise of calendar dates.

## Phase 0 — Confirm the product slice

- Resolve the proposal's schedule, pilot duration, baseline figures, and evaluation metrics.
- Confirm role names, permissions, user provisioning, and the first end-to-end workflows with stakeholders.
- Review the Figma prototype against field and admin tasks; choose the smallest set of screens for the first usable increment.
- Approve the initial data model and demo-data policy.

**Exit:** agreed MVP requirements, acceptance criteria, permission matrix, and data definitions.

## Phase 1 — App and Firebase foundation

- Replace starter-app content with the GCTS app shell and navigation.
- Build one role-aware application for administrators, supervisors, and collectors, with a shared sign-in and task-specific navigation.
- Create development/staging Firebase project setup and safe configuration handling.
- Implement Authentication and an explicit account/role provisioning approach.
- Define Firestore Security Rules and test access by role before using real data.
- Add repository boundaries, typed document mapping, error handling, and a small set of realistic seed fixtures.

**Exit:** authorized test users can enter the app; access is enforced by rules; demo data is visibly identified.

## Phase 2 — Bins and operational overview

- Implement bin list/detail and division/status filters.
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
- Validate usability and measurable outcomes with representative stakeholders and document limitations.

**Exit:** reported metrics can be traced to stored events and their calculation is documented.

## Phase 5 — Device integration (later)

- Agree sensor/GPS hardware and payload contracts with the hardware workstream.
- Add trusted ingestion and production telemetry validation without coupling device code to UI.
- Define connectivity, retry, stale-data, retention, and device identity behavior.

**Exit:** simulated providers can be replaced by real sources through the same feature-facing boundary, with end-to-end integration tests.

## Immediate next implementation increment

After confirming the open questions in [DECISIONS.md](DECISIONS.md), set up Firebase Authentication, Firestore rules, and a small typed repository for users/bins. Seed a handful of clearly marked demo records, then implement the bin list/detail workflow. Avoid route optimization and hardware integration until this data and authorization path is proven.
