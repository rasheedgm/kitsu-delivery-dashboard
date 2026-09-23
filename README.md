# Delivery Dashboard — Kitsu plugin

A studio-wide "Delivery Command Center" for Kitsu: a **Shots overview** (one
representative task per shot — studio-configurable — driving overdue/not
started/due today/delivered/retake/weekly quota at the shot level), a **Task
overview** with the same numbers at the raw task level, department pipeline,
a task status matrix, and a searchable, filterable delivery queue — all
computed live from your Kitsu data.

Every KPI, donut slice, bar, artist and department cell is a **drill-through**:
click it and the Delivery Queue tab opens pre-filtered to exactly those tasks.
Any filter combination can be **saved as a named view** and clicking a row in
the queue **opens that shot directly in Kitsu**.

Rebuilt from `reference.html` (a static Excel snapshot) into a plugin that reads
the Kitsu API instead of a spreadsheet.

> **Installing on a Docker / Portainer Kitsu?** See
> [INSTALL-PORTAINER.md](INSTALL-PORTAINER.md) for step-by-step instructions.
> The quick version: in the Zou container,
> `cd /opt/zou/zou && /opt/zou/env/bin/zou install-plugin --path https://github.com/rasheedgm/kitsu-delivery-dashboard.git --force`,
> then restart the container.

## How it works

- **Mostly frontend.** The Vue app reads Kitsu's core REST API and computes
  every metric in the browser. The one backend piece is a tiny studio-wide
  **settings table** (see below) — everything else is still just reads.
- **Studio scope.** Adds one sidebar entry. It aggregates across all open
  productions, with an in-UI production filter to narrow to one show.
- Auth is automatic: the plugin runs same-origin inside the Kitsu iframe, so
  Zou's JWT cookie is sent with every request.

## Shots overview vs. Task overview

Kitsu has no separate "shot status" — a shot's status is really one of its
tasks' statuses. This plugin lets a studio say **which** task type that is
(e.g. "Client Delivery"), from **Settings**:

- **Shots overview** (top of the Overview tab) — one row per shot, using that
  configured task type's status (or, until one is configured, each shot's
  chronologically last task as a reasonable default). Drives: Overdue, Not
  started, Due today, Shots in scope, Retake, Delivered (×/total), Weekly
  quota, and the "Shot status" donut. A shot with no task of the configured
  type yet is treated as "not started".
- **Task overview** (further down) — the same shape of numbers, but over
  *every* task on every shot, unfiltered by department. Unaffected by the
  Settings choice.
- **Delivered** and **Retake**, for the Shots overview, can each be overridden
  with an explicit list of task statuses (e.g. if your studio's "Approved"
  status should count as delivered but doesn't have Kitsu's `is_done` flag
  set). Leave both empty to fall back to Kitsu's own `is_done`/`is_retake`
  flags (with a name-contains-"retake" fallback).
- Clicking a Shots-overview number opens the Delivery Queue filtered to
  exactly the tasks behind it (due-date bucket **and** the configured
  department, when one is set).

## Studio-wide settings — the plugin's one backend piece

Checked directly against Zou's plugin system (`zou/app/utils/plugins.py`):
`PluginManifest` persists only `id, name, description, version, maintainer,
website, license, frontend_project_enabled, frontend_studio_enabled, icon` —
**Kitsu has no settings/config framework for plugins at all**. Anything
studio-wide has to be built by the plugin itself, so this one carries its own
table:

- `models.py` — one row, `plugin_delivery_dashboard_settings`
  (`shot_status_task_type_id`, `delivered_status_ids`, `retake_status_ids`).
  Never touches Zou's own tables.
- `resources.py` — `GET /api/plugins/delivery_dashboard/settings` (any
  logged-in user can read it, so everyone's dashboard agrees), `PUT` (admin
  or manager only — `permissions.has_manager_permissions()`).
- Editable from the **Settings** tab in the dashboard itself; read-only for
  everyone else.
- If a studio hasn't upgraded the backend yet (older install, migration not
  run), the frontend catches the failed request and just falls back to the
  defaults — the rest of the dashboard keeps working, only unconfigured.

**Per-user** preferences (saved views, remembered production) still live in
`localStorage`, same as before — no reason to put those in the shared table.

## Interactive features

- **Drill-through everywhere.** KPI cards, the status/quota donuts, the
  delivery-load bars, overdue-severity buckets, artist bars, department rows
  and status-matrix cells all navigate to the Delivery Queue tab filtered to
  exactly what you clicked (`lib/filters.js` + `composables/useDrillThrough.js`).
- **Filterable Delivery Queue.** Search text, due-date bucket (overdue / today
  / tomorrow / this week / any / an exact date), status, department and
  artist — any combination, encoded in the route's hash query
  (`lib/filters.js`).
- **Saved views**, per browser: name the current filter + production and it
  reappears as a chip you can reapply later (`composables/useSavedViews.js`).
- **Click a queue row → opens that shot directly in Kitsu** in a new tab
  (`lib/kitsuLinks.js`); same for a "Today's handoffs" row.
- The production filter is remembered per browser across reloads.

**On "shareable" — read this if you're wiring up links.** Kitsu embeds this
app in an `<iframe>`, so the browser's address bar always shows Kitsu's own
fixed plugin URL (e.g. `.../plugins/delivery_dashboard`) — it never reflects
this app's internal hash route, no matter how the filter changes. Three real
mechanisms exist instead:
- **Copy link** button (Delivery Queue) copies the iframe's own
  `window.location.href` — paste it into a **new browser tab** (not Kitsu's
  address bar) and it reopens that exact filter, same-origin cookie auth and
  all.
- **Saved views** (above) — a named filter + production, restorable with one
  click, entirely within the embedded session.
