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
- Assign administrator, supervisor, and collector claims only through trusted Admin SDK provisioning or by creating a `staffProfiles/{docId}` document (keyed by Auth UID or email) in Firebase Console. When Auth custom claims are absent, both the mobile app and Security Rules fall back to the matched staff profile's `role` and `divisionIds`. Role matching is case-insensitive and accepts both `role` and `Role` field names.
- Supervisor division scope comes from trusted claims or the staff profile's `divisionIds`; collector route access is checked against the route's assigned collector UID.
- Keep the current dual-source role model (Auth claims with staffProfiles fallback) for the planned operational feature phases. Defer evaluating a simpler role-management GUI/workflow until the final planned phase. Never let a user write their own authorization role or scope.
- Require verified resident email for personal report access. Keep Firebase Auth and report repositories separate from the preview role selector and in-memory demo provider.
- Keep secrets requiring server trust out of the app. A Firebase client configuration is not a substitute for authorization rules.

## Realtime and data freshness

Use Firestore as the current source of truth for application records and use its listeners for realtime updates where screens need them. The owner's initial sensor-cadence estimate is periodic/on-change bin readings (15+ minutes or on value change) and periodic vehicle updates; this is not yet a hardware contract. This moderate update pattern favors one Firestore datastore over adding Realtime Database. Keep listeners scoped to the specific documents or bounded queries a screen needs, unsubscribe on teardown, and make offline/stale status visible where it affects operational decisions.

Treat the shared sensor JSON as an entity/payload sketch, not a deployed schema or source of real readings. Keep bin registry metadata, latest bin readings, vehicle snapshots, and route assignments in separate Firestore documents/collections. Keep Auth roles in trusted custom claims, never in client-writable profile data. A trusted ingestion component must authenticate devices, validate readings, and write canonical server timestamps; do not embed shared device credentials in the app. Keep device measurement time distinct from server receipt time. Configure reporting cadence on the device or trusted gateway; do not put it in Expo `.env` or expose it as client-controlled configuration. Reconsider Realtime Database only if measured cadence, latency, throughput, or cost requirements show Firestore is no longer a fit.

## Live Firebase implementation & UI architecture

- The application operates exclusively on live Firebase services (Authentication, Cloud Firestore, and Security Rules). In-memory demo data, mock providers, and role switchers have been completely eliminated.
- Unauthenticated users access an official municipal public service portal with guidance, notices, and sign-in calls to action; authenticated users have their roles resolved via Firebase Auth custom claims or matched `staffProfiles` documents.
- Primary navigation is streamlined: Settings has moved from a bottom tab to a clean 3-dots overflow icon (`⋮`) in the top right header action area of `AppPage`, navigating directly to `/settings`.
- Screen headers are user-centered: persistent role badge flags have been removed across all screens to keep the mobile interface lean and focused.
- Map view is the default mode for both Bins and Routes screens. The interactive map uses Leaflet and OpenStreetMap (`react-native-webview` on mobile, iframe on web) with no external cloud billing dependencies.
- Map markers utilize a dedicated SVG smart dustbin container metaphor:
  - Lid handle, status-coded lid, and pointed anchor tip.
  - Physical fill reservoir whose height reflects the bin's fill level percentage.
  - High-contrast digital IoT display badge showing fill percentage (`78%` or `—` when sensor data is absent).
  - Status color-coding: `<70%` green, `70–84%` amber, `≥85%` red, slate gray for unknown/offline.
  - Route stop markers display a clean sequence circle badge (`1`, `2`, `3`...) on top and the collection outcome (`✓` or `✕`) or fill percentage in the container body, without repetitive stop numbering.
- Operational route assignments and collection progress use `FirebaseRouteRepository` with strict document mapping and validation. Supervisors create and assign routes in their assigned divisions; collectors view only assigned routes, start them, and record stop outcomes (`collected` or `skipped`). Recording an outcome commits a transaction that writes an immutable `collectionEvents` audit record (`source: 'manual'`) and updates route stop status. Opening a stop does not record collection. `FirebaseStaffProfileRepository` provides real-time collector name resolution for assignment dialogs. All 17 Firestore rules tests pass in the local emulator suite.

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
