// Configuration file for Auto Shop Finder
// Environment variables are loaded from .env file via Vite

// Detect environment
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

const CONFIG = {
    // Google Maps API Configuration
    GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    
    // Google Sheets API Configuration
    GOOGLE_SHEETS_API_KEY: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY,
    GOOGLE_SHEETS_CLIENT_ID: import.meta.env.VITE_GOOGLE_SHEETS_CLIENT_ID,
    
    // Application Settings
    MAX_RESULTS: parseInt(import.meta.env.VITE_MAX_RESULTS) || 10000,
    MAX_DETAILED_RESULTS: parseInt(import.meta.env.VITE_MAX_DETAILED_RESULTS) || 1000,
    REQUEST_DELAY: parseInt(import.meta.env.VITE_REQUEST_DELAY) || 100,
    
    // Search Settings
    MAX_RADIUS: parseInt(import.meta.env.VITE_MAX_RADIUS) || 31,
    
    // Performance Settings
    MAX_PAGES_PER_SEARCH: 500,
    MAX_PARALLEL_SEARCHES: 4,
    EARLY_TERMINATION_THRESHOLD: 100,
    
    // Business Types for Google Places API
    BUSINESS_TYPES: {
        repair: ['car_repair'],
        collision: ['car_dealer'], // Many collision shops are categorized as car dealers
        both: ['car_repair', 'car_dealer']
    },
    
    // Optimized Search Keywords - Reduced redundancy
    SEARCH_KEYWORDS: {
        repair: ['auto repair', 'mechanic', 'auto service'],
        collision: ['collision repair', 'auto body', 'body shop'],
        both: ['auto repair', 'collision repair', 'mechanic', 'auto body']
    }
};

// Debug: Log configuration (remove in production)
console.log('CONFIG loaded:', {
    GOOGLE_MAPS_API_KEY: CONFIG.GOOGLE_MAPS_API_KEY ? 'SET' : 'MISSING',
    GOOGLE_SHEETS_API_KEY: CONFIG.GOOGLE_SHEETS_API_KEY ? 'SET' : 'MISSING',
    GOOGLE_SHEETS_CLIENT_ID: CONFIG.GOOGLE_SHEETS_CLIENT_ID ? 'SET' : 'MISSING',
    MAX_RESULTS: CONFIG.MAX_RESULTS,
    MAX_DETAILED_RESULTS: CONFIG.MAX_DETAILED_RESULTS,
    REQUEST_DELAY: CONFIG.REQUEST_DELAY,
    MAX_RADIUS: CONFIG.MAX_RADIUS,
    MAX_PAGES_PER_SEARCH: CONFIG.MAX_PAGES_PER_SEARCH,
    MAX_PARALLEL_SEARCHES: CONFIG.MAX_PARALLEL_SEARCHES
});

export { CONFIG }; 