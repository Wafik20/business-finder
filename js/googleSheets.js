// Google Sheets API Integration for Auto Shop Finder
import { CONFIG } from '../config.js';

class GoogleSheetsAPI {
    constructor() {
        this.apiKey = CONFIG.GOOGLE_SHEETS_API_KEY;
        this.clientId = CONFIG.GOOGLE_SHEETS_CLIENT_ID;
        this.isGoogleAPILoaded = false;
        this.isAuthorized = false;
        this.accessToken = null;
        this.tokenClient = null;
        
        // Debug: Log what we received from CONFIG
        // console.log('GoogleSheetsAPI constructor - CONFIG values:', {
        //     apiKey: this.apiKey ? 'SET' : 'MISSING',
        //     clientId: this.clientId ? 'SET' : 'MISSING',
        //     clientIdValue: this.clientId // Log actual value for debugging
        // });
    }

    /**
     * Initialize Google Sheets API
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        try {
            // Load Google Identity Services library
            await this.loadGoogleAPI();
            
            // Wait a bit for the API to be fully ready
            await this.delay(2000);
            
            // Initialize token client
            if (window.google && window.google.accounts) {
                try {
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: this.clientId,
                    scope: 'https://www.googleapis.com/auth/spreadsheets',
                    callback: (tokenResponse) => {
                        this.accessToken = tokenResponse.access_token;
                            this.isAuthorized = true;
                            console.log('Google OAuth token received');
                    }
                });
                this.isGoogleAPILoaded = true;
                console.log('Google Sheets API initialized successfully');
                } catch (initError) {
                    console.warn('Failed to initialize Google OAuth client:', initError);
                    this.isGoogleAPILoaded = false;
                }
            } else {
                console.warn('Google Identity Services not loaded, Google Sheets integration will not be available');
                this.isGoogleAPILoaded = false;
            }
            
            return this.isGoogleAPILoaded;
        } catch (error) {
            console.error('Error initializing Google Sheets API:', error);
            this.isGoogleAPILoaded = false;
            return false;
        }
    }

    /**
     * Load Google Identity Services library
     * @returns {Promise} Promise that resolves when API is loaded
     */
    loadGoogleAPI() {
        return new Promise((resolve) => {
            // Check if already loaded
            if (window.google && window.google.accounts) {
                this.isGoogleAPILoaded = true;
                resolve();
                return;
            }

            // Check if script is already being loaded
            if (document.querySelector('script[src*="accounts.google.com"]')) {
                // Wait for existing script to load
                const checkLoaded = () => {
                    if (window.google && window.google.accounts) {
                        this.isGoogleAPILoaded = true;
                        resolve();
                    } else {
                        setTimeout(checkLoaded, 100);
                    }
                };
                checkLoaded();
                return;
            }

            // Load the Google Identity Services library
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            
            let timeoutId = setTimeout(() => {
                console.warn('Google API loading timeout, proceeding anyway');
                resolve();
            }, 10000); // 10 second timeout
            
            script.onload = () => {
                clearTimeout(timeoutId);
                // Wait for google object to be available
                const checkGoogle = () => {
                    if (window.google && window.google.accounts) {
                        this.isGoogleAPILoaded = true;
                        resolve();
                    } else {
                        setTimeout(checkGoogle, 100);
                    }
                };
                checkGoogle();
            };
            
            script.onerror = (error) => {
                clearTimeout(timeoutId);
                console.warn('Failed to load Google Identity Services, proceeding without Google Sheets integration');
                resolve();
            };
            
            document.head.appendChild(script);
        });
    }

