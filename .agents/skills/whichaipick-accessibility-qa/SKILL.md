---
name: whichaipick-accessibility-qa
description: Audits WhichAIPick accessibility, responsive layouts, contrast, keyboard navigation, forms, buttons and interactive components. Use when reviewing UI changes, Tool Page V2, Finder, Quiz, comparison pages or WCAG compliance.
---

# WhichAIPick Accessibility QA

## Purpose

Identify accessibility and usability problems
before development changes are accepted.

Follow Master Control Directive v2.0.

Use WCAG 2.2 Level AA as the accessibility
evaluation target.

This skill is READ-ONLY by default.

## 1. Identify the Target

Determine:

- Git branch
- Target page or component
- Expected behaviour
- Applicable design requirements
- Available testing environment

Do not assume development and production
contain identical interfaces.

## 2. Responsive Layout

When browser testing is available,
check these viewport widths:

360px
390px
768px
1280px
1440px

Inspect:

- Horizontal overflow
- Clipped content
- Overlapping elements
- Unreadable text
- Broken navigation
- Incorrect spacing
- Hidden interactive controls

Test zoom and text resizing where practical.

Record which conditions were actually tested.

## 3. Colour Contrast

Use actual computed foreground and
background colours.

Calculate contrast using WCAG methodology.

Check:

Normal text: at least 4.5:1.

Large text: at least 3:1.

Relevant non-text UI components
and graphical objects: at least 3:1.

Respect applicable WCAG exceptions.

Do not claim PASS from assumed CSS values.

Do not substitute screenshot colour guesses
for reliable computed-style measurements.

## 4. Buttons and Links

Verify:

- Visible text or accessible name
- Correct element semantics
- Valid destination or action
- Keyboard operability
- Visible focus indicator
- Appropriate target size
- Adequate spacing

For WCAG 2.2 AA target sizing,
apply the 24x24 CSS pixel rule and
its documented exceptions.

Prefer larger targets where practical.

Do not incorrectly claim 44x44 pixels
is a universal WCAG 2.2 AA requirement.

## 5. Keyboard Accessibility

Test real keyboard navigation.

Verify:

- Logical Tab order
- Visible keyboard focus
- Buttons activate correctly
- Menus can be opened and closed
- Dialogs manage focus appropriately
- Focus is not trapped unexpectedly
- No keyboard-only interaction blockers

Programmatically focusing an element
alone does not prove keyboard usability.

## 6. Semantic HTML

Check:

- Appropriate heading hierarchy
- Descriptive links
- Correct button elements
- Valid form labels
- Appropriate image alternatives
- Valid ARIA use
- Meaningful page landmarks

Prefer native HTML semantics.

Do not add unnecessary ARIA attributes.

## 7. Interactive Components

For applicable WhichAIPick features,
review:

- Finder
- Quiz
- Comparison Centre
- Tool Page V2
- Search
- Navigation
- Cookie consent
- Modals and dialogs

Verify controls work with keyboard input
and communicate their current state.

Do not modify component behaviour
without explicit authorisation.

## 8. Browser Testing

Inspect package.json before running tests.

Use existing Playwright or equivalent
browser testing tools when available.

Check:

- JavaScript page errors
- Failed essential asset requests
- Keyboard functionality
- Focus indicators
- Contrast
- Layout overflow
- Accessible names
- Required interactions

Screenshots may support visual review.

Screenshots alone do not prove accessibility.

Separate automated results from
manual inspection findings.

## 9. Readability

Review:

- Text spacing
- Line length
- Font size
- Visual hierarchy
- Contrast
- Content grouping
- Mobile readability
- Clear navigation labels

Preserve the existing WhichAIPick
design system.

Report readability problems with evidence.

Do not redesign pages automatically.

## 10. Severity Classification

P0 — Critical

P1 — High

P2 — Medium

P3 — Low

Each finding must include:

- Page/component
- Problem
- Evidence
- Applicable WCAG criterion,
  when relevant
- Recommended correction

Do not invent defects.

## 11. Reporting

Return:

1. Git branch
2. Tested components
3. Viewports tested
4. Contrast results
5. Keyboard results
6. Semantic HTML findings
7. Interactive component findings
8. Readability findings
9. Test commands and results
10. Outstanding defects
11. Final assessment

Use:

PASS
CONDITIONAL PASS
FAIL
BLOCKED
NOT TESTED

Never report complete WCAG compliance
based only on automated tests.

A successful accessibility audit
does not authorise production deployment.
