# Sunflower Land API Key Setup

The Sunflower Land API now requires an API key for authentication. This document explains how to configure your API key securely using Netlify serverless functions.

## Getting Your API Key

1. Visit [Sunflower Land](https://sunflower-land.com/play)
2. Log in to your account
3. Navigate to your profile/settings to find your API key
4. Your API key will be in the format: `sfl.<YOUR_KEY>`

## 🔒 Secure Configuration

The API key is now handled securely using a **Netlify serverless function** that keeps the key on the server side, never exposing it to the browser.

### For Development

1. Create a `.env` file in your project root
2. Add your API key:

```bash
SFL_API_KEY=sfl.YOUR_ACTUAL_API_KEY_HERE
SFL_API_KEY_DEV=sfl.YOUR_TEST_API_KEY_HERE
```

3. Copy from `env.example` if needed:
```bash
cp env.example .env
```

4. Install Netlify CLI and run locally:
```bash
npm install -g netlify-cli
netlify dev
```

## How It Works

The API key is now handled securely through a **serverless function proxy**:

1. **Frontend**: Makes requests to `/.netlify/functions/sfl-api/...`
2. **Serverless Function**: Receives the request, adds the API key, and forwards to Sunflower Land API
3. **Response**: Returns the data to the frontend without exposing the API key

## Files Modified

- `netlify/functions/sfl-api.js` - **NEW**: Secure serverless function proxy
- `src/config/api.js` - Updated to use function endpoints
- `src/services/landApiService.js` - Now calls secure proxy
- `src/utils/api.js` - Now calls secure proxy
- `vite.config.js` - Updated for local development
- `public/_redirects` - Updated for function routing

## Security Note

✅ **Fully Secure**: Your API key is now stored server-side only and never exposed to the browser or client-side code.

## Netlify Deployment

For Netlify deployment, add your environment variable in the Netlify dashboard:

1. Go to your site settings in Netlify
2. Navigate to "Environment variables"
3. Add: `SFL_API_KEY` = `sfl.YOUR_ACTUAL_API_KEY`
4. Add: `SFL_API_KEY_DEV` = your test-server key (for `api-dev.sunflower-land.com`)

The serverless function uses `SFL_API_KEY_DEV` when the browser sends `x-sfl-api-env: test` (test API mode).

### Test server (testnet)

Uses api-dev, not shown as a menu section. Ways to use it:

- **Query flag:** `?testnet` on any page (e.g. `https://d1g.uk/913531074720548/digging?testnet`) — shareable; uses api-dev.
- **Footer / menu links:** click the plain word `testnet-server` under “SFL Digging Assistant Links” (no underline; looks like body text).
- **Legacy:** `/test/{landId}/digging` redirects to `/{landId}/digging?testnet`; `?api=test` redirects to `?testnet`.
- **Testnet land IDs** (13+ digits) require `?testnet`; dig-day syncs to the hub with the land ID hidden on public views.
- **Example test farm:** `913531074720548` (there is no land ID `1` on api-dev).

## Testing

### Local Development
```bash
# Install Netlify CLI if you haven't already
npm install -g netlify-cli

# Run with Netlify dev (includes serverless functions)
netlify dev
```

### Production Testing
After deploying to Netlify with the environment variable set, your app will automatically use the secure serverless function.

The application should now successfully authenticate with the Sunflower Land API without exposing your API key to the browser.
