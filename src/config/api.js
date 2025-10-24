// API Configuration
export const API_CONFIG = {
  // Sunflower Land API Key - format: sfl.<YOUR_KEY>
  // Get your API key from: https://sunflower-land.com/play
  // Set this in your .env file as VITE_SFL_API_KEY
  API_KEY: import.meta.env.VITE_SFL_API_KEY || '',
  
  // API Endpoints
  ENDPOINTS: {
    primary: '/api/visit/',
    backup: '/api/community/farms/'
  }
}

// Helper function to get API headers
export function getApiHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': API_CONFIG.API_KEY
  }
}
