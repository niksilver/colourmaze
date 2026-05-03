# Help Overlay — Design Spec

**Date:** 2026-05-03

## Overview

A "?" button on the menu screen opens a modal overlay explaining the puzzle to first-time players. Dismissed by a "Got it" button.

## Button Placement

A "?" button sits at the right end of the title row. The title row uses `display: flex; justify-content: space-between` with a matching invisible spacer on the left to keep the "Colourmaze" title centred. The button matches `.btn-secondary` exactly: `background: #1e1e2e`, `border: 1px solid #888`, `color: #eee`, `border-radius: 8px`, `padding: 8px 14px`, `font-size: 13px`, uppercase.

## Modal

Uses the existing overlay pattern (`position: fixed; inset: 0; background: rgba(0,0,0,0.75)`), consistent with the win and dead-end overlays already in the game. The overlay box matches the existing `overlay-box` style: `background: #1e1e2e`, `border: 1px solid #444`, `border-radius: 12px`, `padding: 32px 36px`.

### Content

**Title:** "How to Play" (uppercase, `font-size: 20px`, `letter-spacing: 2px`)

**Body:**

> Navigate a grid of coloured cells from the **Start** cell (S) to the **End** cell (E).
>
> - Cells must be visited in colour order — for example, Red → Yellow → Blue → Red → …
> - You can only move one step at a time: up, down, left, or right.
> - Some paths are dead ends. Tap any cell you've already visited to backtrack.
> - Tap **Another** to generate another maze of the same type.
>
> Choose your grid size and colour sequence, then tap **New Game** to start.

Body text: `font-size: 14px`, `color: #ccc`, `line-height: 1.6`. Key words bolded in `#fff`.

### Dismiss Button

Label: "Got it". Matches `.btn-secondary` exactly: `background: #1e1e2e`, `color: #eee`, `border: 1px solid #888`, `border-radius: 8px`, `padding: 10px`, `font-size: 13px`, uppercase.

## Behaviour

- Clicking "?" adds `active` class to the overlay (`display: flex`).
- Clicking "Got it" removes `active` class.
- The overlay does not need to close on backdrop click (consistent with the dead-end overlay).

## Files Changed

| File | Change |
|------|--------|
| `index.html` | Add "?" button in title row; add help overlay markup |
| `style.css` | Add `.help-btn` rule for the "?" button |
| `game.js` | Wire up click handlers for "?" and "Got it" in `initMenu()` |
