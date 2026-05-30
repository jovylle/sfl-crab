/**
 * Legacy ProjectMate POST /api/projectmate/issues handler.
 * Web3Forms free plan blocks server-side API calls from Netlify; use in-app
 * FeedbackModal (browser → api.web3forms.com) instead.
 */
const CORS_ORIGINS = [
  'https://projectmate.uft1.com',
  'https://d1g.uk',
  'https://beta.d1g.uk',
  'https://development.d1g.uk',
]

function corsHeaders (origin) {
  const allowed =
    !origin ||
    CORS_ORIGINS.includes(origin) ||
    /^https:\/\/[\w-]+--[\w-]+\.netlify\.app$/.test(origin)

  return {
    'Access-Control-Allow-Origin': allowed ? origin || CORS_ORIGINS[0] : CORS_ORIGINS[1],
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin
  const headers = {
    'Content-Type': 'application/json',
    ...corsHeaders(origin),
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  return {
    statusCode: 410,
    headers: { ...headers, 'Cache-Control': 'no-store' },
    body: JSON.stringify({
      error:
        'Feedback is sent from the app menu (Send feedback), not this API. Web3Forms blocks server-side delivery on the free plan.',
      code: 'USE_CLIENT_FEEDBACK',
    }),
  }
}
