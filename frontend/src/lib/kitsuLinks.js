// Deep links into Kitsu's own web app. Route shapes confirmed against the
// bundled Kitsu frontend (productions/:production_id/shots/:shot_id).
// The plugin iframe is served from the same origin, so a root-relative path
// resolves correctly without knowing the host.

export function shotUrl(projectId, shotId) {
  if (!projectId || !shotId) return null
  return `/productions/${projectId}/shots/${shotId}`
}

export function openShot(projectId, shotId) {
  const url = shotUrl(projectId, shotId)
  if (url) window.open(url, '_blank', 'noopener')
}
