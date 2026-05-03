# Help Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "?" button to the menu screen that opens a modal overlay explaining how to play.

**Architecture:** Three small changes to three existing files. The overlay uses the same `active`-class pattern as the existing win overlay. The "?" button sits in a new `.title-row` wrapper that keeps the title centred using `position: relative` / `position: absolute`.

**Tech Stack:** Plain HTML, CSS, JavaScript — no build step.

**Status:** Complete

---

## File Map

| File | Change |
|------|--------|
| `index.html` | Wrap `<h1>` in `.title-row` div; add "?" button; add `#help-overlay` markup |
| `style.css` | Add `.title-row` and `.help-btn` rules; add `.help-overlay-title` font-size override |
| `game.js` | Add two click handlers in `initMenu()` |

---

## Task 1: HTML — Title Row and Help Overlay Markup

**Files:**
- Modify: `index.html`

No unit tests — verify visually in the browser after each step. Serve with `python -m http.server 8000` and open `index.html`.

- [ ] **Step 1: Wrap the title in a `.title-row` div and add the "?" button**

  In `index.html`, the menu screen currently opens with:

  ```html
  <h1 class="title">Colourmaze</h1>
  ```

  Replace that single line with:

  ```html
  <div class="title-row">
    <h1 class="title">Colourmaze</h1>
    <button class="help-btn" id="help-btn">?</button>
  </div>
  ```

- [ ] **Step 2: Add the help overlay markup**

  In `index.html`, after the closing `</div>` of the win overlay (before the `<script>` tags), add:

  ```html
  <!-- ── Help overlay ───────────────────────────────────── -->
  <div class="overlay" id="help-overlay">
    <div class="overlay-box">
      <div class="overlay-title help-overlay-title">How to Play</div>
      <div class="help-body">
        <p>Navigate a grid of coloured cells from the <strong>Start</strong> cell (S) to the <strong>End</strong> cell (E).</p>
        <ul>
          <li>Cells must be visited in colour order — for example, Red → Yellow → Blue → Red → …</li>
          <li>You can only move one step at a time: up, down, left, or right.</li>
          <li>Some paths are dead ends. Tap any cell you've already visited to backtrack.</li>
          <li>Tap <strong>Another</strong> to generate another maze of the same type.</li>
        </ul>
        <p>Choose your grid size and colour sequence, then tap <strong>New Game</strong> to start.</p>
      </div>
      <button class="btn btn-secondary" id="help-close-btn">Got it</button>
    </div>
  </div>
  ```

  Note: `btn btn-secondary` is reused here directly. The `.btn` class sets `width: 100%` which is correct inside the overlay box. The `btn-secondary` variant already provides the right colours (`#eee` text, `#888` border). No new CSS needed for this button.

- [ ] **Step 3: Verify in browser**

  Load `index.html`. The menu should display with the "Colourmaze" title still centred (CSS comes next, so the layout may look off at this point — that's expected). No console errors.

- [ ] **Step 4: Commit**

  ```bash
  git add index.html
  git commit -m "feat: add help button and overlay markup"
  ```

---

## Task 2: CSS — Title Row and Help Button

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Add `.title-row` and `.help-btn` rules**

  In `style.css`, after the existing `/* ── Title ── */` block (after line 23), add:

  ```css
  /* ── Title row (title + help button) ──────────────────── */
  .title-row {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .help-btn {
    position: absolute;
    right: 0;
    padding: 8px 14px;
    background: #1e1e2e;
    border: 1px solid #888;
    border-radius: 8px;
    color: #eee;
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
    letter-spacing: 1px;
    text-transform: uppercase;
    transition: opacity 0.15s;
  }
  .help-btn:hover { opacity: 0.85; }
  ```

  The `position: absolute; right: 0` takes the button out of flow so it doesn't shift the centred title. The title fills the row and centres its text within it naturally.

- [ ] **Step 2: Add `.help-overlay-title` font-size override**

  The existing `.overlay-title` rule uses `font-size: 32px` (right for the one-word "Solved!" overlay). The help overlay has more text content, so it needs a smaller title. After the existing `.overlay-title` rule, add:

  ```css
  .help-overlay-title { font-size: 20px; }
  ```

- [ ] **Step 3: Add `.help-body` styles**

  After `.help-overlay-title`, add:

  ```css
  .help-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 14px;
    line-height: 1.6;
    color: #ccc;
    text-align: left;
  }
  .help-body ul {
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .help-body strong { color: #fff; }
  ```

- [ ] **Step 4: Verify in browser**

  Load `index.html`. Check:
  - "Colourmaze" title is horizontally centred.
  - "?" button appears at the right end of the title row, styled like a secondary button.
  - The help overlay is not visible (it has no `active` class yet).

- [ ] **Step 5: Commit**

  ```bash
  git add style.css
  git commit -m "feat: add title-row, help-btn, and help-body CSS"
  ```

---

## Task 3: JS — Wire Up Click Handlers

**Files:**
- Modify: `game.js`

- [ ] **Step 1: Add the two handlers inside `initMenu()`**

  In `game.js`, inside `initMenu()` (around line 294), alongside the other `addEventListener` calls, add:

  ```javascript
  document.getElementById('help-btn').addEventListener('click', function () {
    document.getElementById('help-overlay').classList.add('active');
  });
  document.getElementById('help-close-btn').addEventListener('click', function () {
    document.getElementById('help-overlay').classList.remove('active');
  });
  ```

- [ ] **Step 2: Verify in browser**

  Load `index.html`. Check:
  - Clicking "?" opens the help overlay with the dark backdrop.
  - The "How to Play" title, body text, and "Got it" button are all visible and readable.
  - Clicking "Got it" closes the overlay.
  - The overlay does not reopen on its own and does not interfere with "New Game".
  - Navigate to the game screen and back — the "?" button still works on return to menu.

- [ ] **Step 3: Commit**

  ```bash
  git add game.js
  git commit -m "feat: wire up help overlay open/close handlers"
  ```

---

## Task 4: Run Tests and Final Check

**Files:** none

- [ ] **Step 1: Run the test suite**

  ```bash
  node tests/test-generator.js
  ```

  Expected: all tests pass, 0 failed. (The help overlay adds no generator logic, so this is a regression check only.)

- [ ] **Step 2: Run the URL tests**

  ```bash
  node tests/test-url.js
  ```

  Expected: all tests pass, 0 failed.

- [ ] **Step 3: Full browser check**

  With the local server running (`python -m http.server 8000`):
  - Menu screen shows "?" button to the right of the centred title.
  - "?" opens the overlay; "Got it" closes it.
  - All existing features still work: grid size and sequence selectors, New Game, the game itself, win overlay, Another button, URL sharing via hash.
