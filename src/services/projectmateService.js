// src/services/projectmateService.js
// Cloudflare Worker (projectmate-issues-api) client — D1+R2 source of truth for public feedback.
// Replaces Netlify Blobs for anything public. Private legacy blobs stay in /api/admin-blobs.

export function getIssuesEndpoint () {
  const base = import.meta.env.VITE_PROJECTMATE_ISSUES_ENDPOINT
  if (!base) return ''
  return base.replace(/\/+$/, '')
}

export function getProjectId () {
  return import.meta.env.VITE_PROJECTMATE_PROJECT_ID || 'sfl-crab'
}

function adminHeaders (password) {
  return {
    'Content-Type': 'application/json',
    'x-projectmate-admin': 'true',
    ...(password ? { Authorization: `Bearer ${password}` } : {}),
  }
}

export async function listPublicFeedback () {
  const base = getIssuesEndpoint()
  if (!base) throw new Error('Public feedback not configured (missing VITE_PROJECTMATE_ISSUES_ENDPOINT).')
  const res = await fetch(`${base}/issues?projectId=${encodeURIComponent(getProjectId())}&view=open`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not load feedback.')
  return data.items || []
}

export async function listModeration (password) {
  const base = getIssuesEndpoint()
  if (!base) throw new Error('Missing VITE_PROJECTMATE_ISSUES_ENDPOINT.')
  const res = await fetch(`${base}/issues/moderation?projectId=${encodeURIComponent(getProjectId())}`, {
    headers: adminHeaders(password),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not load moderation queue.')
  return data.items || []
}

export async function setIssueStatus (password, id, status, note) {
  const base = getIssuesEndpoint()
  if (!base) throw new Error('Missing VITE_PROJECTMATE_ISSUES_ENDPOINT.')
  const res = await fetch(`${base}/issues/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: adminHeaders(password),
    body: JSON.stringify({ status, ...(note ? { note } : {}) }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not update status.')
  return data.item
}
