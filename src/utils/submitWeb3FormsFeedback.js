/**
 * Submit feedback via Web3Forms from the browser (required on free plan;
 * server-side calls from Netlify are blocked).
 */
export async function submitWeb3FormsFeedback ({ message, email = '', pageUrl = '' }) {
  const accessKey = import.meta.env.VITE_PROJECTMATE_WEB3FORMS_KEY
  if (!accessKey) {
    throw new Error('Feedback is not configured (missing VITE_PROJECTMATE_WEB3FORMS_KEY).')
  }

  const lines = [message.trim()]
  if (pageUrl) lines.push('', `Page: ${pageUrl}`)

  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_key: accessKey,
      subject: 'SFL Crab feedback',
      from_name: 'd1g.uk',
      message: lines.join('\n'),
      ...(email.trim() ? { replyto: email.trim() } : {}),
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.success !== true) {
    throw new Error(data.message || 'Could not send feedback. Try again later.')
  }

  return data
}
