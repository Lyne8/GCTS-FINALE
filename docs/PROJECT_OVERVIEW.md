# GCTS Project Overview

## Purpose

The Garbage Collection Tracker System (GCTS) is a proposed system to help Fort Portal Tourism City monitor bins, coordinate collection work, and evaluate operational performance. The proposal identifies Central and North Divisions as the intended pilot area.

This repository covers the software work: a mobile-first Expo application, with web support for operational/admin workflows, backed by Firebase. The first implementation phase does not build, procure, or connect IoT hardware. Use clearly labeled simulated data while building and validating app workflows.

## One app, three roles

The product is one shared application for all three operational user groups, not separate apps. Authentication identifies the signed-in user; role-aware navigation and screens present the workflows relevant to that user. Backend permissions must still be enforced independently in Firebase Security Rules.

Initial role model to validate with stakeholders:

- **City administrator:** manages access and city-level reference data.
- **Supervisor:** oversees bins, vehicles, alerts, and route assignments.
- **Collector/driver:** views an assigned route and records collection progress.

Role names, detailed permissions, and account-provisioning process are not yet approved requirements. Residents are not currently in the app's initial audience.

## Product capabilities

The proposal and Figma prototype point toward these capabilities:

1. Review operational status and priority bins.
2. View bins by location, division, fill status, and freshness of the latest reading.
3. Review routes and assigned vehicles/collectors.
4. Track route progress and record collection events.
5. Review and acknowledge operational alerts.
6. View basic collection and route reports.

The prototype includes an overview, live-map, bins, routes, notifications, and reports surfaces. It is a design reference, not a binding specification; refine scope and interactions with the intended users before implementing each surface.

## Initial software boundaries

**In scope first:** Firebase Authentication, Firestore-backed operational records, role-aware app flows, bin/route/collection workflows, and demo data for app development.

**Deferred:** physical sensors, GPS hardware/device integration, production telemetry ingestion, route optimization based on live road-network data, and resident-facing services. Define stable data boundaries now so these can be integrated later without coupling them to screens.

## Success measures

The proposal intends to evaluate overflow, route distance, number of trips, response time, and operational efficiency against the current process. Before claiming improvement, establish a baseline, define each metric and its calculation, and agree on the evaluation period and data source. Proposal estimates are not achieved results.

## Sources and status

- Research proposal shared by the project owner: source of the study goals and proposed pilot.
- [Figma prototype](https://ego-hurry-23638485.figma.site/): source of example screens and sample workflows.
- Gemini shared conversation link was not reachable during preparation of these docs; use the pasted proposal content unless the owner provides additional material.

The project is at the starter-app stage. Firebase, authentication, domain records, and GCTS feature screens are not yet implemented.
