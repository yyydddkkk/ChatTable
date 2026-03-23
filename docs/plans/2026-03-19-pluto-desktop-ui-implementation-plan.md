# Pluto Desktop UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first Pluto desktop web UI pass with a “night companion” social-chat aesthetic while leaving unimplemented backend features as explicit placeholders.

**Architecture:** Keep the existing frontend data flow and stores, but reshape the experience around a desktop three-column chat workspace: session rail, conversation canvas, and companion insights panel. Use the current API and WebSocket contracts where they already exist, and surface future backend needs through static placeholder modules and handoff notes.

**Tech Stack:** React 19, TypeScript, Vite, Zustand, Tailwind CSS v4, Lucide React

---

### Task 1: Establish the Pluto visual system

**Files:**
- Modify: `frontend/src/index.css`

**Step 1: Write the failing test**

No automated frontend test harness exists in this repository. Use type-check and lint as the verification boundary for this visual refactor.

**Step 2: Run verification to confirm the current baseline is not clean**

Run: `npm.cmd run lint --prefix '.worktrees/pluto-desktop-ui/frontend'`
Expected: FAIL because the current frontend already has React Hooks and static-component lint errors.

**Step 3: Write the minimal implementation**

- Replace the current warm beige palette with a Pluto night palette.
- Add reusable surface classes for glass panels, elevated cards, orbit badges, and responsive desktop spacing.
- Keep compatibility variables such as `--color-primary`, `--color-surface`, and `--color-text`.

**Step 4: Run verification**

Run: `node .worktrees/pluto-desktop-ui/frontend/node_modules/typescript/bin/tsc -p .worktrees/pluto-desktop-ui/frontend/tsconfig.app.json --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add .worktrees/pluto-desktop-ui/frontend/src/index.css
git commit -m "feat: add pluto desktop visual system"
```

