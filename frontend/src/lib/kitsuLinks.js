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

// Square thumbnail for a task's latest preview (task.last_preview_file_id).
// Same-origin + cookie auth, so a plain <img src> works exactly like it does
// in Kitsu's own UI — no fetch/blob dance needed. Returns null when the task
// has no preview yet; callers should fall back to a placeholder.
export function previewThumbUrl(previewFileId) {
  return previewFileId ? `/api/pictures/thumbnails-square/preview-files/${previewFileId}.png` : null
}
