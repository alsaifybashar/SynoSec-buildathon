# Frontend Shell, Sidebar, and UX Structure

## Summary

The frontend shell changes from April 22-24 concentrated around `apps/frontend/src/app/App.tsx`, `apps/frontend/src/app/app-sidebar.tsx`, and `apps/frontend/src/app/navigation.ts`. The result is a cleaner top-level shell than earlier scan-specific UI, but it now carries a mixed information architecture: core CRUD resources, workflow operations, and design/demo pages all live in the same navigation model.

This is not mainly a styling problem. It is an ownership problem between app-shell concerns, product navigation, and temporary exploration surfaces.

## What Changed

- `App.tsx` became the real shell entrypoint for auth gating, theme persistence, mobile nav state, and router handoff.
- `app-sidebar.tsx` gained grouped navigation behavior, theme switching, and authenticated user affordances.
- `navigation.ts` became the registry for section ids, labels, slugs, icons, and page rendering.
- Recent design pages were placed directly into the same navigation tree as product pages instead of being isolated as prototypes or a separate lab surface.

## Current Architecture

The shell is split reasonably at a component level:

- `App.tsx` owns startup, session bootstrap, and major shell transitions.
- `app-sidebar.tsx` owns interaction behavior for the left rail.
- `navigation.ts` defines the available sections and how each section renders.

That division is simple, but `navigation.ts` currently mixes three concerns:

- route identity
- user-facing information architecture
- page rendering and component wiring

That works for a small app, but it becomes unstable once temporary pages, design explorations, or secondary workflow surfaces need to coexist with production resources.

## Architectural Findings

### 1. The navigation registry is both router metadata and view composition

Each navigation item owns a label, slug, icon, and render callback. That keeps the shell thin, but it tightly couples route structure to page assembly. The immediate effect is low ceremony. The longer-term effect is that the sidebar becomes the de facto composition root for unrelated features.

### 2. Product IA and design/demo IA are mixed in one tree

The current navigation tree contains stable resources such as targets, providers, agents, tools, and workflows, but it also contains grouped chat-design pages. That makes the sidebar serve two different audiences:

- operators using the control plane
- builders reviewing UX experiments

The shell does not currently express that distinction.

### 3. Sidebar UX behavior is more mature than the information model underneath it

Grouped items, theme controls, auth state, and mobile behavior are all coherent. The weak point is not interaction quality. The weak point is that there is no documented rule for what earns a top-level nav item, what belongs in a group, and what should stay outside the main app shell entirely.

### 4. The shell is now the place where product structure is decided

Because the router and navigation model are closely tied, temporary page additions effectively become product-structure decisions. That is risky in a fast-moving branch, especially when design work lands before ownership boundaries are documented.

## Manageable Work Slices

1. Define a navigation ownership model.
Decide which sections are core product resources, which are workflow operations, and which are experimental/design surfaces.

2. Separate navigation metadata from rendering composition.
Keep section identity and labels in one layer and move page rendering or route assembly to a more explicit router/module boundary.

3. Introduce a clear home for design/demo pages.
Either isolate them under a dedicated lab surface or remove them from the primary operator sidebar by default.

4. Document sidebar IA rules.
Write short rules for top-level items, grouped items, and temporary entries so future UI experiments do not silently redefine the product shell.

5. Normalize shell responsibilities.
Keep `App.tsx` responsible for shell lifecycle and auth transitions, but avoid using it as the place where experimental UX states accumulate.