### Task 2: Rebuild the app shell and workspace framing

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/MainLayout.tsx`
- Create: `frontend/src/components/AgentAvatar.tsx`
- Create: `frontend/src/components/ConversationInsightsPanel.tsx`
- Modify: `frontend/src/components/GroupAvatar.tsx`

**Step 1: Write the failing test**

No frontend test runner exists. Use lint to prove the existing shell has problems and type-check to validate the refactor.

**Step 2: Run verification to confirm the current baseline fails**

Run: `npm.cmd run lint --prefix '.worktrees/pluto-desktop-ui/frontend'`
Expected: FAIL due to `App.tsx` synchronous state-in-effect and dynamic component warnings.

**Step 3: Write the minimal implementation**

- Key the authenticated workspace by `tenantId` so the app resets on tenant changes without synchronous effect state resets.
- Default the main view to chat.
- Redesign the left navigation into a Pluto desktop shell with brand, workspace identity, and compact navigation.
- Add a reusable `AgentAvatar` component and use it anywhere avatars are displayed.
- Add a persistent right-side companion insights panel for chat view placeholders.

**Step 4: Run verification**

Run: `npm.cmd run lint --prefix '.worktrees/pluto-desktop-ui/frontend'`
Expected: Fewer errors than baseline and no `App.tsx` or avatar static-component errors.

**Step 5: Commit**

```bash
git add .worktrees/pluto-desktop-ui/frontend/src/App.tsx .worktrees/pluto-desktop-ui/frontend/src/components/MainLayout.tsx .worktrees/pluto-desktop-ui/frontend/src/components/AgentAvatar.tsx .worktrees/pluto-desktop-ui/frontend/src/components/ConversationInsightsPanel.tsx .worktrees/pluto-desktop-ui/frontend/src/components/GroupAvatar.tsx
git commit -m "feat: add pluto desktop workspace shell"
```

### Task 3: Redesign the chat workflow

**Files:**
- Modify: `frontend/src/components/SessionList.tsx`
- Modify: `frontend/src/components/ChatHeader.tsx`
- Modify: `frontend/src/components/ChatArea.tsx`
- Modify: `frontend/src/components/MessageInput.tsx`
- Modify: `frontend/src/pages/ChatPage.tsx`

**Step 1: Write the failing test**

No automated UI tests exist; use lint and type-check instead.

**Step 2: Run verification to confirm the current baseline fails**

Run: `npm.cmd run lint --prefix '.worktrees/pluto-desktop-ui/frontend'`
Expected: FAIL because `ChatPage.tsx`, `ChatArea.tsx`, and `SessionList.tsx` currently trigger lint errors.

**Step 3: Write the minimal implementation**

- Rebuild the session rail into grouped conversation sections with search, unread, and status visuals.
- Rebuild the chat header around identity, online status, and quick actions.
- Restyle the message canvas and composer to match Pluto’s “night companion” look.
- Keep existing WebSocket behavior intact.
- Keep missing capabilities as disabled or “coming soon” UI affordances instead of hidden holes.

**Step 4: Run verification**

Run: `npm.cmd run lint --prefix '.worktrees/pluto-desktop-ui/frontend'`
Expected: PASS for touched chat files.

**Step 5: Commit**

```bash
git add .worktrees/pluto-desktop-ui/frontend/src/components/SessionList.tsx .worktrees/pluto-desktop-ui/frontend/src/components/ChatHeader.tsx .worktrees/pluto-desktop-ui/frontend/src/components/ChatArea.tsx .worktrees/pluto-desktop-ui/frontend/src/components/MessageInput.tsx .worktrees/pluto-desktop-ui/frontend/src/pages/ChatPage.tsx
git commit -m "feat: redesign pluto chat workspace"
```

### Task 4: Redesign secondary desktop pages

**Files:**
- Modify: `frontend/src/pages/ContactsPage.tsx`
- Modify: `frontend/src/pages/SettingsPage.tsx`

**Step 1: Write the failing test**

No automated page tests exist in this frontend.

**Step 2: Run verification**

Run: `node .worktrees/pluto-desktop-ui/frontend/node_modules/typescript/bin/tsc -p .worktrees/pluto-desktop-ui/frontend/tsconfig.app.json --noEmit`
Expected: PASS before the page redesign starts.

**Step 3: Write the minimal implementation**

- Turn Contacts into an “Agent Lounge” page with richer cards, activity framing, and cleaner CTAs.
- Turn Settings into a desktop control center with provider management plus placeholder cards for future capabilities.
- Preserve existing actions where backend support already exists.

**Step 4: Run verification**

Run: `npm.cmd run lint --prefix '.worktrees/pluto-desktop-ui/frontend'`
Expected: PASS

**Step 5: Commit**

```bash
git add .worktrees/pluto-desktop-ui/frontend/src/pages/ContactsPage.tsx .worktrees/pluto-desktop-ui/frontend/src/pages/SettingsPage.tsx
git commit -m "feat: redesign pluto secondary pages"
```

### Task 5: Final verification and backend handoff notes

**Files:**
- Modify: `docs/plans/2026-03-19-pluto-desktop-ui-implementation-plan.md`

**Step 1: Write the failing test**

Use the build command as the final integration check.

**Step 2: Run verification to confirm environment limitations if they still exist**

Run: `npm.cmd run build --prefix '.worktrees/pluto-desktop-ui/frontend'`
Expected: May fail inside sandbox because Vite/esbuild spawns subprocesses.

**Step 3: Write the minimal implementation**

Add a final handoff section describing UI placeholders that still require backend support:

- conversation search
- unread counts and online presence
- relationship summaries and memory cards
- message actions beyond send/clear/help
- attachment and voice capabilities
- workspace notifications and themes

**Step 4: Run verification**

Run:
- `npm.cmd run lint --prefix '.worktrees/pluto-desktop-ui/frontend'`
- `node .worktrees/pluto-desktop-ui/frontend/node_modules/typescript/bin/tsc -p .worktrees/pluto-desktop-ui/frontend/tsconfig.app.json --noEmit`
- `npm.cmd run build --prefix '.worktrees/pluto-desktop-ui/frontend'` (rerun escalated if sandbox blocks `esbuild`)

Expected:
- Lint PASS
- Type-check PASS
- Build PASS or documented sandbox limitation resolved with escalation

**Step 5: Commit**

```bash
git add .worktrees/pluto-desktop-ui/docs/plans/2026-03-19-pluto-desktop-ui-implementation-plan.md
git commit -m "docs: add pluto desktop ui handoff notes"
```

## Backend Handoff Notes

The desktop UI intentionally includes placeholder modules that are visually present before backend support exists. Back-end work can target these contracts later without blocking the UI rollout:

- **Companion insights panel**
  - relationship level
  - memory summary
  - shared topics
  - recent active time
- **Conversation rail enrichments**
  - unread count
  - message preview
  - online state
  - pin/archive sections
- **Composer extensions**
  - attachments
  - voice note
  - slash action catalog
- **Workspace controls**
  - notification settings
  - themes
  - saved prompts
  - model presets
