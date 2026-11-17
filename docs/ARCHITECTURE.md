# Application Architecture

## Confirmed direction

- **Client:** Expo, React Native, and Expo Router; mobile-first Android/iOS with web support for operational and resident workflows.
- **Backend:** Firebase Authentication and Cloud Firestore using the modular Firebase JavaScript SDK.
- **Trusted server work:** add Cloud Functions only when a workflow needs server authority or is otherwise justified.
- **Initial data source:** fixtures/simulation for bin readings and vehicle positions; no IoT hardware integration in the first software phase.

These are project-level choices, not a claim that Firebase or app setup already exists in this repository. Confirm SDK versions and official docs before implementing Firebase or Expo APIs.

## Dependency direction

```text
Expo Router routes
        ↓
Feature presentation (screens, UI state, actions)
        ↓
Feature domain (types, validation, pure rules/calculations)
        ↓
Feature repositories / ports
        ↓
Firebase adapter | demo-data adapter
```

- Route files in `src/app/` compose routes and navigation.
- Feature modules own the workflows and domain concepts they implement.
- Shared UI and utilities live outside route files and are extracted when useful across features.
- Firebase and demo providers implement the same feature-facing repository contracts where their behaviors need to be interchangeable.
- Domain rules should not depend on React Native, Expo Router, or Firebase.

Use the structure as a direction, not a requirement to create empty folders or layers before a feature needs them. A possible future layout is:

```text
src/
  app/                       # Expo Router routes/layouts
  features/
    auth/
    bins/
    routes/
    collections/
    alerts/
    reports/
  shared/
    ui/
    lib/
  services/
    firebase/                # SDK initialization and shared Firebase wiring
```

Keep a feature's UI, domain rules, and data mapping close enough to change together. Extract shared code only when there is real reuse or a clear cross-feature responsibility.

## Firebase boundary

- Initialize Firebase once in the infrastructure layer.
- Keep SDK references out of view components and domain modules.
- Repositories own queries, subscriptions, writes, data mapping, and translating Firebase errors into explicit application outcomes.
- Validate Firestore data at read/write boundaries; TypeScript types do not validate remote documents at runtime.
- Subscribe only while a screen or feature needs updates and always clean up listeners.
- Enforce access in Firestore Security Rules and trusted code. Client-side route guards and hidden controls are usability measures, not security boundaries.
- Assign administrator, supervisor, and collector claims only through trusted Admin SDK provisioning. Supervisor division scope comes from trusted claims; collector route access is checked against the route's assigned collector UID.
- Keep the current custom-claims role model for the planned operational feature phases. Firebase Console has no supported custom-claims editor; authorized project operators use a trusted Admin SDK environment. Defer evaluating a simpler role-management GUI/workflow until the final planned phase. Never let a user write their own authorization role or scope.
- Require verified resident email for personal report access. Keep Firebase Auth and report repositories separate from the preview role selector and in-memory demo provider.
- Keep secrets requiring server trust out of the app. A Firebase client configuration is not a substitute for authorization rules.

## Realtime and data freshness

Use Firestore as the current source of truth for application records and use its listeners for realtime updates where screens need them. The owner's initial sensor-cadence estimate is periodic/on-change bin readings (15+ minutes or on value change) and periodic vehicle updates; this is not yet a hardware contract. This moderate update pattern favors one Firestore datastore over adding Realtime Database. Keep listeners scoped to the specific documents or bounded queries a screen needs, unsubscribe on teardown, and make offline/stale status visible where it affects operational decisions.

Treat the shared sensor JSON as an entity/payload sketch, not a deployed schema or source of real readings. Keep bin registry metadata, latest bin readings, vehicle snapshots, and route assignments in separate Firestore documents/collections. Keep Auth roles in trusted custom claims, never in client-writable profile data. A trusted ingestion component must authenticate devices, validate readings, and write canonical server timestamps; do not embed shared device credentials in the app. Keep device measurement time distinct from server receipt time. Configure reporting cadence on the device or trusted gateway; do not put it in Expo `.env` or expose it as client-controlled configuration. Reconsider Realtime Database only if measured cadence, latency, throughput, or cost requirements show Firestore is no longer a fit.

## Current preview implementation

- The role selector, resident reports, and report status transitions are held in the in-memory `DemoRoleProvider`; reloads clear them. This is demo state, not an auth/session implementation or a persistence layer.
- Settings selections currently live in the Settings screen and reset when it unmounts. Persist preferences only after deciding which are user-level versus device/workspace-level.
- The notification panel is a small illustrative activity list. It is not connected to the report queue, alert lifecycle, a notification repository, or push delivery.
- Responsive web layout selection uses a client-side width hook with a stable server/initial render, so desktop navigation activates after hydration without a responsive-class mismatch.
- Keep each preview behavior visibly honest while avoiding warning banners. `preview`/`demo` labels on example operations are preferable to claiming simulated values are live.
- Firebase Auth has been live-tested by the owner. Bins and resident/staff report screens use typed Firestore repositories for signed-in accounts; signed-out preview roles use the in-memory demo provider. The owner reports publishing the current rules and enabling the resident and supervisor `serviceReports` composite indexes. The owner confirmed that a resident report was submitted and read back, and a trusted admin viewed it and changed its status. The repository index file is the source to keep aligned with future compound queries; creating/publishing rules alone does not create indexes.

## Mobile and web

- Ship one application for administrators, supervisors, collectors, and residents. Use the authenticated user's role to select the relevant routes and actions; do not fork into separate apps.
- Make approved public resident information readable without authentication. Require authentication for submitting and tracking personal reports; enforce ownership in Security Rules.
- Keep shared domain and data workflows common. Use role-specific screen compositions or navigation only where tasks differ.
- Treat client role-aware navigation as UX, not authorization; enforce record access in Firestore Security Rules or trusted code.
- Favor touch-friendly, readable mobile layouts for field use.
- Ensure core admin/operational workflows also work in web builds where agreed.
- Isolate actual platform differences rather than maintaining duplicated feature logic.
- Do not add a native module until the user need, Expo SDK compatibility, and development-build requirements are understood.

## Error and state handling

Model loading, empty, stale/offline, permission-denied, and failed states deliberately. Surface actionable errors; do not hide failures behind empty lists or demo data. Demo providers must identify their data as simulated.

## Security and privacy

Apply least privilege to role and record access, especially vehicle/collector location and user data. Never trust a client-supplied role for authorization. Decide data retention, location collection, and access policies with project stakeholders before pilot deployment.
