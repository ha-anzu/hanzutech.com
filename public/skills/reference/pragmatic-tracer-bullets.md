---
name: pragmatic-tracer-bullets
description: Build thin end-to-end slices to learn, validate direction, and avoid speculative architecture. Use when requirements are uncertain, integration risk is high, the user mentions tracer bullets, prototypes, The Pragmatic Programmer, walking skeletons, DRY, orthogonality, or needing something working early.
---

# Pragmatic Tracer Bullets

## Operating Rule

Build the smallest real end-to-end path that proves direction. Use it to learn where the target is before widening the implementation.

## Tracer Bullet Workflow

1. Define the end-to-end user or system path.
2. Choose the thinnest valuable slice across all required layers.
3. Use real interfaces where practical.
4. Stub only what is outside the learning objective.
5. Run the slice and observe where it misses.
6. Iterate the design using feedback from the running slice.

## Prototype Rule

Prototype to learn, not to ship. If prototype code is messy or intentionally fake, label it as disposable and do not quietly promote it to production.

## Pragmatic Checks

Apply these checks while iterating:

1. DRY means one authoritative representation of knowledge, not blindly removing every repeated line.
2. Orthogonal parts should change independently.
3. Broken windows should be fixed when they are inside the task path.
4. Keep documentation close to code or generate it just in time.
5. Prefer working feedback over extended speculation.

## Exit Criteria

Stop using tracer bullets when the direction is clear enough to implement deliberately with tests and stable boundaries.
