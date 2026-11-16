# GCTS — Fort Portal Tourism City

GCTS is a mobile-first software prototype for monitoring waste-bin status and supporting garbage collection operations in Fort Portal Tourism City. The current repository is an Expo / React Native starter; Firebase integration and product workflows are planned next. IoT hardware is outside the initial software implementation scope, so early demos must use clearly labeled simulated data.

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
