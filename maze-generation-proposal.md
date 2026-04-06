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

- Generate solution path
- Check for shortcuts
- Prepare forbidden data
- Prepare accessFrom data
- Fill dead-end extensions
- Fill remaining cells
- Colour the cells

Each step is described below.


## Generate solution path

Generate a random path from Start (bottom-left) to End (top-right) using
a depth-first search (DFS) with backtracking. Each cell is visited at most once.
The path must be at least `2 * (rows + cols)` cells long and
at most `ceil(rows * cols * 0.5)` cells long.

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


## Prepare forbidden data

Create a `forbidden` data structure that says for each cell which step(s)
it cannot be. For example, `forbidden[3][4][2] == true` means cell (3,4)
cannot be at step 2, while `forbidden[3][4][0] == false` means the same cell
can be at step 2. Initially the value is false for every cell in the grid.


## Prepare accessFrom data

We will need to track which non-solution cells are accessible from
which solution-path cells at which step. We will need some functions
backed by one or more data structures. Those data structures need
to be initialised.

`canAccessFrom(r, c)` returns a dict with key/value pairs
`p: sList` where `sList` is a list of steps `s`. This means
there is a path from solution path index `p` to (r,c), arriving at step `s`.
Initially this dict is empty for every (r,c).

`setAccessFrom(p, r, c, s)` adds `s` to the list of steps in `sList`
for `canAccessFrom(r, c)`.
It should return true if `s` was new to `sList`,
and false if `s` was already present.

`removeAccessFrom(p, r, c, s)` removes `s` from the list of steps in `sList`
for `canAccessFrom(r, c)`.
It should return true if `s` was present in `sList`,
and false if `s` was not present.


## Fill dead-end extensions

Here we are creating misleading paths off the solution path.
They should not introduce any new solutions.

Scan the grid. For each assigned cell (r,c) get the dict
`canAccessFrom(r,c)` and look at each `p` and `s`. The for each
adjacent unassigned cell that is not forbidden for step `(s + 1) % seqLen`
attempt a candidate step `(s + 1) % seqLen` (see below).
If the attempt is successful, just note that.
If the attempt is not successful record that the cell is forbidden
to be step `s` (true).

If the grid was scanned and at least one attempt at a candidate step
was successful, then repeat the scan. We keep doing this until
a scan produced no successful attempts of a candidate step.
Then we have finished filling dead-end extensions.


## Attempt a candidate step

When we attempt a candidate step `s` at unassigned cell (r,c) and
originating at solution path index `p`
we are calling `attemptCandidateStep(p, r, c, s)`.
This will see if we can set unassigned (r,c) to be step `s` without leading
to any forbidden steps or creating a new path. It works as follows.

First we set (r,c) to be step `s`.
We also create an undo list which initially just has the element
[p, r, c, s].

Next we scan the grid. When we find an assigned non-solution cell (r,c)
we get the `canAccessFrom(r, c)` dict and
look at each path index `p` and each `s` in the `sList`.
Then for each `p` and `s` we look at each assigned cell (rAdj,cAdj) adjacent
to (r,c) and we get the colour `colAdj` of cell (rAdj,cAdj).
We set `sAdj` to be `(s + 1) % seqLen`.

If (rAdj,cAdj) is on the solution path as index `pAdj` and `pAdj != p`
and `sAdj` is the step on solution path index `p`
then the attempt at a candidate step has failed (because we've learned that
we've joined up to our solution path in a new place).
We undo using the undo list (see below) and return a flag to say we were unsuccessful.

If the colour of `sAdj` equals `colAdj` then we `setAccessFrom(p, rAdj, cAdj, sAdj)`.
If this returns false then we just continue with our next `p` and `s`.
If it returns true then we add [p, rAdj, cAdj, sAdj] to our undo list,
we set a flag to say we've made some progress. Then we continue with
our next `p` and `s`.

At the end of the grid scan we check to see if we made some progress.
If so, we reset the progress flag and scan again.
If no progress we return from `attemptCandidateStep()` saying
we were successful.

How to undo using the undo list:
For each [p, rAdj, cAdj, sAdj] in the undo list we call
`removeAccessFrom(p, rAdj, cAdj, sAdj)`. Each call should return
false - it's a logical error otherwise (use assert).
Then reset (r,c) to be unassigned.


## Fill remaining cells

For each cell still unassigned after dead-end extension, pick a random
step that's not forbidden. If all steps are forbidden,
assign step −1 (rendered as black).

## Colour the cells

Map each step to `sequence[step]`. Step −1 maps to black (`#000000`).
