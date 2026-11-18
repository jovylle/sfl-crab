# 0003 Typing strategy

**Status:** Accepted: Option B (JSDoc with `checkJs`), in a scoped set of modules

## Context

The codebase was JavaScript and Vue only, with no type checker and no ESLint. New code must not add suppression comments ([AGENTS.md](../../AGENTS.md#typing)). The riskiest code is the solver and the grid code, where tiles are `string[]` of CSS classes, so shape errors are silent.

## Decision

Option B. The code stays JavaScript. The typed modules are checked with `tsc --checkJs` through `tsconfig.typecheck.json`, run as `npm run check:types`. A module joins the scope only when it passes with zero errors. Type errors are fixed in the JSDoc, never suppressed.

`npm run check:types` also fails if `@ts-ignore`, `@ts-expect-error` or `@ts-nocheck` appears in `src`, `netlify`, `scripts` or `tests`.

Both options are kept below for reference.

### Option A: migrate to TypeScript

Pros:
- Checks cover all of `src/`, `netlify/` and `scripts/`.
- Editors get real type information for every module.

Cons:
- Large, churn-heavy migration. Most `.js` and `.vue` files change.
- Needs a TypeScript toolchain and `vue-tsc`.
- Netlify functions are CommonJS `.cjs`, so they need a build step or stay JavaScript.

### Option B: JSDoc with `checkJs` on the solver and grid modules

Pros:
- No renames. The code stays JavaScript and runs unchanged.
- Starts small and covers the riskiest logic first: `src/utils/treasureSolver.js` and the grid modules.
- Types sit beside the code as JSDoc comments.

Cons:
- Only annotated modules are checked. The rest of the app stays unchecked.
- JSDoc is verbose. The type check adds a step to `npm run check`.
- Type errors may tempt suppression comments, which the rules forbid. The types must be fixed, not suppressed.

## Consequences

- `typescript` is a devDependency (approved 2026-11-19). `npm run check` runs `check:types`.
- The solver (`src/utils/treasureSolver.js`) is not in scope yet. Its `process.env` use needs Node type definitions (`@types/node`), which is a new dependency. Adding it needs the owner's approval; then the solver can join the scope.
- Scope grows by adding files to `tsconfig.typecheck.json`. There is no ratchet baseline, because the error count is zero.
- A JSDoc cast (`/** @type {T} */ (value)`) is allowed where the runtime shape is known but cannot be written as a type. It is not a suppression.
- Full migration to TypeScript (Option A) is not chosen. Changing that needs a new ADR.
