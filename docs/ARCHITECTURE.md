# Application Architecture

## Confirmed direction

- **Client:** Expo, React Native, and Expo Router; mobile-first Android/iOS with web support for admin workflows.
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
- Keep secrets requiring server trust out of the app. A Firebase client configuration is not a substitute for authorization rules.

## Realtime and data freshness

Firestore listeners may provide updates to screens that need them, but do not subscribe indiscriminately to every collection. Keep queries bounded, unsubscribe on teardown, and make offline/stale status visible where it affects operational decisions. Store timestamps consistently and distinguish the event time from the time the app received or processed data when both are needed.

## Mobile and web

- Ship one application for administrators, supervisors, and collectors. Use the authenticated user's role to select the relevant routes and actions; do not fork into three independently maintained apps.
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
