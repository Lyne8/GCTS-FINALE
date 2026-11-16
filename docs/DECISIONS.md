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

## Open product and implementation questions

1. **Study dates and pilot length:** The proposal states a 10-month study from August 2026 to May 2027, but elsewhere describes a 12-month pilot. Confirm the intended schedule and which dates apply to software development, pilot operation, and evaluation.
2. **Evidence and targets:** The proposal gives figures such as approximately 90 tons/day, around 70% collection coverage, 500–1,000 plastic bottles/day entering River Mpanga, 40–60% cost reduction, and 50–65% efficiency improvement. Verify sources and distinguish baseline facts from targets or estimates before using them in the app, report, or presentation.
3. **Metric definitions:** Agree on formulas and data sources for overflow rate, response time, route distance, number of trips, collection coverage, and cost/efficiency before claiming improvement.
4. **Role permissions:** Confirm what each role can read, create, update, and acknowledge, including whether access is limited by division and how accounts/roles are issued. For residents, confirm which bin status fields and locations are safe to publish.
5. **Resident identity and reports:** Define how resident accounts are verified, report abuse is handled, what personal data is collected, who can view report locations/details, and report retention.
6. **Public schedules/notices:** Confirm who publishes schedules and notices, their source of truth, and how outdated/cancelled information is handled. Do not publish illustrative schedules as operational facts.
7. **Threshold and alert policy:** The Figma example uses 85% fill. Confirm the threshold, whether it varies by bin or waste type, and alert acknowledgement/resolution rules.
8. **Demo data:** Decide whether bin status and vehicle location are fixture-driven, manually editable, or periodically simulated in the initial demo. Keep source and freshness visible.
9. **Firebase project operations:** Identify who owns development/staging/production projects, how accounts are provisioned, which environments are needed, and who can change security rules.
10. **Maps:** Choose a map provider only after checking coverage, billing, offline needs, and Expo compatibility. A list-based route workflow can precede map integration.
11. **Telemetry history and retention:** Decide whether the research requires full bin-reading and GPS histories, their update frequency, who can view them, and how long they are kept.
12. **Route creation:** Decide whether the MVP uses manual ordering, a simple priority heuristic, or a routing service. Do not promise optimized routes until the algorithm and inputs are defined and evaluated.
13. **Notifications:** Confirm whether alerts are in-app only for the prototype or also require push/SMS/email, and define the delivery expectations.
14. **Research consent/privacy:** Confirm permissions and consent for user accounts, operational records, resident reports, and any real vehicle/collector location data before a pilot.

Do not silently treat an open question as a production requirement. Update this log when a decision is made and link the relevant requirements or implementation.
