# Quick Start Guide

Get the Auto Shop Finder running in 5 minutes!

## Prerequisites

- A modern web browser
- Google Cloud Platform account (free tier works fine)

## Step 1: Get Google API Keys

### 1. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable billing (required for APIs)

### 2. Enable APIs
In Google Cloud Console, go to "APIs & Services > Library" and enable:
- **Maps JavaScript API**
- **Places API** 
- **Geocoding API**
- **Google Sheets API**

### 3. Create API Key
1. Go to "APIs & Services > Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key
4. Click "Restrict Key" and select the APIs you enabled above

### 4. Create OAuth Client ID
1. Click "Create Credentials" > "OAuth 2.0 Client IDs"
2. Choose "Web application"
3. Add authorized origins: `http://localhost:8000`
4. Copy the Client ID

## Step 2: Configure the Application

1. Open `config.js` in your code editor
2. Replace the placeholder values:

```javascript
const CONFIG = {
    GOOGLE_MAPS_API_KEY: 'YOUR_ACTUAL_API_KEY_HERE',
    GOOGLE_SHEETS_API_KEY: 'YOUR_ACTUAL_API_KEY_HERE', // Same as above
    GOOGLE_SHEETS_CLIENT_ID: 'YOUR_ACTUAL_CLIENT_ID_HERE',
    // ... rest can stay the same
};
```

## Step 3: Run the Application

### Option A: Using Node.js (Recommended)
```bash
npm install -g http-server
http-server -p 8000
```

### Option B: Using Python
```bash
python -m http.server 8000
```

### Option C: Using VS Code
1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

## Step 4: Test the Application

1. Open your browser to `http://localhost:8000`
2. Enter a ZIP code (e.g., 90210)
3. Set radius to 10 miles
4. Click "Search"
5. You should see auto shops appear!

## Troubleshooting

### "API quota exceeded"
- Wait 24 hours or upgrade your Google Cloud account
- Check usage in Google Cloud Console

### "Access denied"
- Verify API keys are correct
- Ensure all required APIs are enabled
- Check that your domain is authorized

### No results found
- Try a different ZIP code
- Increase the search radius
- Check browser console for errors

## Next Steps

- Read the full [README.md](README.md) for detailed setup instructions
- Customize the application by editing `config.js`
- Deploy to production with HTTPS

## Need Help?

1. Check the browser console (F12) for error messages
2. Verify your API configuration
3. Ensure all APIs are enabled in Google Cloud Console
4. Check the troubleshooting section in the main README

Happy searching! 🚗🔧 