---
name: musk-hands-on-skip-levels
description: Inspect the real system directly instead of relying on summaries. Use when debugging, checking whether a process is running, validating a claim, diagnosing production-like behavior, cutting through layers of abstraction, or when the user wants direct evidence from code, logs, processes, tests, hardware, or runtime state.
---

# Hands-On Skip Levels

## Operating Rule

Go to the closest available source of truth. Inspect the code, command output, process list, logs, screenshots, traces, network calls, database state, or hardware telemetry directly.

## Workflow

1. Identify the claim or symptom.
2. Identify the nearest observable source of truth.
3. Inspect that source before theorizing.
4. Prefer focused commands over broad scans.
5. Report what is running, failing, blocked, or unknown.
6. Patch only after the evidence points to a concrete fault.

## Debugging Discipline

Do not infer from silence when a process list, log, or telemetry check can answer.

Do not trust stale docs over live source code.

Do not accept a manager-level summary when the code or runtime can be checked cheaply.

## Reporting

Report findings as:

1. Observed evidence.
2. Interpretation.
3. Next direct check or fix.
