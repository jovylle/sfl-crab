# Sunflower Land API Key Setup

The Sunflower Land API now requires an API key for authentication. This document explains how to configure your API key in the SFL Crab project.

## Getting Your API Key

1. Visit [Sunflower Land](https://sunflower-land.com/play)
2. Log in to your account
3. Navigate to your profile/settings to find your API key
4. Your API key will be in the format: `sfl.<YOUR_KEY>`

## Configuration

The API key is configured using environment variables for security. To set it up:

1. Create a `.env` file in your project root
2. Add your API key:

```bash
VITE_SFL_API_KEY=sfl.YOUR_ACTUAL_API_KEY_HERE
```

3. Copy from `env.example` if needed:
```bash
cp env.example .env
```

## How It Works

The API key is automatically included in all requests to the Sunflower Land API through:

1. **Direct API calls**: Headers are added via `getApiHeaders()` function
2. **Development proxy**: Vite proxy automatically adds the header to proxied requests
3. **Production**: The API key is included in all fetch requests

## Files Modified

- `src/config/api.js` - API configuration and key storage
- `src/services/landApiService.js` - Updated to include API headers
- `src/utils/api.js` - Updated to include API headers  
- `vite.config.js` - Updated proxy to pass API key

## Security Note

✅ **Secure**: Your API key is now stored in environment variables and will not be committed to version control.

## Netlify Deployment

For Netlify deployment, add your environment variable in the Netlify dashboard:

1. Go to your site settings in Netlify
2. Navigate to "Environment variables"
3. Add: `VITE_SFL_API_KEY` = `sfl.YOUR_ACTUAL_API_KEY`

## Testing

After updating your API key, restart your development server:

```bash
npm run dev
```

The application should now successfully authenticate with the Sunflower Land API.
