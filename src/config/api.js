// API Configuration
export const API_CONFIG = {
  // API Endpoints - now using secure Netlify function proxy
  ENDPOINTS: {
    primary: '/.netlify/functions/sfl-api/visit/',
    backup: '/.netlify/functions/sfl-api/community/farms/'
  }
}

// Helper function to get API headers
export function getApiHeaders() {
  return {
    'Content-Type': 'application/json'
  }
}
