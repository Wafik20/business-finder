# Auto Shop Finder

A modern web application that allows users to search for auto repair and collision shops near a ZIP code and export the results to Google Sheets or download as CSV.

## Features

- 🔍 **Smart Search**: Search for auto repair shops and collision centers using Google Maps Places API
- 📍 **Location-Based**: Search by ZIP code with customizable radius (miles/kilometers)
- 🏷️ **Business Filtering**: Filter by auto repair, collision shops, or both
- 📊 **Rich Data**: Get business details including name, address, phone, website, ratings, and hours
- 📈 **Google Sheets Export**: Export results directly to Google Sheets (create new or append to existing)
- 📥 **CSV Download**: Download results as CSV file for offline use
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- ⚡ **Modern UI**: Clean, intuitive interface with smooth animations and loading states
- 🔐 **Secure Configuration**: Environment variables for API keys using .env files

## Screenshots

The application features a modern, gradient-based design with:
- Clean search form with validation
- Beautiful result cards with business information
- Modal for Google Sheets export options
- Responsive layout for all devices

## Setup Instructions

### Prerequisites

- Node.js (version 14 or higher)
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Google Cloud Platform account
- Google Maps API key
- Google Sheets API credentials

### 1. Google Cloud Platform Setup

#### Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing for your project

#### Enable Required APIs

Enable the following APIs in your Google Cloud Console:

1. **Google Maps JavaScript API**
   - Go to APIs & Services > Library
   - Search for "Maps JavaScript API"
   - Click "Enable"

2. **Google Places API**
   - Search for "Places API"
   - Click "Enable"

3. **Google Geocoding API**
   - Search for "Geocoding API"
   - Click "Enable"

4. **Google Sheets API**
   - Search for "Google Sheets API"
   - Click "Enable"

#### Create API Keys

1. **Google Maps API Key**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "API Key"
   - Copy the API key
   - Click "Restrict Key" and add the following restrictions:
     - Application restrictions: HTTP referrers
     - API restrictions: Select "Maps JavaScript API", "Places API", "Geocoding API"

2. **Google Sheets API Credentials**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost:8000` (for local development)
     - `https://yourdomain.com` (for production)
   - Add authorized redirect URIs:
     - `http://localhost:8000`
     - `https://yourdomain.com`
   - Copy the Client ID

### 2. Application Configuration

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment Variables**
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your API keys:
     ```bash
     # Google Maps API Configuration
     VITE_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_GOOGLE_MAPS_API_KEY
     
     # Google Sheets API Configuration
     VITE_GOOGLE_SHEETS_API_KEY=YOUR_ACTUAL_GOOGLE_SHEETS_API_KEY
     VITE_GOOGLE_SHEETS_CLIENT_ID=YOUR_ACTUAL_GOOGLE_SHEETS_CLIENT_ID
     
     # Application Settings (optional - defaults provided)
     VITE_MAX_RESULTS=500
     VITE_REQUEST_DELAY=200
     VITE_MAX_RADIUS=31
     ```

   **Important**: Never commit your `.env` file to version control. It's already included in `.gitignore`.

### 3. Running the Application

#### Development Mode

1. Start the development server:
   ```bash
   npm run dev
   ```

2. The application will open automatically in your browser at `http://localhost:8000`

#### Production Build

1. Build the application for production:
   ```bash
   npm run build
   ```

2. Preview the production build:
   ```bash
   npm run preview
   ```

3. The built files will be in the `dist/` directory, ready for deployment

### 4. Production Deployment

For production deployment:

1. Build the application:
   ```bash
   npm run build
   ```

2. Upload the contents of the `dist/` directory to your web server
3. Update the OAuth 2.0 client ID with your production domain
4. Ensure HTTPS is enabled (required for Google OAuth)
5. Update the authorized origins in Google Cloud Console

## Usage Guide

### Searching for Auto Shops

1. **Enter ZIP Code**: Type a valid US ZIP code (e.g., 90210 or 90210-1234)
2. **Set Search Radius**: Choose the distance in miles or kilometers (1-31)
3. **Select Business Type**:
   - **Auto Repair & Collision**: Search for both types
   - **Auto Repair Only**: Search for repair shops only
   - **Collision Only**: Search for collision centers only
4. **Click Search**: The application will find nearby businesses

### Viewing Results

Results are displayed as cards showing:
- Business name and rating
- Full address
- Phone number (clickable)
- Website link (if available)
- Today's hours (if available)
- Distance from your ZIP code
- Business categories

### Exporting Results

#### To Google Sheets

1. Click "Export to Google Sheets"
2. Choose an option:
   - **Create new spreadsheet**: Creates a new Google Sheet
   - **Append to existing**: Add to an existing spreadsheet (provide URL or ID)
3. Authorize with your Google account when prompted
4. Results will be exported with headers and all business details

#### Download CSV

1. Click "Download CSV"
2. A CSV file will be downloaded to your computer
3. Open with Excel, Google Sheets, or any spreadsheet application

## Data Output Format

The exported data includes these columns:

| Column | Description |
|--------|-------------|
| Name | Business name |
| Address | Full address |
| Phone | Phone number |
| Website | Website URL (if available) |
| Rating | Google rating (1-5 stars) |
| Reviews | Number of reviews |
| Hours | Today's hours (if available) |
| Distance | Distance from ZIP code (miles) |
| Categories | Business categories |
| Place ID | Google Places ID |

## API Usage and Limits

### Google Maps API
- **Places API**: Used for nearby search and place details
- **Geocoding API**: Used to convert ZIP codes to coordinates
- **Rate Limits**: 1000 requests per day (free tier), 100,000 requests per day (paid tier)

### Google Sheets API
- **Rate Limits**: 300 requests per minute per user, 300 requests per minute per project
- **Authentication**: OAuth 2.0 required for write access

## Troubleshooting

### Common Issues

1. **"Google Maps API Error"**
   - Check that your API key is correct in `.env`
   - Verify that Maps JavaScript API and Places API are enabled
   - Check API key restrictions in Google Cloud Console

2. **"Google Sheets Authentication Error"**
   - Verify your OAuth client ID in `.env`
   - Check that your domain is authorized in Google Cloud Console
   - Ensure you're using HTTPS in production

3. **"No results found"**
   - Try a different ZIP code
   - Increase the search radius
   - Check that the business type filter is appropriate

4. **"Rate limit exceeded"**
   - Wait a few minutes before trying again
   - Consider upgrading to a paid Google Cloud account
   - Reduce the search radius to get fewer results

### Development Issues

1. **Environment variables not loading**
   - Ensure your `.env` file is in the project root
   - Restart the development server after changing `.env`
   - Check that variable names start with `VITE_`

2. **Build errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check the console for specific error messages
   - Verify that all environment variables are set

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the troubleshooting section above
- Review the Google Maps API documentation
- Review the Google Sheets API documentation
- Open an issue on GitHub

## Changelog

### Version 2.0.0
- Migrated to Vite build system
- Added environment variable support
- Improved Google Maps API integration
- Enhanced error handling and user feedback
- Updated to modern Google Places API

### Version 1.0.0
- Initial release
- Basic search functionality
- Google Sheets export
- CSV download
- Responsive design 