---
name: jensen-top-five-signals
description: Produce a concise top-five signal report for engineering work. Use when the user asks for status, progress, what matters, what changed, what was learned, risk signals, executive summaries, or a Jensen Huang/NVIDIA-style Top Five Things update.
---

# Top Five Signals

## Operating Rule

Report the five highest-value signals, not a chronological activity log.

## Signal Shape

Each signal should be one short bullet with:

1. What happened or was learned.
2. Why it matters.
3. What action follows, if any.

## Signal Sources

Prefer signals from:

1. Tests and validation output.
2. Runtime behavior, logs, screenshots, traces, or metrics.
3. Code structure and dependency changes.
4. User decisions or unresolved assumptions.
5. External constraints, deadlines, APIs, vendors, or infrastructure.

## Discipline

Do not pad the list. If only three signals matter, provide three.

Keep weak signals visible: early warnings, surprising facts, hidden constraints, and emerging opportunities.

Separate facts from interpretation when the evidence is incomplete.
