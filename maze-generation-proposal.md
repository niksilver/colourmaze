# Design of maze generation

## Assumptions

There will be a sequence of colours, which the user can select from.
For example: red, yellow, blue. However, colours can repeat.
For example: red, yellow, red, blue. Another example: red, yellow,
yellow, yellow.

In order to distinguish these, we will refer to the colour sequence
(e.g. red, yellow, yellow) and the step sequence (e.g. 0, 1, 2).
Note that one step maps to one colour (e.g. 1 -> yellow) but one
colour may map to more than one step (e.g. yellow -> 1 or 2).

We will insist that the first colour in the sequence will not repeat.
This is so that the user can be sure that when they are on
the starting cell they are on the first step of the sequence.

We will also allow grid cells to be a non-sequence colour. I suggest
this is black. We may be forced to use the non-sequence colour just
to ensure a grid has only one solution. We should use this only if
we have to.

## Process for maze generation.

- Generate solution.
- Calculate "cannot" data.
- Generate non-solution paths.
- Fill in extra cells.
- Colour the cells.

Each step is described below.

## Generate solution

Generate a random path from Start to End. This is the solution.

We want to record not just what colour each cell is, but also what step
it is in the sequence. So if the sequence is yellow, red, blue, then the
start cell has colour yellow, but also step 0.

Note that a solution may double back on itself if a cell is visited
for different steps in the solution. Consider the following grid:

| A | B | C |
| - | - | - |
| D | E | F |
| - | - | - |
| G | H | I |

and suppose the colour sequence is 0 yellow (Y), 1 red (R), 2 red (R).
Then we can have a path H, E, B, C, F, E, D that looks like this:

|   | R | Y |
| - | - | - |
| Y | R | R |
| - | - | - |
|   | Y |   |

Here, the path doubles back on cell E. Therefore we must record
cell E as being on steps 1 and 2 in the sequence.

## Calculate "cannot" data

To ensure there is only one solution, we need to calculate which cells cannot
be particular colours, or on particular steps.

First consider End. We note its colour, and we note which step(s) have
this colour. Let's call this S_CELL, the set of steps it might be. Then we
calculate S_BEFORE to be the set of steps which are before each step in
S_CELL. Example: If the colour sequence is 0, 1, 2, 3, 4 and S_CELL is
{0, 2} then S_BEFORE is {4, 1}, because each element S_BEFORE is the step
before an element of S_CELL (wrapping round the sequence). Once we have
S_BEFORE we look at each cell adjacent to End that's not part of the solution.
We record the fact that each of those cells cannot be any of the steps
in S_BEFORE. We also record the fact that we have updated our "cannot"
knowledge of that cell (True).

Next we consider each other cell on the solution path. We note which step
it is, and we calculate which step is before that Let's call it BEFORE.
Then we look at each cell adjecent cell and record that each such cell
cannot be a BEFORE step. If this is new information then we also record
the fact that we have updated our "cannot" knowledge of that cell (True).

At this point we have updated the "cannot" knowledge of every cell adjecent
to the solution.

Now we sweep through every cell on the grid that isn't on the solution path.
Let's call such a current cell C.
We look at what steps cell C "cannot" be, and call that S_CELL. We calculate
S_BEFORE, as above. Then for each cell D adjacent to C we record the fact that
it cannot be any of the steps in S_BEFORE. If our "cannot" knowledge of D
really has changed as a result of this, then we record the fact we have
updated our "cannot" information about cell D (True). Finally we reset the
fact that our "cannot" information about C has updated (False).

We repeat this sweep again and again until the "cannot" information of
every cell C read a False for updated.

# Generate non-solution paths

For each cell that is a step on a path, we generate further non-solution paths
on the grid which extend away from the solution, but which do not lead to the
End cell. Initially, only cells on the solution path will have steps, but that
will change as part of this process.

We must be careful to never add a step into the cell if that cell "cannot"
be that step. We must stop extending that path before we get to that point.

We sweep over the grid, repeating this process again and again, until
we can no longer add steps on the grid.

# Fill in extra cells

Now we sweep over the grid. For every cell that does not have an assigned
step we work out what steps it could have (i.e. steps that not in its
"cannot" list) and assign one randomly. If a cell cannot have any steps
then we assign it the non-step colour step - let's make that -1.

# Colour the cells

Now every cell should have a step, or a non-step colour step (-1). We can
give each cell its corresponding colour.
