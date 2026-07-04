# AI Coaching Hub × MadeHappen AI addon

This repo holds the **Purposefields Coaching Hub** prototype
(`remixed-a377854c (1).tsx`). This note records how it has been integrated with
MadeHappen's AI addon so people can act on their real tasks while receiving
coaching, resilience training, and executive-function support.

## What the integration does

The coaching hub and the task assistant now live behind **one AI Hub**:

- A landing screen offers the **Task Assistant** (natural-language add / edit /
  delete) alongside five coaching spaces — **CBT Coach**, **Action Coach**,
  **Executive Function Coach**, **Reducing the Charge**, and **Clarity Compass**.
- Coaches are **task-aware**: they see the user's current tasks and can capture a
  next step, commitment, or first action straight into the same task list the
  assistant manages — so nothing surfaced in a session gets lost.
- A **live task rail** sits beside every conversation, so the to-do list is
  always in view while being coached.

## Prototype vs. production

| Concern | Prototype (this repo) | Production (MadeHappen / ZTD app) |
| --- | --- | --- |
| Coaching model calls | `fetch` to the Anthropic API from the browser | Server-side via `backend/coaching.py` (`/api/coach`) with the API key held on the server |
| Task store | `window.storage` (`pf_tasks`) | Real per-user tasks in the database |
| Task capture | Exec coach + Task Assistant write to the shared local store | Coaches call a `save_tasks` tool that writes real tasks (respecting the free-tier limit) |
| Crisis safety | Client-side keyword detection + overlay | Detected **server-side** on every turn, returned independent of the model, plus the client overlay |
| UI shell | Screen-switch hub | Full-screen `AIHub` modal replacing the old bottom-right slide-over, with the live task rail, consent gate, and per-coach progress bars |

## Where the production code lives (ZTD repo)

- `backend/coaching.py` — `CoachingService`: five task-aware coaches, the
  `save_tasks` tool, current-task context injection, and server-side crisis
  detection.
- `backend/app.py` — the `/api/coach` route.
- `frontend/src/components/AIHub.js` / `AIHub.css` — the unified hub UI (task
  assistant + coaching), live task rail, consent gate, and crisis overlay.
- `tests/test_coaching.py` — coverage for task capture, the task snapshot, the
  task-aware system prompt, and crisis detection.

## Changes to the prototype in this commit

- Added a shared task store (`TASKS_KEY` / `loadTasks` / `saveTasks`).
- Added a **Task Assistant** screen and surfaced it as the first card on the hub.
- Made the Executive Function Coach also push captured tasks into the shared
  store, so coaching and task management share one list — mirroring the
  production integration.
