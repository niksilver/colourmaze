# Confirm the problem

First let's confirm the problem. Write the following test.

Start with a 2x2 grid using sequence [R,B,B] that looks like this:

B R
B .

The partial solution path is (1,0) step 1 -> (0,0) step 2 -> (0,1) step 3.

If we run buildCannot() we should find that cell (1,1) cannot have steps 0 or 2.

If we run expandDeadEndsOnce() we should find that cell (1,1) has been given
step 1, which is colour B.

However, this is a problem because now we have a second solution path
(1,0) step 1 -> (1,1) step 2 -> (0,1) step 3. The test should identify this
second solution path and fail.

# Fixing the problem

Function tryExtendFromCell() needs updated logic. For each direction from
the given cell it should identify the new cell and next step, and do this:
- If the new cell is off the grid, continue.
- If the new cell is already set as the next step, continue.
- If the new cell is null and it "cannot" be the next step then continue.
- If the new cell is null and it's okay to be the next step (i.e. not "cannot") then
  give that cell the next step, set changed = true, and continue.
- Now the new cell must already be some step that's not the next step.
  Let's call its colour current_col.
  Let's call the colour of the next step next_col.
- If current_col != next_col continue.
- If current_col == next_col and the new cell "cannot" be the next step then
  say the new cell "cannot" be its current step value,
  change the step of the new cell to null, 
  set changed = true, and continue.
- If all the above fails, just continue.

We need to use the TDD approach, so write tests before implementing the updated
tryExtendFromCell() logic.
