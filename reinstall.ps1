# Reinstall the Delivery Dashboard plugin into a cgwire/cgwire ("kitsu") container.
#
# Run this after the container is recreated or the image is updated (a plain
# `docker restart` does NOT need it). Requires Node + Docker Desktop.
#
#   powershell -ExecutionPolicy Bypass -File reinstall.ps1

$ErrorActionPreference = 'Stop'
$container = 'kitsu'
$pluginDir = $PSScriptRoot

Write-Host '==> Building frontend...'
Push-Location (Join-Path $pluginDir 'frontend')
npm install --silent
npm run build
Pop-Location

Write-Host '==> Copying plugin into container...'
docker exec $container sh -lc 'rm -rf /tmp/delivery_dashboard'
docker cp "$pluginDir" "${container}:/tmp/delivery_dashboard"

Write-Host '==> Installing plugin (into the folder the running server uses)...'
# gunicorn runs with cwd /opt/zou/zou, so PLUGIN_FOLDER resolves to
# /opt/zou/zou/plugins - the CLI must be run from there too.
docker exec $container sh -lc 'cd /opt/zou/zou && /opt/zou/env/bin/zou install-plugin --path /tmp/delivery_dashboard --force'

Write-Host '==> Restarting Kitsu...'
docker restart $container | Out-Null
Start-Sleep -Seconds 20

Write-Host '==> Verifying...'
docker exec $container sh -lc 'cd /opt/zou/zou && /opt/zou/env/bin/zou list-plugins'
$code = (curl.exe -s -o NUL -w '%{http_code}' http://localhost/api/plugins/delivery_dashboard/frontend/)
Write-Host "frontend HTTP status: $code  (200 = OK)"
Write-Host 'Done. Reload Kitsu in the browser.'
