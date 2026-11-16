# GCTS Project Overview

## Purpose

The Garbage Collection Tracker System (GCTS) is a proposed system to help Fort Portal Tourism City monitor bins, coordinate collection work, and evaluate operational performance. The proposal identifies Central and North Divisions as the intended pilot area.

This repository covers the software work: a mobile-first Expo application, with web support for operational and resident workflows, intended to be backed by Firebase. The first implementation phase does not build, procure, or connect IoT hardware. Current app screens use clearly labeled in-memory simulated data; Firebase is not configured yet.

## One app, four roles

The product is one shared application for city administrators, supervisors, collectors, and residents, not separate apps. Authentication identifies signed-in users; role-aware navigation and screens present the workflows relevant to each group. Public resident information may be available without sign-in, while submitting and tracking personal reports will require authentication. Backend permissions must still be enforced independently in Firebase Security Rules.

Initial role model to validate with stakeholders:

- **City administrator:** manages access and city-level reference data.
- **Supervisor:** oversees bins, vehicles, alerts, and route assignments.
- **Collector/driver:** views an assigned route and records collection progress.
- **Resident:** views public bin status and confirmed collection notices/schedules; signs in to submit and track overflow or missed-collection reports.

Role permissions, account-provisioning process, resident identity verification, and the public/private boundary are not yet approved requirements.

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

The current UI increment includes a role-aware preview shell; overview, bins, and route screens; resident service information and report submission; an admin resident-report queue with in-memory status changes; a basic settings screen; and a lightweight notification panel. The web admin workspace has a desktop sidebar and uses bottom navigation at smaller widths. These are prototype interactions, not a deployed service: operational records/reports are held in memory, settings are screen-local, notification content is illustrative, and there is no Firebase, authentication, persistent storage, push delivery, or verified schedule/notice source yet.

The next implementation stage is Firebase foundation work: confirm the MVP workflows, role/permission matrix and account provisioning; configure development Firebase safely; implement Authentication; and then add deny-by-default Firestore rules and typed repositories. Do not treat the role selector or client-side navigation as authentication or authorization.
