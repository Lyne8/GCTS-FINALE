# Decision Log and Open Questions

## Confirmed project direction

| Topic | Decision |
|---|---|
| Guidance location | Repository/workspace instructions and docs |
| Client | Existing Expo / React Native application, mobile-first Android/iOS with web support for admin workflows |
| Backend starting point | Firebase Authentication and Cloud Firestore |
| Firebase client | Modular Firebase JavaScript SDK |
| Cloud Functions | Add only for trusted server work or a justified backend workflow |
| Code design preference | Functional style, modularity, separation of concerns, and reuse where real,readable codes |
| Initial hardware scope | Software side first; no IoT implementation assumed |
| Application shape | One shared app for city administrators, supervisors, collectors, and residents, with role-aware workflows |
| Resident access | Public approved service information is viewable without sign-in; sign-in required to submit and track personal reports |
| Prototype roles | City administrator, supervisor, collector/driver, resident; detailed permissions pending validation |

## Confirmed Firebase foundation decisions (2026-11-16)

| Topic | Decision |
|---|---|
| Environments | The owner supplied public app configuration for the owner-controlled development project; it is stored only in ignored local `.env`. The owner confirmed Email/Password Authentication and Firestore are enabled and successfully tested registration, sign-in/out, and email verification. The owner reports publishing the current Firestore rules. |
| Sign-in | Firebase Authentication email/password. Residents may self-register and must verify their email before submitting or viewing personal reports. |
| Staff onboarding | Staff accounts are created by an authorized operator. Staff roles and scopes are assigned through trusted Admin SDK provisioning; credentials stay in the trusted environment and are never added to the app or repository. Firebase Console does not provide a supported custom-claims editor. |
| Role authority | Privileged roles are issued by trusted tooling, not by client profile fields or the preview role selector. Residents have no privileged claims. Supervisors are scoped to assigned divisions. |
| Collector access | Collectors may read only routes explicitly assigned to them. To handle a staffing shortage, an authorized supervisor reassigns a route; no division-wide collector exception is allowed. |
| First workflow | Resident report submission/tracking and staff report triage. Signed-out preview keeps the demo provider; signed-in users use Firestore. The owner has verified the live resident create/read and admin status-update flow. |
| Report lifecycle | `received` → `under_review` → `resolved`. Residents can read only their own reports; supervisors can review reports within their assigned divisions; administrators have city-wide report access. |
| Public data | Only explicitly approved and published service information may be public. No illustrative or simulated bin, schedule, or notice data is to be presented as live. |
| Planned bin seed | The owner confirmed the preview list's locations and division labels as planned dustbin deployment sites. Seed metadata only, plus a North Division `mmu-lab` test record; no coordinates or simulated readings. The owner reports six locations enabled for controlled development report-flow testing; disable reporting before pilot/production until sites are approved and installed. |
| Realtime storage | Based on the initial estimate of periodic/on-change bin readings (15+ minutes or when values change) and periodic vehicle updates, use Firestore as the sole initial datastore and use scoped realtime listeners. Reconsider Realtime Database only if measured cadence/latency/throughput/cost needs justify it. The shared payload is illustrative; the exact device protocol, trusted ingestion/authentication, units, and retention remain for the IoT team to confirm. Configure cadence at devices/trusted gateways, not Expo `.env`. |

## Confirmed implementation and operations decisions (2026-11-17)

