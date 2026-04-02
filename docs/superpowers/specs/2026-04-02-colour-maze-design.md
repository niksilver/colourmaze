# Colour Maze — Design Spec

**Date:** 2026-04-02

## Overview

A browser-based puzzle game. The player navigates a grid of coloured cells from a start cell to an end cell by moving one orthogonal step at a time. Each step must land on a cell whose colour matches the next colour in a repeating sequence (e.g. red → yellow → blue → red → ...). There is exactly one path from start to end that completes the sequence correctly, but non-path cells can be entered — they simply dead-end. The player must find the correct route.

## Tech Stack

- Plain HTML, CSS, JavaScript — no build step, no framework
- Four files: `index.html`, `style.css`, `generator.js`, `game.js`
- Works by opening `index.html` directly in a browser

## Screens

### Menu Screen

- Title: "COLOUR MAZE"
- **Grid size selector:** pill buttons — 5×5, 7×7, 10×10, 12×12
- **Sequence length selector:** pill buttons — 2, 3, 4, 5
- **Sequence preview:** shows the chosen colour order as coloured squares with arrows, ending "repeats"
- **New Game button:** generates and starts a maze with the chosen settings

Grid size and sequence length are independent settings.

### Game Screen

- **Sequence indicator bar** (top): shows the full repeating sequence as coloured squares; the next required colour is highlighted with a white border and glow
- **Grid** (centre): the maze
- **Menu / New Game buttons** (bottom): Menu returns to settings; New Game regenerates with the same settings

## Visual Style — Dark & Clean

- Background: `#0f0f1a`
- Cell background (unvisited, non-path): `#1e1e2e` with a subtle `#2a2a3e` border
- Coloured cells: flat vivid colours (red `#e63946`, yellow `#f4d35e`, blue `#4cc9f0`, plus additional colours for longer sequences)
- Cells: rounded corners (`border-radius: 4px`), uniform size, small gap between cells
- Current position: bright white border + subtle glow
- Visited trail cells: faded `✓` overlay on the cell colour
- Start cell (S): displays a large regular-weight "S" label; label colour (black or white) chosen by luminance of the cell colour: `luma = 0.299r + 0.587g + 0.114b`, use black if luma > 140 (0–255 scale), white otherwise
- End cell (E): same label contrast rule; green border (`#4ade80`) always, regardless of cell colour

## Grid Layout

- Start: **bottom-left** cell
- End: **top-right** cell
- Grid fills available space; cell size scales to fit

## Game Mechanics

- **Start:** the bottom-left cell is pre-visited; it is coloured `seq[0]` and `currentStep` begins at `1`. The first cell the player must move to must therefore match `seq[1]`
- **Valid move:** click/tap any orthogonally adjacent, unvisited cell whose colour matches `seq[currentStep % seqLength]`; on success `currentStep` increments by 1
- **Invalid move:** silently ignored — nothing happens
- **Non-path cells:** can be entered if their colour matches the current sequence step; they just lead to dead ends
- **Trail:** visited cells show a faded ✓ and cannot be revisited
- **Dead end:** if the player has no valid moves from their current cell, they must use New Game to restart
- **Win:** reaching the top-right cell triggers a "Solved!" overlay with a New Game button
- **No scoring, no timer** — purely a puzzle at the player's own pace

## Maze Generation Algorithm

1. **Generate solution path:** random depth-first walk from bottom-left to top-right, no cell revisited
2. **Colour the path:** assign `seq[i % seqLength]` to `path[i]` for each step along the path
3. **Fill remaining cells:** assign colours from the sequence freely (no adversarial constraint at this stage — non-path cells are allowed to be reachable)
4. **Verify uniqueness:** run a BFS/DFS path-counter from start to end, counting all valid complete paths
5. **Repair:** if more than one complete path exists, identify cells unique to each alternative path and flip one cell per alternative to a colour that breaks it (does not match `seq[expectedStep % seqLength]` for the step at which it would be visited on that alternative path)
6. **Repeat** steps 4–5 until exactly one solution remains

This guarantees a single solution while permitting non-path cells to be visited (dead ends).

## File Structure

```
index.html      — shell, menu screen, game screen markup
style.css       — dark theme, grid layout, cell styles, animations
generator.js    — maze generation (path finding, colouring, uniqueness repair)
game.js         — game state, player movement, win detection, UI transitions
```

## Colour Palette (by sequence length)

| Sequence length | Colours used |
|-----------------|-------------|
| 2 | Red, Blue |
| 3 | Red, Yellow, Blue |
| 4 | Red, Yellow, Blue, Green |
| 5 | Red, Yellow, Blue, Green, Purple |

## Open Questions / Decisions for Implementation

- Minimum path length relative to grid size: the DFS walk should prefer longer paths to make puzzles non-trivial. A minimum path length of `(gridSize * 1.5)` steps is a reasonable starting heuristic.
- Cell size: for 12×12 on small screens, cells may need to shrink. Use CSS grid with `fr` units and cap cell size at a comfortable maximum.
