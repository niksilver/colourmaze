# Design of maze generation

## Assumptions

There will be a sequence of colours, which the user can select from.
For example: red, yellow, blue. However, colours can repeat.
For example: red, blue, blue. Another example: red, yellow, yellow, blue.

In order to distinguish these, we will refer to the colour sequence
(e.g. red, yellow, yellow) and the step sequence (e.g. 0, 1, 2).
Note that one step maps to one colour (e.g. 1 -> yellow) but one
colour may map to more than one step (e.g. yellow -> 1 or 2).

We will insist that the first colour in the sequence will not repeat.
This is so that the user can be sure that when they are on
the starting cell they are on the first step of the sequence.

We will also allow grid cells to be a non-sequence colour. This is
rendered as black. We use the non-sequence colour only when a cell
has all steps forbidden by the cannot constraints (see below).

## Process for maze generation

- Generate solution path.
- Check for shortcuts.
- Calculate "cannot" data.
- Fill dead-end extensions.
- Fill remaining cells.
- Colour the cells.

Each step is described below.

## Generate solution path

Generate a random path from Start (bottom-left) to End (top-right) using
a depth-first search with backtracking. Each cell is visited at most once.
The path must be at least `ceil(rows * cols * 0.4)` cells long.

During DFS, before extending to a candidate cell at path index k, we check
all previously-visited path cells j that are grid-adjacent to the candidate.
If any such pair satisfies:

    sequence[(j + 1) % seqLen] === sequence[k % seqLen]

the candidate is rejected. This means: if from cell j the player could jump
directly to the candidate (because the candidate has the right colour for the
next step after j), we prune that branch. We also check the reverse direction
(k+1 → j). Both comparisons use **colour equality**, not step-index equality,
so that sequences with repeated colours (e.g. [R,B,B]) are handled correctly.

A node-visit cap per DFS attempt allows the outer loop to retry fast.

## Check for shortcuts

After a path is generated, `hasShortcut(path, seqLen, sequence)` performs
a final scan. For every pair of non-consecutive adjacent cells i and j in
the path, it checks whether:

    sequence[(i + 1) % seqLen] === sequence[j % seqLen]

If so, the path is rejected. This is a safety net on top of the pruning.

## Calculate "cannot" data

To ensure there is only one solution, we mark certain steps as forbidden
on non-solution cells adjacent to the solution path.

For each non-End solution cell at path index i:

1. Compute the **exit colour**: `sequence[(i % seqLen + 1) % seqLen]`.
   This is the colour the player needs to leave this cell.
2. Find **all steps** s where `sequence[s] === exitColour`.
3. Mark all those steps as forbidden on every adjacent non-solution cell.

The End cell is excluded from this rule (there is no "next step" to leave it).

**Why this works:** From any solution cell, the only adjacent cell with the
exit colour is the next solution cell (the path pruning during generation
prevents two non-consecutive solution cells from sharing a shortcut colour).
Marking the exit colour forbidden on adjacent non-solution cells means the
player cannot leave the solution path — from every solution cell, the only
valid next move is to the next solution cell.

A `propagateCannot` function exists that spreads these constraints
transitively through non-solution cells (if cell C cannot be step t, then
adjacent cells cannot be step t−1). It is implemented and exported but is
not currently called in the main generation pipeline; the exit-colour
constraints plus dead-end extension are sufficient in practice.

## Fill dead-end extensions

Repeatedly scan the grid. For each assigned cell (step s), if an adjacent
unassigned cell is not forbidden for step `(s + 1) % seqLen`, assign it
that step. Repeat until no more assignments can be made.

This "grows" the solution cells outward into branches, creating dead-end
paths for the player to explore.

## Fill remaining cells

For each cell still unassigned after dead-end extension, pick a random
permitted step (one not in its "cannot" list). If all steps are forbidden,
assign step −1 (rendered as black).

## Colour the cells

Map each step to `sequence[step]`. Step −1 maps to black (`#000000`).
