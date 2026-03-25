# ORC Layout Student Prototype

A small web-based replication prototype inspired by **"ORC Layout: Adaptive GUI Layout with OR-Constraints"**.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Project structure

- `index.html` - app entry point
- `src/main.ts` - bootstrap and resize handling
- `src/model.ts` - widget and layout data model
- `src/constraints.ts` - basic constraint checks and penalties
- `src/engine.ts` - OR-alternative search and layout solving
- `src/renderer.ts` - DOM rendering layer
- `src/demo.ts` - single layout specification and demo widgets
- `src/styles.css` - styling

## Core idea

A single layout specification defines multiple alternative branches:

- toolbar in one row OR two rows
- sidebar on the right OR below content
- controls horizontal OR vertical

At runtime the engine evaluates all combinations, computes penalties for violated or less desirable constraints, and renders the lowest-penalty arrangement.
