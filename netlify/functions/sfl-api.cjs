// Netlify serverless function to proxy Sunflower Land API calls
// This keeps the API key secure on the server side

const API_ORIGINS = {
  production: 'https://api.sunflower-land.com',
  test: 'https://api-dev.sunflower-land.com',
}

function resolveApiTarget (event) {
  const headers = event.headers || {}
  const header =
    headers['x-sfl-api-env'] ||
    headers['X-Sfl-Api-Env'] ||
    Object.entries(headers).find(
      ([k]) => k.toLowerCase() === 'x-sfl-api-env',
    )?.[1] ||
    ''
  const query = event.queryStringParameters?.env || ''
  const useTest = header === 'test' || query === 'test'
  const env = useTest ? 'test' : 'production'
  const apiKey = useTest ? process.env.SFL_API_KEY_DEV : process.env.SFL_API_KEY
  return { env, apiKey, origin: API_ORIGINS[env] }
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-sfl-api-env',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  const { env, apiKey, origin } = resolveApiTarget(event)
  if (!apiKey) {
    const keyName = env === 'test' ? 'SFL_API_KEY_DEV' : 'SFL_API_KEY'
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: `${keyName} not configured` })
    }
  }

  // Extract the path from the request
  const { path } = event
  const apiPath = path.replace('/.netlify/functions/sfl-api', '')
  
  // Build the full API URL
  const apiUrl = `${origin}${apiPath}`
  
  try {
    // Make the request to Sunflower Land API with the API key
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    })

    // Get the response data
    const data = await response.json()

    // Return the data with proper CORS headers
    return {
      statusCode: response.status,
      headers: corsHeaders,
      body: JSON.stringify(data)
    }
  } catch (error) {
    console.error('API Error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to fetch data from Sunflower Land API' })
    }
  }
}
