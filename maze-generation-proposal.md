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
has all steps forbidden by the forbidden constraints (see below).

## Process for maze generation

- Generate solution path
- Check for shortcuts
- Prepare forbidden data
- Prepare cellSteps data
- Prepare accessFrom data
- Define colour functions
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
can be at step 0. Initially the value is false for every cell in the grid.


## Prepare accessFrom data

We will need to track which non-solution cells are accessible from
which solution-path cells at which step. This mechanism will also track
where each solution cell is in the solution path, but not paths from
previous solution cells.

We will need some functions
backed by one or more data structures. Those data structures need
to be initialised.

`canAccessFrom(r, c)` returns a dict with key/value pairs
`p: sList` where `sList` is a list of steps `s`. This means
there is a path from solution path index `p` to (r,c), arriving at step `s`.
Initially a call to `canAccessFrom(r, c)` will return an empty
dict if (r,c) is not on the solution path, but if (r,c) is on the solution
path at index `p` and step `s` then it will return `{p: [s]}`.
See below for a special case where `p` is -1.

`setAccessFrom(p, r, c, s)` adds `s` to the list of steps in `sList`
for `canAccessFrom(r, c)`, adding a new key `p` if necessary.
It should return true if `s` was new to `sList`,
and false if `s` was already present.
It should throw an error if setting a step whose colour does not match an
existing step for that cell.

As a special case we allow `setAccessFrom(-1, r, c, s)` which means that
we can access (r,c) at step `s` by some as-yet-unknown path. This is to
allow us to just colour a cell without knowing how it might join up with a
path. However, we won't call this directly - it's accessed via a colour
function, defined below.

`removeAccessFrom(p, r, c, s)` removes `s` from the list of steps in `sList`
for `canAccessFrom(r, c)`.
It should return true if `s` was present in `sList`,
and false if `p` doesn't exist, or if `s` was not present in the list for `p`.
This should not leave an empty list; if `sList` is left empty then the
corresponding `p` key should be removed.

`cellSteps(r, c)` returns an array of steps that (r,c) can be at from
anywhere on the solution path. It is the union of every `sList` in
the dict of `canAccessFrom(r, c)`, and may be the empty list. It cannot
be null.


# Define colour functions

`colour(r, c)` returns the colour of (r,c) or null if it is not set to
any colour. It is a convenience function. Internally it should check
that every step `s` for (r,c) has the same colour, and fail with an
assertion error if not. However, logically that should never happen
as we're protected by the error in `setAccessFrom()`.

`setColour(r, c, k)` allows us to set the colour of a cell without yet knowing
what solution path indices it might be accessible from. Internally it
calls `setAccessFrom(-1, r, c, s)` for every step `s` that is colour `k`.

`unsetColour(r, c, k)` simply removes the key/value pair `-1: sList` from
the `canAccessFrom()` dict of (r,c).


## Fill dead-end extensions

Here we are creating misleading paths off the solution path.
They should not introduce any new solutions.

Scan the grid. For each assigned cell (r,c) get the dict
`canAccessFrom(r,c)` and look at each `p` and `s` where `p >= 0`.
(We will treat this dict
as a live view, so any new `p` and `s` entries added while processing
this cell are consumed in the current pass.) Then for each
adjacent unassigned cell (rAdj,cAdj) that is not forbidden for step
`(s + 1) % seqLen` attempt a candidate step `(s + 1) % seqLen` (see below).
If the attempt is successful, set a flag to say that.
If the attempt is not successful record that (rAdj,cAdj) is forbidden
to be step `(s + 1) % seqLen` (true).

If the grid was scanned and at least one attempt at a candidate step
was successful, then repeat the scan. We keep doing this until
a scan produced no successful attempts of a candidate step.
Then we have finished filling dead-end extensions.


## Attempt a candidate step

When we attempt a candidate step `s` at unassigned cell (r,c) and
originating at solution path index `p`
we are calling `attemptCandidateStep(p, r, c, s)`.
This will see if we can allow unassigned (r,c) to be step `s` without
creating a new path to End. It works as follows.

First we
`setAccessFrom(p, r, c, s)` which should return true (check with assert).
We also create an undo list which initially just has the element
[p, r, c, s].

Next we scan the grid. When we find an assigned cell (r0,c0)
we get the `canAccessFrom(r0, c0)` dict and
look at each path index `p0` and each `s0` in the `sList`.
Then for each `p0` and `s0` we look at each assigned cell (rAdj,cAdj) adjacent
to (r0,c0) - the inner loop. We get the colour `colAdj` of cell (rAdj,cAdj).
We set `sAdj` to be `(s0 + 1) % seqLen`.

(Condition 1: It's okay to repeat the solution path exactly okay.)
If (r0,c0) is on the solution path with step `s0` and (rAdj,cAdj) is on the
solution path with step `sAdj` then we continue with the inner loop.

(Condition 2: It's not okay to reach End via a different path.)
If (rAdj,cAdj) is End and `colour(sAdj) == colAdj` then this
candidate step has failed.
We undo using the undo list (see below) and return a flag to say we were unsuccessful.

(Condition 3: It's not okay to join up to our solution path in a new place with
a step that is an accepted part of the solution path.)
If (rAdj,cAdj) is on the solution path as index `pAdj` and `pAdj != p0`
and `sAdj` is the step on solution path index `pAdj`
then the attempt at a candidate step has failed.
We undo using the undo list (see below) and return a flag to say we were unsuccessful.

(Condition 4: It's okay to access another cell.)
If the colour of `sAdj` equals `colAdj` then we `setAccessFrom(p0, rAdj, cAdj, sAdj)`.
If this returns false then we just continue with the inner loop.
If it returns true then we add [p0, rAdj, cAdj, sAdj] to our undo list,
we set a flag to say we've made some progress. Then we continue with the inner loop.
Note that in this case it's okay if (rAdj,cAdj) are on the solution path
because it's possible a dead-path may cross the solution at a different
step without leading to a second solution.

At the end of the grid scan we check to see if we made some progress.
If so, we reset the progress flag and scan again.
If no progress we return from `attemptCandidateStep()` saying
we were successful.

How to undo using the undo list:
For each [pU, rU, cU, sU] in the undo list we call
`removeAccessFrom(pU, rU, cU, sU)`. Each call should return
true - it's a logical error otherwise (use assert).


## Fill remaining cells

For each cell still unassigned after dead-end extension, pick a random
step that's not forbidden. If all steps are forbidden,
assign step −1 (rendered as black).

However, it's currently not clear how we record these cell colours
using `setAccessFrom()` because that requires a path index. We'll come
to that later.

Currently there is a possible problem here.
Dead-end extension only ever tries step (s + 1) % seqLen for a cell adjacent to an
already-assigned cell with canAccessFrom entry {p: [s]}. A step that dead-end extension
never attempted ends up with no forbidden entry. Fill remaining can then freely assign that
step.

Concretely: in [R, B, B], dead-end extension extends a chain from Start (step 0) by always
trying step 1 (the next step). It never tries step 2 on cells adjacent to Start. Fill
remaining could assign step 2 (also blue) to such a cell — the player can still step onto
it — and from there a full second-route might complete.

We will see if this poses a problem in practice.


## Colour the cells

Map each step to `sequence[step]`. Step −1 maps to black (`#000000`).
