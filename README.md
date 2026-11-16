# GCTS — Fort Portal Tourism City

GCTS is a mobile-first software prototype for residents and waste-collection teams in Fort Portal Tourism City. It is one Expo / React Native app with role-aware experiences and responsive web support for city administrators. The UI includes an overview, bins, routes, resident reporting, an admin report queue, settings, and a lightweight notification panel. Operational records and resident reports are local preview state; preferences are screen-local, notifications are illustrative, and Firebase integration is not yet implemented. IoT hardware is outside the initial software implementation scope.

## Project guidance

- [Project overview](docs/PROJECT_OVERVIEW.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Firebase data model](docs/FIREBASE_DATA_MODEL.md)
- [Roadmap](docs/ROADMAP.md)
- [Decision log and open questions](docs/DECISIONS.md)
- [Workspace agent instructions](AGENTS.md)
- [Scoped Copilot instructions](.github/instructions/)

The proposal and Figma prototype inform the product direction, but neither is treated as a final, validated requirements specification. See the decision log for discrepancies and items to confirm with stakeholders.

## Getting started

Install dependencies with pnpm, then start the Expo development server:

```bash
pnpm install
pnpm start
```

Useful checks:

```bash
pnpm lint
pnpm exec tsc --noEmit
```

A test runner and Firebase project configuration have not been set up yet.
