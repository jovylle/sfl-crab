// API endpoints configuration
const API_ENDPOINTS = {
  primary: '/api/visit/',
  backup: '/api/community/farms/'
};

// Normalize response format to match primary API structure
function normalizeApiResponse(data, apiType = 'primary') {
  if (apiType === 'primary') {
    // Primary API: {visitedFarmState: {gameObject}}
    return data;
  } else if (apiType === 'backup') {
    // Backup API: {farm: {gameObject}} -> normalize to {visitedFarmState: {gameObject}}
    if (data.farm) {
      return {
        visitedFarmState: data.farm
      };
    }
  }
  return data;
}

export async function fetchLandDataFromServer (landId) {
  if (!landId) throw new Error('landId is required');

  try {
    // Try primary API first
    const primaryResponse = await fetch(`${API_ENDPOINTS.primary}${landId}`);
    
    if (primaryResponse.ok) {
      const data = await primaryResponse.json();
      return normalizeApiResponse(data, 'primary');
    }
    
    // If primary API returns 404, try backup API
    if (primaryResponse.status === 404) {
      console.warn('Primary API returned 404, trying backup API...');
      
      const backupResponse = await fetch(`${API_ENDPOINTS.backup}${landId}`);
      
      if (backupResponse.ok) {
        const data = await backupResponse.json();
        return normalizeApiResponse(data, 'backup');
      }
      
      if (backupResponse.status === 404) {
        throw new Error('Land not found on both primary and backup APIs.');
      }
    }
    
    // Handle rate limiting
    if (primaryResponse.status === 429) {
      throw new Error('You are sending requests too quickly. Please wait a moment before trying again.');
    }
    
    throw new Error('Failed to fetch land data from both APIs.');
    
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    throw error;
  }
}
