# Colour Maze — Design Spec

**Date:** 2026-04-02 (last updated 2026-04-04)

## Overview

A browser-based puzzle game. The player navigates a grid of coloured cells from a start cell to an end cell by moving one orthogonal step at a time. Each step must land on a cell whose colour matches the next colour in a repeating sequence (e.g. red → yellow → blue → red → ...). There is exactly one path from start to end that completes the sequence correctly, but non-path cells can be entered — they simply dead-end. The player must find the correct route.

## Tech Stack

- Plain HTML, CSS, JavaScript — no build step, no framework
- Five files: `index.html`, `style.css`, `generator.js`, `generator-worker.js`, `game.js`
- Maze generation runs in a Web Worker (requires serving over HTTP; `file://` does not support Workers)

## Screens

### Menu Screen

- Title: "Colourmaze"
- **Grid size selector:** pill buttons — 5×5, 7×7, 10×10, 12×12
- **Sequence selector:** vertical bordered list of the 7 named sequences; each row shows colour swatches with arrows
- **Sequence preview:** shows the chosen colour order as coloured squares with arrows, ending "repeats"
- **New Game button:** generates and starts a maze with the chosen settings

Grid size and sequence are independent settings.

### Game Screen

- **Sequence indicator bar** (top): shows the full repeating sequence as coloured squares with arrows; the next required colour is highlighted; ends with a "next" label
- **Grid** (centre): the maze
- **Menu / New Game buttons** (bottom): Menu returns to settings; New Game regenerates with the same settings

## Visual Style — Dark & Clean

- Background: `#0f0f1a`
- Cell background (unvisited, non-path): `#1e1e2e` with a subtle `#2a2a3e` border
- Coloured cells: flat vivid colours (red `#e63946`, yellow `#f4d35e`, blue `#4cc9f0`, plus additional colours for longer sequences)
- Cells: rounded corners (`border-radius: 4px`), uniform size, small gap between cells
- Current position: bright white border + subtle glow
- Visited trail cells: faded dot overlay on the cell colour (dot colour chosen by luminance of cell colour for contrast)
- Start cell (S): displays a large regular-weight "S" label; label colour (black or white) chosen by luminance of the cell colour: `luma = 0.299r + 0.587g + 0.114b`, use black if luma > 140 (0–255 scale), white otherwise
- End cell (E): same label contrast rule; green border (`#4ade80`) always, regardless of cell colour

## Grid Layout

- Start: **bottom-left** cell
- End: **top-right** cell
- Cell size scales to fit: target grid width ~380px, max cell 52px, min 24px. Uses `computeCellSize` with `gridTemplateColumns: repeat(N, Npx)`.

## Game Mechanics

- **Start:** the bottom-left cell is pre-visited; it is coloured `seq[0]` and `currentStep` begins at `1`. The first cell the player must move to must match `seq[1 % seqLength]`
- **Valid move:** click/tap any orthogonally adjacent, unvisited cell whose colour matches `seq[currentStep % seqLength]`; on success `currentStep` increments by 1
- **Invalid move:** silently ignored — nothing happens
- **Non-path cells:** can be entered if their colour matches the current sequence step; they just lead to dead ends
- **Trail:** visited cells show a faded dot overlay and cannot be revisited by a forward move
- **Backtrack:** clicking any previously visited cell (other than the current cell) rewinds the path to that cell, restoring `currentPos`, `currentStep`, and `visited` to the state at that point
- **Dead end:** if the player has no valid forward moves, they can backtrack or use New Game
- **Win:** reaching the top-right cell triggers a "Solved!" overlay with a New Game button
- **No scoring, no timer** — purely a puzzle at the player's own pace

## Maze Generation Algorithm

Generation runs in a Web Worker. `generateMaze(rows, cols, sequence)` loops up to 500 attempts:

1. **Generate solution path** (`generateSolutionPath`): random depth-first walk from bottom-left to top-right, each cell visited at most once, minimum length `ceil(rows × cols × 0.4)`. During DFS, candidate cells that would create a colour-shortcut are pruned (see below). A node limit per attempt allows fast retries.

2. **Check for shortcuts** (`hasShortcut`): post-generation safety net. Rejects the path if any two non-consecutive adjacent solution cells i and j satisfy `sequence[(i+1) % seqLen] === sequence[j % seqLen]` (i.e. from cell i the player could jump directly to cell j because j has the right colour for the next step). Uses colour comparison, not step-index, so repeated-colour sequences like [R,B,B] are handled correctly.

3. **Build cannot constraints** (`buildCannot`): for each non-End solution cell at path index i, compute the exit colour `sequence[(i % seqLen + 1) % seqLen]`. Mark every step s where `sequence[s] === exitColour` as forbidden on every adjacent non-solution cell. This ensures the player cannot leave the solution path by moving to a non-solution cell with the right colour — all such cells are constrained away.

4. **Extend steps into dead-ends** (`buildDeadEnds`): repeatedly propagate assigned steps into adjacent unassigned cells where the next step is not forbidden, until no more extensions are possible.

5. **Fill remaining cells** (`fillRemaining`): for each still-unassigned cell, pick a random permitted step. If all steps are forbidden, assign step -1 (rendered black).

6. **Colour cells**: map each step to `sequence[step]`; step -1 maps to `BLACK_COLOUR` (`#000000`).

Combined, steps 2 and 3 guarantee a unique solution: `hasShortcut` prevents sol-to-sol shortcuts; `buildCannot` prevents sol-to-non-sol detours. From every solution cell, the only valid next cell for the player is the next solution cell.

Note: a `propagateCannot` function is also implemented and exported (it spreads cannot constraints transitively through non-solution cells) but is not currently called in the main pipeline.

## File Structure

```
index.html            — shell, menu screen, game screen markup, win overlay
style.css             — dark theme, grid layout, cell styles, sequence bar
generator.js          — maze generation pipeline; exports via self.Generator
generator-worker.js   — thin Web Worker wrapper around generator.js
game.js               — game state, player movement, backtrack, win detection, UI
tests/
  test-generator.js   — Node.js unit tests for all generator functions (node only)
```

## Sequences

Seven named sequences are available, stored as `Generator.SEQUENCES`:

| Index | Sequence |
|-------|---------|
| 0 | Red, Blue |
| 1 | Red, Yellow, Blue |
| 2 | Red, Blue, Blue |
| 3 | Red, Yellow, Blue, Green |
| 4 | Red, Blue, Yellow, Blue |
| 5 | Red, Yellow, Yellow, Blue |
| 6 | Red, Yellow, Blue, Green, Purple |

The first colour in every sequence is unique within that sequence (red never repeats as the first entry), ensuring the start cell unambiguously marks step 0.

## Colour Palette

| Colour | Hex |
|--------|-----|
| Red | `#e63946` |
| Yellow | `#f4d35e` |
| Blue | `#4cc9f0` |
| Green | `#4ade80` |
| Purple | `#c084fc` |
| Black (no-step) | `#000000` |
