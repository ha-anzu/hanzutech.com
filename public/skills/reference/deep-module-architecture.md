---
name: deep-module-architecture
description: Refactor or design software into deep modules with small stable interfaces and hidden internal complexity. Use when the user mentions deep modules, gray-box modules, A Philosophy of Software Design, Ousterhout, architecture cleanup, reducing shallow modules, information hiding, or independently testable module boundaries.
---

# Deep Module Architecture

## Operating Rule

Expose a small, stable interface that handles meaningful complexity internally. Pull complexity down into the module so callers do not need to know implementation details.

## Workflow

1. Identify the behavior callers actually need.
2. Design the smallest useful interface for that behavior.
3. List the design decisions that should be hidden: data shape, storage, algorithms, retries, parsing, orchestration, ordering, caching, and error translation.
4. Move those decisions behind the boundary.
5. Test the module through the public interface.
6. Delete pass-through functions, temporal decomposition, and leaked internal details when safe.

## Depth Checks

A module is probably too shallow when:

1. Its interface is nearly as complex as its implementation.
2. Callers must know the order of internal steps.
3. Callers pass data through multiple layers without added abstraction.
4. A design decision appears in several modules.
5. Tests must mock private internals to verify normal behavior.

## Boundary Rules

Keep the interface boring and durable. Make the implementation free to change.

Do not split code by execution order when the same knowledge belongs together. Split by hidden knowledge and stable responsibilities.

When a small function is enough, do not invent a module. Depth means hidden capability per unit of interface, not size for its own sake.
