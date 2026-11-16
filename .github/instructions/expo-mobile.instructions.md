---
description: "Use when building or changing Expo Router routes, React Native screens, hooks, and cross-platform UI for the GCTS mobile app."
applyTo: "src/**/*.{ts,tsx}"
---

# Expo and React Native Feature Guidelines

- Check `package.json` for the installed Expo SDK major version and use that version's official documentation before relying on Expo or React Native APIs. Do not assume APIs from another SDK version still apply.
- Keep `src/app/` files focused on route composition and navigation. Put feature screens, reusable components, domain logic, and data access outside the route tree.
- Prefer small, composable functions and a functional core / imperative shell: keep calculations and state transitions pure; isolate effects in hooks, providers, or service adapters.
- Organize code around product features and clear responsibilities. Extract shared code when it is genuinely reused; avoid both oversized components and premature layers.
- Design mobile-first and verify web compatibility for supported workflows. Use platform-specific files only when behavior or presentation truly differs.
- Represent loading, empty, stale/offline, and error states explicitly. Do not silently substitute success-shaped demo data after a failed request.
- Keep presentation independent from Firebase and hardware SDKs. UI should consume typed feature-level state and actions, not perform backend or device I/O.
- Preserve accessibility: meaningful labels, adequate touch targets, readable status text, and color-independent status indicators.
- Avoid adding dependencies for functionality available in the installed Expo SDK or existing project utilities. Check versioned Expo guidance before adding native modules.
