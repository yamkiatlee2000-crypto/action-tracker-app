# Meeting Action Tracker

A single-page app for keeping track of the actions agreed in team meetings.

- Add an action with an owner and a due date
- Actions are grouped by owner, each with a tick box for done
- Open, overdue and done counts at the top; overdue actions are highlighted in red
- Hide done actions, delete with undo, owner names auto-suggest

Data is saved in the browser's `localStorage`. It stays on the device and browser where it was entered and is not shared between team members.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole app: markup, styles and script |
| `favicon.svg` | Browser tab icon |
| `vercel.json` | Vercel settings: clean URLs, basic security headers, no stale caching of the page |

There is no build step and no dependencies.

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
