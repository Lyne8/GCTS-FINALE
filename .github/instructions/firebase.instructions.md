---
description: "Use when implementing Firebase Authentication, Cloud Firestore, Firebase Security Rules, repositories, or trusted Cloud Functions for GCTS."
applyTo:
  - "src/services/firebase/**/*.ts"
  - "src/features/**/data/**/*.ts"
  - "firestore.rules"
  - "firestore.indexes.json"
  - "functions/**/*.ts"
---

# Firebase Guidelines

- Use the modular Firebase JavaScript SDK selected for the Expo app. Confirm current Firebase and Expo compatibility in official documentation before implementation or dependency changes.
- Keep Firebase initialization and SDK calls in the infrastructure/data layer. Expose typed repository operations to features; do not import Firebase SDK APIs into screens or reusable UI components.
- Validate and map Firestore documents at the data boundary. Treat stored documents as untrusted input; do not assert that a document is a valid domain object without checking it.
- Put role and record-level authorization in Firestore Security Rules or trusted server code. UI role checks are only for presentation and never replace backend enforcement.
- Start Security Rules from deny-by-default and add only the reads and writes required by an agreed role/permission matrix. Test rule behavior before relying on it.
- Never allow clients to assign or elevate their own privileged roles. Use a trusted administrative process or server-side code for privileged role changes.
- Keep service-account keys and server secrets out of the app bundle, repository, and client-side environment configuration.
- Handle realtime listener cleanup, request failures, offline/stale data, and permission errors explicitly. Do not swallow errors or report a write as successful when Firebase rejected it.
- Keep simulated/demo data behind a separate provider or adapter and label its source. Do not mix it with device telemetry or present it as live sensor/GPS data.
- Add Cloud Functions only for operations that require trusted server-side authority or a clearly justified backend workflow; keep ordinary authorized reads and writes in the client repositories.