    /**
     * Request authorization
     * @returns {Promise<boolean>} Success status
     */
    async requestAuthorization() {
        return new Promise((resolve) => {
            if (!this.isGoogleAPILoaded) {
                console.error('Google API not properly loaded');
                resolve(false);
                return;
            }

            if (!this.tokenClient) {
                console.error('Google OAuth client not initialized');
                resolve(false);
                return;
            }

            this.tokenClient.callback = (tokenResponse) => {
                if (tokenResponse.error) {
                    console.error('OAuth error:', tokenResponse.error);
                    if (tokenResponse.error === 'popup_closed_by_user') {
                        console.log('User closed the popup');
                    } else if (tokenResponse.error === 'access_denied') {
                        console.log('User denied access');
                    } else {
                        console.error('OAuth error details:', tokenResponse);
                    }
                    resolve(false);
                    return;
                }
                this.accessToken = tokenResponse.access_token;
                this.isAuthorized = true;
                console.log('Authorization successful');
                resolve(true);
            };

            this.tokenClient.error_callback = (error) => {
                console.error('OAuth error callback:', error);
                if (error.error === 'popup_closed_by_user') {
                    console.log('User closed the popup');
                } else if (error.error === 'access_denied') {
                    console.log('User denied access');
                } else if (error.error === 'redirect_uri_mismatch') {
                    console.error('OAuth redirect URI mismatch. Please check your Google Cloud Console configuration.');
                    console.error('Current origin:', window.location.origin);
                }
                resolve(false);
            };

            this.tokenClient.requestAccessToken();
        });
    }

