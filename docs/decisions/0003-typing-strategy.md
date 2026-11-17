# 0003 Typing strategy

**Status:** Proposed: decision needed

## Context

The codebase is JavaScript and Vue only, with no type checker and no ESLint. `typescript` and `vue-tsc` are not dependencies today. New code must not add suppression comments ([AGENTS.md](../../AGENTS.md#typing)). The riskiest code is the solver and the grid code, where tiles are `string[]` of CSS classes, so shape errors are silent.

## Decision

Not chosen yet. The owner must pick one option.

### Option A: migrate to TypeScript

Pros:
- Checks cover all of `src/`, `netlify/` and `scripts/`.
- Editors get real type information for every module.

Cons:
- Large, churn-heavy migration. Most `.js` and `.vue` files change.
- Needs a TypeScript toolchain and `vue-tsc`. Neither is installed today.
- Netlify functions are CommonJS `.cjs`, so they need a build step or stay JavaScript.

### Option B: JSDoc with `checkJs` on the solver and grid modules

Pros:
- No renames. The code stays JavaScript and runs unchanged.
- Starts small and covers the riskiest logic first: `src/utils/treasureSolver.js` and the grid modules.
- Types sit beside the code as JSDoc comments.

Cons:
- Only annotated modules are checked. The rest of the app stays unchecked.
- JSDoc is verbose. A type-check step (for example `tsc --checkJs` through `jsconfig.json`) must be added to `npm run check`.
- Type errors may tempt suppression comments, which the rules forbid. The types must be fixed, not suppressed.

## Consequences

- Until a decision is recorded, do not add a type checker, `tsconfig.json`, or suppression comments. Either option adds a step to `npm run check`.
- When the owner decides, write the choice here, set Status to `Accepted`, and link the follow-up work. If the choice differs from this file, supersede it with a new ADR.
