# Installing the Delivery Dashboard plugin on Kitsu (Portainer / Docker)

This plugin ships with its frontend already built (`frontend/dist/` is
committed), so the Kitsu server needs **no Node / build tools** — just
`zou install-plugin` and a restart. It also carries one small database table
(studio-wide settings); `zou install-plugin` applies that migration
automatically on every install, including upgrades — no separate step.

Repo: `https://github.com/rasheedgm/kitsu-delivery-dashboard.git`

> Requires a **self-hosted** Kitsu whose Zou has the plugin system
> (`zou install-plugin` exists — Zou ≥ 1.x). Kitsu Cloud can't install custom
> plugins. Installing changes files inside the container and needs a restart;
> do it during a maintenance window (~30–60 s downtime).

---

## 1. Find the Zou container

In Portainer → **Containers**:

- **One** container from image `cgwire/cgwire` → all-in-one image. That's your target.
- **Several** containers (`zou`, `zou-events`, `kitsu`, `kitsu-db`, `redis`, …) →
  it's the multi-service stack. Your target is the **API** one — usually named
  `zou` or `*-zou-app` (runs `gunicorn ... zou.app:app`).

Open that container → **Console** → Command `/bin/sh` → **Connect**.

---

## 2. Locate the `zou` CLI and its plugin folder

Paste into the console:

```sh
# path to the zou CLI
command -v zou || ls /opt/zou/env/bin/zou

# working directory of the running API (where Zou looks for plugins)
readlink /proc/$(pgrep -f 'zou.app:app' | head -1)/cwd

# confirm git is available (needed to install from the repo URL)
git --version
```

Note the two paths. In the commands below:

| placeholder | typical value (`cgwire/cgwire` image) |
| --- | --- |
| `ZOU`  | `/opt/zou/env/bin/zou` |
| `CWD`  | `/opt/zou/zou` |

The `cd CWD` matters: Zou resolves its plugin folder relative to the API
process's working directory, and the CLI must install into that same place.

If `git --version` fails, use the **zip fallback** in section 6.

---

## 3. Install the plugin (from the public repo)

In the container console:

```sh
cd CWD && ZOU install-plugin --path https://github.com/rasheedgm/kitsu-delivery-dashboard.git --force
```

Expected output ends with:

```
[Plugins] Routes added by delivery_dashboard:
  - /plugins/delivery_dashboard/frontend
  - /plugins/delivery_dashboard/frontend/<path:filename>
✅ [Plugins] Plugin delivery_dashboard installed. Restart the server to apply changes.
```

---

## 4. Restart Zou

Portainer → the Zou/API container → **Restart**.
Multi-service stack: also restart `zou-events` if present. (A stack **Redeploy**
works too but isn't required.)

---

## 5. Verify

Back in the container console:

```sh
cd CWD && ZOU list-plugins
```

`delivery_dashboard` should be listed. Then from any machine:

```
http://<your-kitsu-host>/api/plugins/delivery_dashboard/frontend/
```

should return HTML (not a JSON error). Finally, reload Kitsu in the browser and
hard-refresh (Ctrl/Cmd+Shift+R) — **Dashboard** (or **Delivery Dashboard**)
appears in the left sidebar.

---

## 6. Fallback: install from a zip (no git in the container)

Every tagged release attaches a ready `delivery_dashboard-<version>.zip`. Grab
the download link for the current version from
<https://github.com/rasheedgm/kitsu-delivery-dashboard/releases/latest>, then
if the container has outbound internet (example uses v0.3.1 — check the
releases page for the current filename):

```sh
cd /tmp && wget -O dd.zip "https://github.com/rasheedgm/kitsu-delivery-dashboard/releases/download/v0.3.1/delivery_dashboard-0.3.1.zip"
cd CWD && ZOU install-plugin --path /tmp/dd.zip --force
```

If you can only reach the container via Portainer's console and have no URL to
`wget`, put the zip on a NAS folder that is already bind-mounted into the
container and point `--path` at that in-container path instead.

---

## 7. Make it survive stack updates (recommended)

The plugin installs into the container's writable layer. It survives a plain
**restart** and host reboots, but a **stack redeploy or image update wipes it**.

To make it durable, add a named volume for the plugin folder to the Zou service
in your stack YAML (Portainer → **Stacks** → your stack → **Editor**):

```yaml
services:
  zou:                       # <- your API service name
    # ...
    volumes:
      - kitsu_plugins:/opt/zou/zou/plugins   # match CWD/plugins from step 2

volumes:
  kitsu_plugins:
```

**Update the stack once**, then run the install (step 3) again. After that the
plugin persists across redeploys — only an explicit `install-plugin --force`
re-run is needed when you want a newer version.

---

## 8. Updating to a new version

```sh
cd CWD && ZOU install-plugin --path https://github.com/rasheedgm/kitsu-delivery-dashboard.git --force
```

then restart the container (step 4).

## 9. Uninstalling

```sh
cd CWD && ZOU uninstall-plugin --id delivery_dashboard
```

then restart. `uninstall-plugin` runs the migration's `downgrade()` automatically, which drops `plugin_delivery_dashboard_settings` — nothing manual to clean up.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `zou: not found` | Use the full path from step 2, e.g. `/opt/zou/env/bin/zou`. |
| `install-plugin` not a known command | Zou is too old — upgrade Kitsu to a version with the plugin system. |
| `git is not available` | Use the zip fallback (section 6). |
| Sidebar entry missing after restart | Check the container logs for `[Plugins]` errors; confirm `list-plugins` shows it; confirm you installed from `cd CWD` (right plugin folder). |
| Plugin page is blank / 404 on `assets/*` | You installed an old build. Re-run step 3 with `--force` and restart. |
| Plugin page shows "Failed to load: …" | The message names the failing Kitsu endpoint — open an issue with that text. |
| Plugin gone after a stack redeploy | Expected without the volume — do section 7. |
