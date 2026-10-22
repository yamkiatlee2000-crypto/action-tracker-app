# Meeting Action Tracker

A single-page app for keeping track of the actions agreed in team meetings.

- Add an action with an owner and a due date
- Actions are grouped by owner, each with a tick box for done
- Open, overdue and done counts at the top; overdue actions are highlighted in red
- Hide done actions, delete with undo, owner names auto-suggest

## Data

Actions are stored in Supabase, in the `public.tasks` table of the **Reports Template** project (`ycmvggjeajjrrslmzuwh`). This table is shared with the Reports Template app, so tasks created there show up here and the other way round.

| Tracker field | `tasks` column |
| --- | --- |
| What was agreed | `title` |
| Owner | `owner` (blank shows as "Unassigned") |
| Due date | `deadline` |
| Done tick | `status` = `done` / `todo` (`doing` shows as "In progress"), plus `done_at` |
| Example rows | `is_example` = `true` (removed by "Remove examples") |

New actions get ids starting `ma-`. Changes appear for everyone straight away through Supabase Realtime, and the page also refreshes when the tab regains focus and every 2 minutes.

The page uses the project's **publishable** key, which is designed to sit in browser code. What anyone can do with it is set by the table's row-level security policies. These currently allow anyone with the key to read, add, edit and delete, so anyone with the site link can change the list.

"Hide done" is a per-browser preference kept in `localStorage`. Actions saved by the earlier browser-only version can be uploaded once with the **Upload them** prompt.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole app: markup, styles and script (loads supabase-js from jsDelivr) |
| `favicon.svg` | Browser tab icon |
| `vercel.json` | Vercel settings: clean URLs, basic security headers, no stale caching of the page |

There is no build step. The only dependency is supabase-js, loaded from a CDN.

## Deploy to Vercel

1. Sign in at [vercel.com](https://vercel.com) and choose **Add New → Project**.
2. Import the `action-tracker-app` GitHub repository.
3. Leave the settings as detected:
   - Framework Preset: **Other**
   - Build Command: *(empty)*
   - Output Directory: *(empty, the repo root)*
4. Click **Deploy**.

Every push to `main` redeploys automatically.

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
npx serve .
```