    /**
     * Create a new spreadsheet
     * @param {string} title - Spreadsheet title
     * @returns {Promise<string>} Spreadsheet ID
     */
    async createSpreadsheet(title) {
        try {
            const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    properties: {
                        title: title
                    },
                    sheets: [{
                        properties: {
                            title: 'Business Data'
                        }
                    }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Google Sheets API Error Response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Spreadsheet created successfully:', result);
            return result.spreadsheetId;
        } catch (error) {
            console.error('Error creating spreadsheet:', error);
            throw error;
        }
    }

    /**
     * Extract spreadsheet ID from URL
     * @param {string} url - Google Sheets URL
     * @returns {string} Spreadsheet ID
     */
    extractSpreadsheetId(url) {
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        return match ? match[1] : url;
    }

    /**
     * Export results to Google Sheets
     * @param {Array} results - Search results
     * @param {string} location - Searched location
     * @param {Object} options - Export options
     * @returns {Promise<Object>} Export result
     */
    async exportToSheets(results, location, options = {}) {
        try {
            let spreadsheetId = options.spreadsheetId;
            let isNewSpreadsheet = false;
            const country = options.country || 'US';

            // Create new spreadsheet if needed
            if (!spreadsheetId) {
                const title = `Business Data - ${location}, ${country} - ${new Date().toLocaleDateString()}`;
                spreadsheetId = await this.createSpreadsheet(title);
                isNewSpreadsheet = true;
            }

            // Prepare data for export
            const data = this.prepareDataForExport(results, location, country);
            
            // Determine range based on whether it's a new spreadsheet or appending
            const range = isNewSpreadsheet ? 'A1' : await this.getNextRowRange(spreadsheetId);
            
            // Write data to spreadsheet
            await this.writeToSpreadsheet(spreadsheetId, range, data);

            return {
                success: true,
                spreadsheetId: spreadsheetId,
                spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
                isNewSpreadsheet: isNewSpreadsheet,
                rowsAdded: data.length
            };

        } catch (error) {
            console.error('Error exporting to Google Sheets:', error);
            throw error;
        }
    }

    /**
     * Prepare data for export
     * @param {Array} results - Search results
     * @param {string} location - Searched location
     * @param {string} country - Searched country
     * @returns {Array} Formatted data for export
     */
    prepareDataForExport(results, location, country) {
        const headers = [
            'Business Name',
            'Address',
            'Phone Number',
            'Website',
            'Email',
            'Rating',
            'Review Count',
            'Price Level',
            'Business Type',
            'Hours',
            'Search Date/Time',
            'Location Searched',
            'Country',
            'Distance (miles)',
            'Google Maps URL'
        ];

        const data = results.map(result => [
            result.name || '',
            result.vicinity || result.formatted_address || '',
            result.formatted_phone_number || '',
            result.website || '',
            result.email || '',
            result.rating || '',
            result.user_ratings_total || '',
            result.price_level ? '💰'.repeat(result.price_level) : '',
            (result.types || []).join(', '),
            result.opening_hours ? (result.opening_hours.open_now ? 'Open Now' : 'Closed') : '',
            new Date().toLocaleString(),
            location,
            country,
            result.distance ? result.distance.toFixed(1) : '',
            result.place_id ? `https://www.google.com/maps/place/?q=place_id:${result.place_id}` : ''
        ]);

        return [headers, ...data];
    }

    /**
     * Get the next row range for appending data
     * @param {string} spreadsheetId - Spreadsheet ID
     * @returns {Promise<string>} Range string
     */
    async getNextRowRange(spreadsheetId) {
        try {
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:A`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const nextRow = (data.values ? data.values.length : 0) + 1;
            return `A${nextRow}`;
        } catch (error) {
            console.error('Error getting next row range:', error);
            return 'A1'; // Fallback to first row
        }
    }

    /**
     * Write data to spreadsheet
     * @param {string} spreadsheetId - Spreadsheet ID
     * @param {string} range - Range to write to
     * @param {Array} data - Data to write
     * @returns {Promise<Object>} Write result
     */
    async writeToSpreadsheet(spreadsheetId, range, data) {
        try {
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: data
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Google Sheets API Error Response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Data written successfully:', result);
            return result;
        } catch (error) {
            console.error('Error writing to spreadsheet:', error);
            throw error;
        }
    }

    /**
     * Format data for CSV export
     * @param {Array} results - Search results
     * @param {string} location - Searched location
     * @param {string} country - Searched country
     * @returns {string} CSV formatted string
     */
    formatForCSV(results, location, country) {
        const headers = [
            'Business Name',
            'Address',
            'Phone Number',
            'Website',
            'Email',
            'Rating',
            'Review Count',
            'Price Level',
            'Business Type',
            'Hours',
            'Search Date/Time',
            'Location Searched',
            'Country',
            'Distance (miles)',
            'Google Maps URL'
        ];

        const csvData = results.map(result => [
            this.escapeCSVField(result.name || ''),
            this.escapeCSVField(result.vicinity || result.formatted_address || ''),
            this.escapeCSVField(result.formatted_phone_number || ''),
            this.escapeCSVField(result.website || ''),
            this.escapeCSVField(result.email || ''),
            result.rating || '',
            result.user_ratings_total || '',
            result.price_level ? '💰'.repeat(result.price_level) : '',
            this.escapeCSVField((result.types || []).join(', ')),
            this.escapeCSVField(result.opening_hours ? (result.opening_hours.open_now ? 'Open Now' : 'Closed') : ''),
            this.escapeCSVField(new Date().toLocaleString()),
            this.escapeCSVField(location),
            this.escapeCSVField(country),
            result.distance ? result.distance.toFixed(1) : '',
            this.escapeCSVField(result.place_id ? `https://www.google.com/maps/place/?q=place_id:${result.place_id}` : '')
        ]);

        return [headers, ...csvData].map(row => row.join(',')).join('\n');
    }

    /**
     * Escape CSV field to handle commas and quotes
     * @param {string} field - Field to escape
     * @returns {string} Escaped field
     */
    escapeCSVField(field) {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }

    /**
     * Download results as CSV
     * @param {Array} results - Search results
     * @param {string} location - Searched location
     * @param {string} country - Searched country
     */
    downloadCSV(results, location, country) {
        const csv = this.formatForCSV(results, location, country);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `business-data-${location.replace(/[^a-zA-Z0-9]/g, '-')}-${country}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Check if user is authorized
     * @returns {boolean} Authorization status
     */
    isUserAuthorized() {
        return this.isAuthorized && !!this.accessToken;
    }

    /**
     * Delay utility function
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export the class for use in other modules
export { GoogleSheetsAPI }; 