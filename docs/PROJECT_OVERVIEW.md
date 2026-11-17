# GCTS Project Overview

## Purpose

The Garbage Collection Tracker System (GCTS) is a proposed system to help Fort Portal Tourism City monitor bins, coordinate collection work, and evaluate operational performance. The proposal identifies Central and North Divisions as the intended pilot area.

This repository covers the software work: a mobile-first Expo application, with web support for operational and resident workflows, backed by Firebase. The first implementation phase does not build, procure, or connect IoT hardware. Signed-in bin and report workflows use Firestore repositories; signed-out preview mode retains clearly labeled in-memory simulated data.

## One app, four roles

The product is one shared application for city administrators, supervisors, collectors, and residents, not separate apps. Authentication identifies signed-in users; role-aware navigation and screens present the workflows relevant to each group. Public resident information may be available without sign-in, while submitting and tracking personal reports will require authentication. Backend permissions must still be enforced independently in Firebase Security Rules.

Initial role model to validate with stakeholders:

- **City administrator:** manages access and city-level reference data.
- **Supervisor:** oversees bins, vehicles, alerts, and route assignments.
- **Collector/driver:** views an assigned route and records collection progress.
- **Resident:** views public bin status and confirmed collection notices/schedules; signs in to submit and track overflow or missed-collection reports.

The initial Auth and report/bin permissions are implemented and covered by Firestore rules tests; the owner has confirmed the live resident-report and admin-review flow. Staff roles use trusted Authentication custom claims, not client-selected roles. Remaining operational permissions, resident identity beyond email verification, and the public/private boundary for future data are still subject to stakeholder validation.

## Product capabilities

The proposal and Figma prototype point toward these capabilities:

1. Review operational status and priority bins.
2. View bins by location, division, fill status, and freshness of the latest reading.
3. Review routes and assigned vehicles/collectors.
4. Track route progress and record collection events.
5. Review and acknowledge operational alerts.
6. Review resident reports and view basic collection and route reports.
7. Let residents view public service information and submit/track authenticated service reports.
8. Configure basic workspace preferences and discover service updates/notifications.

The prototype includes an overview, live-map, bins, routes, notifications, and reports surfaces. It is a design reference, not a binding specification; refine scope and interactions with the intended users before implementing each surface.

## Initial software boundaries

**In scope first:** Firebase Authentication, Firestore-backed operational records, role-aware app flows, bin/route/collection workflows, public resident information, authenticated resident reporting, and clearly labeled demo data for app development.

**Deferred:** physical sensors, GPS hardware/device integration, production telemetry ingestion, and route optimization based on live road-network data. Define stable data boundaries now so these can be integrated later without coupling them to screens.

## Success measures

The proposal intends to evaluate overflow, route distance, number of trips, response time, and operational efficiency against the current process. Before claiming improvement, establish a baseline, define each metric and its calculation, and agree on the evaluation period and data source. Proposal estimates are not achieved results.

## Sources and status

- Research proposal shared by the project owner: source of the study goals and proposed pilot.
- [Figma prototype](https://ego-hurry-23638485.figma.site/): source of example screens and sample workflows.
- Gemini shared conversation link was not reachable during preparation of these docs; use the pasted proposal content unless the owner provides additional material.

The current UI increment includes a role-aware preview shell; overview, bins, and route screens; resident service information and report submission; a resident-report queue; a basic settings screen; and a lightweight notification panel. The web admin workspace has a desktop sidebar and uses bottom navigation at smaller widths. The Settings account panel supports Firebase email/password sign-in, resident self-registration, verification-email resend, and session sign-out; the owner confirmed these live Auth flows work. Authentication does not globally gate all preview screens; signed-in bin and report routes use trusted Auth claims and Firestore repositories, while signed-out preview roles use the in-memory demo provider. Settings are screen-local, notification content is illustrative, and there is no push delivery or verified schedule/notice source yet.

The Firebase foundation includes email/password Authentication, trusted role provisioning, deny-by-default Firestore rules, and typed bin/report repository boundaries. The owner's public project configuration is stored in the ignored local `.env`; authenticated bin and report screens use Firestore while signed-out preview roles continue to use in-memory demo data. The owner reports publishing rules that allow verified residents, division-scoped supervisors, and admins to read reportable bins, and enabling the composite indexes required by report list queries. The owner confirmed a resident report could be submitted and read back and that a trusted admin could view it and change its status. All 13 local Firestore Emulator rule tests pass using a user-local Java runtime. Staff custom claims are assigned through trusted Admin SDK provisioning; the current role-management usability improvement is intentionally deferred until the final planned phase. Do not treat the role selector or client-side navigation as authentication or authorization.
