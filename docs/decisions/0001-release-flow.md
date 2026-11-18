# 0001 Release flow: development to master by PR

**Status:** Accepted

## Context

`master` is production. `development` is beta. Two GitHub Actions data-sync workflows (`sync-game-data.yml` and `sync-artefact.yml`) commit to `master`, so beta must receive the same game data without manual work. See [ARCHITECTURE.md](../ARCHITECTURE.md#auto-synced-data).

## Decision

- Work goes from a feature branch into `development` by pull request. `development` goes into `master` by pull request.
- The ruleset "no direct pushses" (spelling as in the GitHub ruleset) protects `master`. It requires a PR and blocks force-push.
- The ruleset "protect development" blocks force-push and deletion on `development`.
- Direct commits to `development` are allowed. This is needed because the data-sync workflows push a mirror commit there.
- After a sync workflow commits to `master`, it mirrors the data files to `development` with a file-level checkout: `src/data/game/`, plus `public/world/` for the artefact. The mirror is skipped with a warning if `development` has local edits to those paths that `master` does not have.

## Consequences

- Nobody pushes to `master` directly, human or AI agent. Every change to prod is a reviewed PR.
- Feature work reaches beta first. Prod gets it through the second PR.
- Because the mirror has no fast-forward requirement, the data files on `master` and `development` stay identical. Local edits to those paths on `development` make the mirror skip, so beta can drift a season behind. Avoid that.
- Direct commits to `development` skip PR review. Only the ruleset (no force-push, no deletion) protects it.