- **Last-filter memory** — the Delivery Queue remembers your last filter in
  `localStorage` and restores it the next time you land there with no filter
  in the URL, which is what actually makes it "survive a reload" (a real
  browser refresh reloads the iframe at its bare `src`, with no hash at all).

### Data sources (core Kitsu endpoints)

| Data | Endpoint |
| --- | --- |
| Session (login state, admin/manager role, studio name) | `GET /api/auth/authenticated` |
| Open productions | `GET /api/data/projects/open` |
| People (artist names) | `GET /api/data/persons` |
| Task types | `GET /api/data/task-types` |
| Task statuses | `GET /api/data/task-status` |
| Shots + their tasks | `GET /api/data/shots/with-tasks?project_id=:id` |
| This plugin's settings | `GET`/`PUT /api/plugins/delivery_dashboard/settings` |

### Status classification

Derived from Kitsu task-status flags, with a name fallback:

- **Delivered** — `is_done` (or name `done`/`final`/`approved`)
- **Not started** — `is_default` (the "Todo" status)
- **Retake / client retake** — `is_retake` or name contains "retake"
- **WIP** — everything else
- **Overdue** — `due_date` (or `end_date`) is in the past and status is not done

## Requirements

A **self-hosted Kitsu/Zou** instance with the plugin system enabled and CLI
access to the server. Kitsu Cloud does not currently allow custom plugins.

## Install — generic (Zou on a Linux host)

```bash
cd frontend && npm install && npm run build && cd ..   # build frontend/dist first
zou install-plugin --path .                            # folder or .zip
sudo systemctl restart zou
zou list-plugins                                        # should list "delivery_dashboard"
```

Reload Kitsu — **Delivery Dashboard** appears in the studio sidebar.
`zou install-plugin` always runs any pending migrations as part of installing
(fresh install or upgrade alike), so upgrading to a version with new settings
fields is the same one command — no separate migration step.

## Install — Docker (`cgwire/cgwire` all-in-one image)

Container name assumed to be `kitsu`. Run from your host (needs Node + Docker):

```bash
cd frontend && npm run build && cd ..
docker exec kitsu sh -lc 'rm -rf /tmp/delivery_dashboard'
docker cp . kitsu:/tmp/delivery_dashboard
# gunicorn's cwd is /opt/zou/zou, so PLUGIN_FOLDER = /opt/zou/zou/plugins.
# The CLI must install into that same folder:
docker exec kitsu sh -lc 'cd /opt/zou/zou && /opt/zou/env/bin/zou install-plugin --path /tmp/delivery_dashboard --force'
docker restart kitsu
```

Verify: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost/api/plugins/delivery_dashboard/frontend/` → `200`.

**Persistence:** the plugin lives in the container's writable layer. It survives
`docker restart` and host reboots, but is lost if the container is recreated or
the image updated. Re-run [`reinstall.ps1`](reinstall.ps1) after that.

## Local development

```bash
cd frontend
ZOU_URL=http://localhost:5000 npm run dev
```

`npm run dev` proxies `/api` to your local Zou. Open the Vite URL directly; you
need a valid Kitsu session on the same host for `isLoggedIn` to pass.

**Preview without a server:** append `?demo=1` to the URL
(`http://localhost:5173/?demo=1`) to render the dashboard against synthetic
data. Add `&dark_theme=true` to preview the dark palette.

Run the metric unit tests:

```bash
cd frontend
npm test
```

**Changing `models.py`?** Generate a new migration against a real Zou/Postgres
(there's no way to apply/verify one without a running Zou):

```bash
zou migrate-plugin-db --path . --message "describe the change"
```

This only *generates* `migrations/versions/<rev>_....py` — it does **not**
apply it (that only happens as part of `zou install-plugin`, on every install
including upgrades). Commit the generated file, then install to actually run
it and confirm the table looks right.

## Layout

```
manifest.toml            plugin metadata (frontend_studio_enabled = true)
__init__.py              routes ("/settings") + lifecycle hooks
models.py                studio-wide settings, one row (see "Studio-wide settings" above)
resources.py             GET (any user) / PUT (admin or manager) for /settings
migrations/versions/     Alembic migration(s) for models.py
frontend/
  src/
    api/kitsu.js          kitsu-client-js wrapper + typed getters, incl. settings get/put
    composables/
      useDashboardData.js  fetch + normalize all productions into task + shot rows
      useSettings.js       studio-wide settings: load/save, reactive singleton
      useMetrics.js        reactive metric bundle (task-level AND shot-level)
      useDrillThrough.js   navigate to the Delivery Queue with a filter patch
      useSavedViews.js     localStorage CRUD for named saved views
    lib/
      format.js            date math + status classification (unit-tested)
      metrics.js            KPI / bucket / pivot / queue / shot-row computations (unit-tested)
      filters.js            Delivery Queue filter <-> route query <-> chips (unit-tested)
      kitsuLinks.js          deep links into Kitsu's own shot pages
    components/             DonutCard, BarChartCard, SeverityCard, SavedViewsBar, …
    views/                  OverviewView, ProductionView, DeliveryView, SettingsView
```

## Notes / possible follow-ups

- Weekly quota is computed from due dates. Kitsu's native quota endpoints
  (`/data/projects/:id/quotas/...`) could replace this later.
- Very large studios: add a small Python aggregation resource instead of the
  per-production fan-out fetch.
- Assets/edits are out of scope — the dashboard is shot-focused, like the
  original reference.
- The settings table now exists, so a "shared team view" (rather than
  per-browser `localStorage`) or configurable quota targets / risk thresholds
  are a natural next addition to the same table.
- Settings are studio-global; a per-production override (e.g. different shot-
  status task type per show) would need `project_id` added to the settings
  row/lookup.
