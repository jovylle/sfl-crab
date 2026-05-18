// Netlify serverless function to proxy Sunflower Land API calls
// This keeps the API key secure on the server side

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Get the API key from environment variables
  const apiKey = process.env.SFL_API_KEY
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured' })
    }
  }

  // Extract the path from the request
  const { path } = event
  const apiPath = path.replace('/.netlify/functions/sfl-api', '')
  
  // Build the full API URL
  const apiUrl = `https://api.sunflower-land.com${apiPath}`
  
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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET'
      },
      body: JSON.stringify(data)
    }
  } catch (error) {
    console.error('API Error:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to fetch data from Sunflower Land API' })
    }
  }
}
