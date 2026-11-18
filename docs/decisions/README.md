# Architecture decision records

An ADR records one decision. It says what we knew, what we chose, what follows from the choice, and where the decision stands.

## Format

Each ADR is one file named `NNNN-short-slug.md`, numbered in order. Each has these sections:

- **Context.** The facts and constraints that made a decision necessary.
- **Decision.** What was chosen. For an open question, list the options here instead.
- **Consequences.** What gets easier, what gets harder, and what must change in the code or the process.
- **Status.** One of `Accepted`, `Proposed`, `Proposed: decision needed`, or `Superseded by NNNN`.

Keep each ADR under 40 lines. To change an accepted decision, write a new ADR that supersedes it. Do not rewrite the old one.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](0001-release-flow.md) | Release flow: development to master by PR | Accepted |
| [0002](0002-netlify-proxy.md) | The browser never holds SFL or Hub keys | Accepted |
| [0003](0003-typing-strategy.md) | Typing strategy | Proposed: decision needed |
