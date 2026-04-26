---
name: tdd-vertical-slices
description: Strict test-driven development workflow for coding tasks. Use when the user asks for TDD, one failing test first, red-green-refactor, reliable tests, vertical slices, Matt Pocock-style AI TDD, or when correctness-critical behavior should be built one observable behavior at a time.
---

# TDD Vertical Slices

## Operating Rule

Write exactly one failing test for the next observable behavior before writing implementation code. Implement only enough code to make that test pass. Refactor only after the test is green and the existing test suite still passes.

## Pre-Code Questions

Before the first test, resolve these points:

1. What public interface or user-facing behavior is changing?
2. Which behavior is most valuable or riskiest to test first?
3. Can the behavior be tested through a public interface rather than internals?
4. Can dependencies be injected or controlled without mocking private implementation details?

## Cycle

Repeat this sequence for each requirement:

1. Red: write one test for one behavior.
2. Run the test and confirm it fails for the expected reason.
3. Green: write the minimum implementation needed for that test.
4. Run the focused test.
5. Run the relevant broader tests.
6. Refactor only while tests stay green.

Do not write multiple future tests before implementing the current one.

## Good Tests

Test observable behavior through public interfaces. Good tests survive internal refactors.

Avoid tests that assert private method calls, internal collaborator calls, database rows for behavior that has a public result, or snapshots that only freeze incidental structure.

## Stop Conditions

Stop and report if no test framework exists, the test cannot be run locally, the public interface is not agreed, or the only possible test would require coupling to internals.
