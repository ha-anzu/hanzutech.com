---
name: jensen-extreme-codesign
description: Cross-layer design workflow inspired by Jensen Huang's extreme co-design. Use when architecture, performance, infrastructure, AI systems, frontend/backend contracts, hardware/software tradeoffs, or multi-module decisions require reasoning across the full stack instead of isolated component decisions.
---

# Extreme Codesign

## Operating Rule

Do not design a component in isolation when its constraints are coupled to other layers. Expose cross-layer constraints early and reason in the open.

## Workflow

1. Define the system output the design must produce.
2. Map the stack layers involved: UI, API, domain, data, runtime, infrastructure, hardware, vendors, deployment, observability.
3. For each layer, list what it needs from adjacent layers and what it constrains.
4. Identify coupled decisions that cannot be made locally.
5. Choose an interface that lets layers evolve without hiding critical constraints.
6. Validate with an end-to-end slice or representative benchmark.

## Codesign Questions

Ask:

1. What does this decision force every other layer to do?
2. Which layer has the real bottleneck or hard constraint?
3. Which abstraction preserves flexibility without losing performance or correctness?
4. What signal from the edge of the system changes the design?

## Failure Modes

Watch for local optimization, hidden coupling, fake independence, vendor lock-in disguised as convenience, and performance work without end-to-end measurement.