| Topic | Decision / status |
|---|---|
| Live resident reports | The owner confirmed a resident report for `mmu-lab` was saved and then appeared in the resident's own-report list after the required Firestore indexes were enabled. |
| Live staff triage | The owner confirmed a trusted admin account could view the report and change its status. The live resident-create/read and admin-review path has therefore been verified by the owner. |
| Firestore indexes | The owner created and enabled the two `serviceReports` composite indexes defined in `firestore.indexes.json`: `residentUid` ascending + `createdAt` descending, and `divisionId` ascending + `createdAt` descending. Keep the checked-in index definitions aligned with new compound queries. |
| Role assignment operation | Keep Firebase Authentication custom claims as the authorization source. The owner successfully assigned the first admin claim using the Admin SDK in Cloud Shell. The local provisioning command requires trusted Application Default Credentials and failed when run from a machine without those credentials; no role was assigned by that failed local run. |
| Role-management usability | Do not change the current custom-claims setup during the route/collection, alert, or reporting phases. Defer evaluating a simpler trusted role-management GUI/workflow until the final planned project phase. Do not use a client-editable role field or switch to Firestore role documents without a separately reviewed migration and rules tests. |
| Next product phase | Proceed to route assignment and collection workflow, beginning with schema, permission, and acceptance criteria; keep GPS/sensor ingestion out of scope. |
| Route assignment schema & rules | Implemented typed repository, runtime document validation, and Security Rules for `routes/{routeId}` and `collectionEvents/{eventId}`. Supervisors can create and assign routes in their assigned divisions; collectors can read only assigned routes, advance lifecycle (`assigned` → `in_progress` → `completed`), and record stop outcomes (`collected` or `skipped`). Residents have no access to staff routes. |
| Auditable collection events | Collection events in `collectionEvents/{eventId}` are immutable audit records written with `source: 'manual'` upon explicit collector action (`collected` or `skipped`). Opening a stop does not record collection. All 15 Firestore rules tests pass locally in the emulator suite. Rules deployment requires explicit owner approval. |
| Staff profiles & role authority | Created `staffProfiles/{docId}` Firestore collection for human-friendly staff display names (`displayName`, `email`, `role`, `divisionIds`) and simplified role management. The document ID must be the user's Auth UID or their email address (not an Auto-ID); Firestore Security Rules look up both `staffProfiles/{uid}` and `staffProfiles/{email}` to find the profile. If Firebase Auth custom claims are absent, the mobile client and Firestore Security Rules recognize the role and division scope from the matched staff profile. Role matching is case-insensitive (`Collector` and `collector` are equivalent), and both `role` and `Role` field names are accepted. `divisionIds` is required only for supervisors (admins have city-wide access, collectors are scoped to assigned routes). Readable by authenticated staff (`admin`, `supervisor`, `collector`) and users reading their own profile, writable only by `admin` (or Firebase Console / Admin SDK), and denied to residents. The owner confirmed the live round-trip: a collector signed in, the app resolved their role from their staffProfile, and assigned routes appeared. All 17 Firestore rules tests pass locally. |
| Elimination of demo data | Completely removed in-memory demo data across the entire application (`demo-bins.ts` deleted, demo routes and demo resident reports removed from context). The app now operates exclusively on live Firebase data (Firestore bins, routes, reports, staff profiles). Unauthenticated visitors/citizens are presented with a public portal displaying official municipal service guidance, schedule/notice info, and prominent Sign In / Register calls to action rather than mock figures or preview fixtures. |
| Role switcher removal & tailored mobile UX | Removed the manual "View as" role switcher button and dialog. User experience and navigation tabs are now strictly driven by the authenticated identity: citizens and signed-out visitors see only public services, bins, issue reporting, and account sign-in; collectors see only their active collection routes, bins, and stops; supervisors and administrators see operational triage. Eliminated developer-facing badges and technical terminology (e.g., "LIVE FIRESTORE DATA", "Showing cached Firestore data") from the UI to minimize cognitive load on mobile devices. |

## Open product and implementation questions

1. **Study dates and pilot length:** The proposal states a 10-month study from August 2026 to May 2027, but elsewhere describes a 12-month pilot. Confirm the intended schedule and which dates apply to software development, pilot operation, and evaluation.
2. **Evidence and targets:** The proposal gives figures such as approximately 90 tons/day, around 70% collection coverage, 500–1,000 plastic bottles/day entering River Mpanga, 40–60% cost reduction, and 50–65% efficiency improvement. Verify sources and distinguish baseline facts from targets or estimates before using them in the app, report, or presentation.
3. **Metric definitions:** Agree on formulas and data sources for overflow rate, response time, route distance, number of trips, collection coverage, and cost/efficiency before claiming improvement.
4. **Role permissions beyond the first slice:** Define the remaining bin, vehicle, alert, route-write, and collection-event permissions before those workflows are connected. For residents, confirm which bin status fields and locations are safe to publish.
5. **Resident identity and reports:** Email verification is required for report access. Still define how residents are otherwise identified, how abuse is handled, what personal data is collected, who can view report locations/details, and report retention.
6. **Public schedules/notices:** Confirm who publishes schedules and notices, their source of truth, and how outdated/cancelled information is handled. Do not publish illustrative schedules as operational facts.
7. **Threshold and alert policy:** The Figma example uses 85% fill. Confirm the threshold, whether it varies by bin or waste type, and alert acknowledgement/resolution rules.
8. **Demo data:** Decide whether bin status and vehicle location are fixture-driven, manually editable, or periodically simulated in the initial demo. Keep source and freshness visible.
9. **Firebase project operations:** Confirm the project owner, authorized rule deployers, and whether staging/production projects are needed. Never share service-account keys or other secrets in chat or client configuration.
10. **Maps:** Choose a map provider only after checking coverage, billing, offline needs, and Expo compatibility. A list-based route workflow can precede map integration.
11. **Telemetry history and retention:** Decide whether the research requires full bin-reading and GPS histories, their update frequency, who can view them, and how long they are kept.
12. **Route creation:** Decide whether the MVP uses manual ordering, a simple priority heuristic, or a routing service. Do not promise optimized routes until the algorithm and inputs are defined and evaluated.
13. **Notifications:** Confirm whether alerts are in-app only for the prototype or also require push/SMS/email, and define the delivery expectations.
14. **Research consent/privacy:** Confirm permissions and consent for user accounts, operational records, resident reports, and any real vehicle/collector location data before a pilot.

Do not silently treat an open question as a production requirement. Update this log when a decision is made and link the relevant requirements or implementation.
