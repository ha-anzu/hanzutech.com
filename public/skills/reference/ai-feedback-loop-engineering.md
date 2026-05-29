---
name: ai-feedback-loop-engineering
description: Create fast validation loops for AI-assisted coding. Use when using agents or Codex to build features, when the user mentions Matt Pocock AI coding workflows, integration testing, pre-commit hooks, CI, type checks, prototype routes, doc rot, or needing trustworthy automated feedback for generated code.
---

# AI Feedback Loop Engineering

## Operating Rule

Give the agent fast, real feedback from the system. Tests, type checks, lint, screenshots, logs, and runtime probes are better than prose instructions alone.

## Workflow

1. Identify the feedback loop closest to the behavior: unit, integration, end-to-end, type check, lint, screenshot, benchmark, log assertion, or smoke test.
2. Make the loop runnable locally before broad implementation.
3. Prefer integration tests around public behavior when AI is changing internals.
4. Run validation after every meaningful change.
5. Tighten the loop when failures are slow, flaky, or too broad.
6. Remove or update stale docs that conflict with live code.

## AI-Specific Patterns

Use prototypes for taste-sensitive UI or uncertain architecture. Put them on throwaway routes or temporary paths, inspect them, then implement the chosen direction properly.

Use deep module boundaries so the agent can change internals while tests protect behavior.

Prefer just-in-time exploration notes over permanent markdown that can rot.

## Done Criteria

The change is ready when the agent has run the relevant feedback loop and the result is reported with the command or evidence used.
