# Delivery Dashboard — Kitsu plugin

A studio-wide "Delivery Command Center" for Kitsu: overdue deliveries, weekly
quota, delivery load, overdue severity, today's handoffs, per-artist pressure,
department pipeline, a task status matrix and a searchable, filterable delivery
queue — all computed live from your Kitsu data.

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

- **Frontend-only.** No new API routes, no database tables, no migrations. The
  Vue app reads Kitsu's core REST API and computes every metric in the browser.
- **Studio scope.** Adds one sidebar entry. It aggregates across all open
  productions, with an in-UI production filter to narrow to one show.
- Auth is automatic: the plugin runs same-origin inside the Kitsu iframe, so
  Zou's JWT cookie is sent with every request.

## Interactive features

- **Drill-through everywhere.** KPI cards, the status/quota donuts, the
  delivery-load bars, overdue-severity buckets, artist bars, department rows
  and status-matrix cells all navigate to the Delivery Queue tab filtered to
  exactly what you clicked (`lib/filters.js` + `composables/useDrillThrough.js`).
- **Filterable Delivery Queue.** Search text, due-date bucket (overdue / today
  / tomorrow / this week / any / an exact date), status, department and
  artist — any combination, encoded in the URL's hash query so it's
  shareable/bookmarkable and survives a reload.
- **Saved views**, per browser: name the current filter + production and it
  reappears as a chip you can reapply later (`composables/useSavedViews.js`).
- **Click a queue row → opens that shot directly in Kitsu** in a new tab
  (`lib/kitsuLinks.js`); same for a "Today's handoffs" row.
- The production filter is remembered per browser across reloads.

### Kitsu has no plugin-settings framework — how this plugin handles that

Checked directly against Zou's plugin system (`zou/app/utils/plugins.py`):
`PluginManifest` persists only `id, name, description, version, maintainer,
website, license, frontend_project_enabled, frontend_studio_enabled, icon` —
no settings schema, no admin-UI slot, no per-plugin key/value store. Anything
configurable has to be built by the plugin itself:

- **Per-user preferences** (saved views, remembered production) live in
  `localStorage` — free, no backend, but not shared across a studio's machines.
- **Studio-wide shared settings** (e.g. custom quota targets, which task types
  count toward a department) would need the plugin to stop being frontend-only:
  add `models.py` + `resources.py` + an Alembic migration, `zou
  migrate-plugin-db`, and an admin-only write endpoint. Not implemented yet —
  the current status/overdue/quota rules are derived entirely from Kitsu's own
  task-status flags (`is_done`/`is_retake`/`is_default`), so there's nothing to
  configure until a studio needs to override that logic.

### Data sources (core Kitsu endpoints)

| Data | Endpoint |
| --- | --- |
| Studio name (page heading) | `GET /api/data/organisations` → `[0].name` |
| Open productions | `GET /api/data/projects/open` |
| People (artist names) | `GET /api/data/persons` |
| Task types | `GET /api/data/task-types` |
| Task statuses | `GET /api/data/task-status` |
| Shots + their tasks | `GET /api/data/shots/with-tasks?project_id=:id` |

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

## Layout

```
manifest.toml            plugin metadata (frontend_studio_enabled = true)
__init__.py              empty routes + lifecycle hooks (frontend-only plugin)
frontend/
  src/
    api/kitsu.js          kitsu-client-js wrapper + typed getters
    composables/
      useDashboardData.js  fetch + normalize all productions into task rows
      useMetrics.js        reactive metric bundle bound to the production filter
      useDrillThrough.js   navigate to the Delivery Queue with a filter patch
      useSavedViews.js     localStorage CRUD for named saved views
    lib/
      format.js            date math + status classification (unit-tested)
      metrics.js            all KPI / bucket / pivot / queue computations (unit-tested)
      filters.js            Delivery Queue filter <-> route query <-> chips (unit-tested)
      kitsuLinks.js          deep links into Kitsu's own shot pages
    components/             DonutCard, BarChartCard, SeverityCard, SavedViewsBar, …
    views/                  OverviewView, ProductionView, DeliveryView
```

## Notes / possible follow-ups

- Weekly quota is computed from due dates. Kitsu's native quota endpoints
  (`/data/projects/:id/quotas/...`) could replace this later.
- Very large studios: add a small Python aggregation resource instead of the
  per-production fan-out fetch.
- Assets/edits are out of scope — the dashboard is shot-focused, like the
  original reference.
- Shared, studio-wide settings (quota targets, custom risk thresholds) need a
  small plugin backend — see "Kitsu has no plugin-settings framework" above.
- Saved views are per-browser only; a "shared team view" would need the same
  backend as above.
