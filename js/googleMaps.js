// Google Maps API Integration for Auto Shop Finder
import { CONFIG } from '../config.js';

class GoogleMapsAPI {
    constructor() {
        this.apiKey = CONFIG.GOOGLE_MAPS_API_KEY;
        this.requestDelay = CONFIG.REQUEST_DELAY;
        this.isLoaded = false;
        this.loadGoogleMapsAPI();
    }

    /**
     * Load Google Maps JavaScript API
     */
    loadGoogleMapsAPI() {
        if (window.google && window.google.maps) {
            this.isLoaded = true;
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&loading=async&libraries=geocoding`;
            script.onload = () => {
                this.isLoaded = true;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Wait for Google Maps API to be loaded
     */
    async waitForAPI() {
        if (!this.isLoaded) {
            await this.loadGoogleMapsAPI();
        }
        return new Promise((resolve) => {
            if (window.google && window.google.maps) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (window.google && window.google.maps) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            }
        });
    }

    /**
     * Search for auto shops near a ZIP code - OPTIMIZED VERSION
     * @param {string} zipCode - ZIP code to search near
     * @param {number} radius - Search radius in miles
     * @param {string} businessType - Type of business to search for
     * @param {Function} progressCallback - Callback for progress updates
     * @returns {Promise<Array>} Array of auto shop results
     */
    async searchAutoShops(zipCode, radius, businessType, progressCallback = null) {
        try {
            await this.waitForAPI();
            
            if (progressCallback) {
                progressCallback(5, 'Getting coordinates for ZIP code...');
            }
            
            // First, get coordinates for the ZIP code
            const coordinates = await this.getCoordinatesFromZipCode(zipCode);
            if (!coordinates) {
                throw new Error('Could not find coordinates for the provided ZIP code');
            }

            if (progressCallback) {
                progressCallback(10, 'Coordinates found, starting optimized search...');
            }

            // Convert radius to meters
            const radiusInMeters = this.convertRadiusToMeters(radius);
            
            // Get business types to search for
            const typesToSearch = this.getBusinessTypes(businessType);
            
            // Get search keywords
            const keywordsToSearch = this.getSearchKeywords(businessType);
            
            // Create all search tasks
            const searchTasks = [];
            
            // Add type-based searches
            for (const type of typesToSearch) {
                searchTasks.push({
                    type: 'nearby',
                    query: type,
                    priority: 1 // Higher priority for type searches
                });
            }
            
            // Add keyword-based searches
            for (const keyword of keywordsToSearch) {
                searchTasks.push({
                    type: 'text',
                    query: keyword,
                    priority: 2 // Lower priority for keyword searches
                });
            }
            
            if (progressCallback) {
                progressCallback(15, `Starting ${searchTasks.length} parallel searches...`);
            }
            
            // Execute searches in parallel with early termination
            const allResults = await this.executeParallelSearches(
                coordinates, 
                radiusInMeters, 
                searchTasks, 
                progressCallback
            );
            
            if (progressCallback) {
                progressCallback(85, 'Processing results...');
            }
            
            // Check if we have any results
            if (allResults.length === 0) {
                if (progressCallback) {
                    progressCallback(100, 'No results found');
                }
                return [];
            }
            
            // Remove duplicates based on place ID
            const uniqueResults = this.removeDuplicates(allResults);
            
            // Filter results by the user's requested distance
            const userRadiusInMiles = radius;
            const filteredResults = uniqueResults.filter(result => {
                return result.distance <= userRadiusInMiles;
            });
            
            if (progressCallback) {
                progressCallback(90, `Found ${filteredResults.length} unique results within ${userRadiusInMiles} miles`);
            }
            
            const sortedResults = this.sortByDistance(filteredResults, coordinates);
            
            if (progressCallback) {
                progressCallback(100, 'Search completed!');
            }
            
            console.log(`API fetched ${allResults.length} total results, ${filteredResults.length} within radius, limiting to ${CONFIG.MAX_RESULTS} as requested`);
            
            // Limit results
            return sortedResults.slice(0, CONFIG.MAX_RESULTS);
            
        } catch (error) {
            console.error('Error searching auto shops:', error);
            throw error;
        }
    }

    /**
     * Execute searches in parallel with concurrency control
     * @param {Object} coordinates - Search coordinates
     * @param {number} radiusInMeters - Search radius in meters
     * @param {Array} searchTasks - Array of search tasks
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Array>} Combined search results
     */
    async executeParallelSearches(coordinates, radiusInMeters, searchTasks, progressCallback) {
        const allResults = [];
        const concurrencyLimit = CONFIG.CONCURRENT_REQUESTS;
        
        // Process tasks in batches to control concurrency
        for (let i = 0; i < searchTasks.length; i += concurrencyLimit) {
            const batch = searchTasks.slice(i, i + concurrencyLimit);
            
            if (progressCallback) {
                const progress = 15 + (i / searchTasks.length) * 60;
                progressCallback(progress, `Processing batch ${Math.floor(i / concurrencyLimit) + 1}...`);
            }
            
            const batchPromises = batch.map(task => {
                if (task.type === 'nearby') {
                    return this.searchNearbyOptimized(coordinates, radiusInMeters, task.query, progressCallback);
                } else if (task.type === 'text') {
                    return this.searchByTextOptimized(coordinates, radiusInMeters, task.query, progressCallback);
                }
                return Promise.resolve([]);
            });
            
            const batchResults = await Promise.all(batchPromises);
            batchResults.forEach(results => allResults.push(...results));
            
            // Add delay between batches to avoid rate limiting
            if (i + concurrencyLimit < searchTasks.length) {
                await this.delay(CONFIG.BATCH_DELAY);
            }
        }
        
        return allResults;
    }

    /**
     * Search nearby places with optimized API calls
     * @param {Object} coordinates - Search coordinates
     * @param {number} radiusInMeters - Search radius in meters
     * @param {string} keyword - Search keyword (will be used as business type)
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Array>} Search results
     */
    async searchNearbyOptimized(coordinates, radiusInMeters, keyword, progressCallback) {
        try {
            let allResults = [];
            let pageToken = null;
            const maxPages = CONFIG.MAX_PAGES_PER_SEARCH;
            
            for (let page = 0; page < maxPages; page++) {
                const requestBody = {
                    locationRestriction: {
                        circle: {
                            center: {
                                latitude: coordinates.lat,
                                longitude: coordinates.lng
                            },
                            radius: radiusInMeters
                        }
                    },
                    includedTypes: [keyword],
                    maxResultCount: 20 // Maximum allowed by Google Places API
                };
                
                if (pageToken) {
                    requestBody.pageToken = pageToken;
                }

                if (progressCallback) {
                    const progress = 15 + (page / maxPages) * 60;
                    progressCallback(progress, `Searching nearby ${keyword} (page ${page + 1})...`);
                }

                const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': this.apiKey,
                        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.nationalPhoneNumber,places.websiteUri,places.regularOpeningHours,places.priceLevel,places.businessStatus,places.primaryType,places.primaryTypeDisplayName'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.warn(`Nearby search failed for ${keyword} (page ${page + 1}):`, response.status, errorText);
                    break;
                }

                const data = await response.json();
                const pageResults = (data.places || [])
                    .map(place => this.formatPlaceResult(place, coordinates));
                
                allResults = allResults.concat(pageResults);
                
                // Check if there are more pages
                if (data.nextPageToken) {
                    pageToken = data.nextPageToken;
                    // Reduced delay for faster processing
                    await this.delay(CONFIG.REQUEST_DELAY);
                } else {
                    break;
                }
            }
            
            return allResults;
        } catch (error) {
            console.warn('Nearby search failed:', error);
            return [];
        }
    }

    /**
     * Search by text with optimized API calls
     * @param {Object} coordinates - Search coordinates
     * @param {number} radiusInMeters - Search radius in meters
     * @param {string} keyword - Search keyword
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Array>} Search results
     */
    async searchByTextOptimized(coordinates, radiusInMeters, keyword, progressCallback) {
        try {
            let allResults = [];
            let pageToken = null;
            const maxPages = CONFIG.MAX_PAGES_PER_SEARCH;
            
            for (let page = 0; page < maxPages; page++) {
                const requestBody = {
                    textQuery: keyword,
                    maxResultCount: 20, // Maximum allowed by Google Places API
                    locationBias: {
                        circle: {
                            center: {
                                latitude: coordinates.lat,
                                longitude: coordinates.lng
                            },
                            radius: radiusInMeters
                        }
                    }
                };
                
                if (pageToken) {
                    requestBody.pageToken = pageToken;
                }

                if (progressCallback) {
                    const progress = 15 + (page / maxPages) * 60;
                    progressCallback(progress, `Searching for "${keyword}" (page ${page + 1})...`);
                }

                const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': this.apiKey,
                        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.nationalPhoneNumber,places.websiteUri,places.regularOpeningHours,places.priceLevel,places.businessStatus,places.primaryType,places.primaryTypeDisplayName'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.warn(`Text search failed for "${keyword}" (page ${page + 1}):`, response.status, errorText);
                    break;
                }

                const data = await response.json();
                const pageResults = (data.places || [])
                    .map(place => this.formatPlaceResult(place, coordinates));
                
                allResults = allResults.concat(pageResults);
                
                // Check if there are more pages
                if (data.nextPageToken) {
                    pageToken = data.nextPageToken;
                    // Reduced delay for faster processing
                    await this.delay(CONFIG.REQUEST_DELAY);
                } else {
                    break;
                }
            }
            
            console.log(`executeTextSearch: Fetched ${allResults.length} results from ${page} pages (max pages: ${maxPages})`);
            return allResults;
        } catch (error) {
            console.warn('Text search failed:', error);
            return [];
        }
    }

    /**
     * Get coordinates from ZIP code using Geocoding service
     * @param {string} zipCode - ZIP code to geocode
     * @returns {Promise<Object|null>} Coordinates object or null
     */
    async getCoordinatesFromZipCode(zipCode) {
        await this.waitForAPI();
        
        return new Promise((resolve) => {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({
                address: zipCode,
                region: 'us',
                componentRestrictions: {
                    country: 'US'
                }
            }, (results, status) => {
                if (status === 'OK' && results.length > 0) {
                    const location = results[0].geometry.location;
                    resolve({
                        lat: location.lat(),
                        lng: location.lng()
                    });
                } else {
                    resolve(null);
                }
            });
        });
    }

    /**
     * Check if a place is auto-related
     * @param {Object} place - Place data
     * @returns {boolean} True if auto-related
     */
    isAutoRelated(place) {
        const name = (place.displayName?.text || '').toLowerCase();
        const types = (place.types || []).map(type => type.toLowerCase());
        
        // Auto-related keywords
        const autoKeywords = [
            'auto', 'car', 'automotive', 'mechanic', 'repair', 'service', 'shop', 
            'body', 'collision', 'tire', 'brake', 'transmission', 'engine', 'oil',
            'garage', 'dealership', 'dealership', 'maintenance', 'diagnostic'
        ];
        
        // Check if name contains auto-related keywords
        const hasAutoKeyword = autoKeywords.some(keyword => name.includes(keyword));
        
        // Check if types are auto-related
        const autoTypes = ['car_repair', 'car_dealer', 'establishment'];
        const hasAutoType = types.some(type => autoTypes.includes(type));
        
        return hasAutoKeyword || hasAutoType;
    }

    /**
     * Format a place result from new Places API v1
     * @param {Object} place - Place data from new API
     * @param {Object} searchCoordinates - Original search coordinates
     * @returns {Object} Formatted place result
     */
    formatPlaceResult(place, searchCoordinates) {
        const distance = this.calculateDistance(
            searchCoordinates.lat,
            searchCoordinates.lng,
            place.location.latitude,
            place.location.longitude
        );
        
        return {
            place_id: place.id,
            name: place.displayName?.text || 'Unknown',
            vicinity: place.formattedAddress || 'No address available',
            formatted_address: place.formattedAddress || 'No address available',
            location: {
                lat: place.location.latitude,
                lng: place.location.longitude
            },
            rating: place.rating || null,
            user_ratings_total: place.userRatingCount || 0,
            types: place.types || [],
            primary_type: place.primaryType || null,
            primary_type_display_name: place.primaryTypeDisplayName || null,
            price_level: place.priceLevel || null,
            business_status: place.businessStatus || null,
            distance: distance,
            searchDate: new Date().toISOString(),
            // Contact information
            formatted_phone_number: place.nationalPhoneNumber || null,
            website: place.websiteUri || null,
            // Hours information
            opening_hours: place.regularOpeningHours ? this.formatModernHours(place.regularOpeningHours) : null
        };
    }

    /**
     * Get additional details for a place using new Places API v1 HTTP endpoint
     * @param {string} placeId - Google Place ID
     * @returns {Promise<Object>} Additional place details
     */
    async getPlaceDetails(placeId) {
        try {
            const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
                method: 'GET',
                headers: {
                    'X-Goog-Api-Key': this.apiKey,
                    'X-Goog-FieldMask': 'displayName,formattedAddress,nationalPhoneNumber,websiteUri,regularOpeningHours,rating,userRatingCount,types,priceLevel,businessStatus,primaryType,primaryTypeDisplayName'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`Failed to get place details for ${placeId}:`, response.status, errorText);
                return { phone: null, website: null, hours: null, fullAddress: null };
            }

            const place = await response.json();
            
            return {
                phone: place.nationalPhoneNumber || null,
                website: place.websiteUri || null,
                hours: place.regularOpeningHours ? this.formatModernHours(place.regularOpeningHours) : null,
                fullAddress: place.formattedAddress || null,
                rating: place.rating || null,
                userRatingCount: place.userRatingCount || 0,
                types: place.types || [],
                priceLevel: place.priceLevel || null,
                businessStatus: place.businessStatus || null,
                primaryType: place.primaryType || null,
                primaryTypeDisplayName: place.primaryTypeDisplayName || null
            };
        } catch (error) {
            console.warn('Failed to get place details:', error);
            return { 
                phone: null, 
                website: null, 
                hours: null, 
                fullAddress: null,
                rating: null,
                userRatingCount: 0,
                types: [],
                priceLevel: null,
                businessStatus: null,
                primaryType: null,
                primaryTypeDisplayName: null
            };
        }
    }

    /**
     * Format opening hours for new Places API
     * @param {Object} openingHours - Opening hours from new API
     * @returns {Array} Formatted hours
     */
    formatModernHours(openingHours) {
        if (!openingHours.weekdayDescriptions) return null;
        
        return openingHours.weekdayDescriptions.map(description => {
            const [dayName, hours] = description.split(': ');
            return { day: dayName, hours: hours };
        });
    }

    /**
     * Get business types based on search type
     * @param {string} businessType - Type of business
     * @returns {Array} Array of business types
     */
    getBusinessTypes(businessType) {
        const types = CONFIG.BUSINESS_TYPES[businessType];
        return Array.isArray(types) ? types : [types];
    }

    /**
     * Get search keywords based on business type
     * @param {string} businessType - Type of business
     * @returns {Array} Array of keywords
     */
    getSearchKeywords(businessType) {
        return CONFIG.SEARCH_KEYWORDS[businessType] || [];
    }

    /**
     * Convert radius to meters
     * @param {number} radius - Radius in miles
     * @returns {number} Radius in meters
     */
    convertRadiusToMeters(radius) {
        // Convert miles to meters (1 mile = 1609.34 meters)
        const meters = Math.round(radius * 1609.34);
        
        // Google Places API has a maximum radius of 50,000 meters (about 31 miles)
        const maxRadius = 50000;
        
        if (meters > maxRadius) {
            console.warn(`Radius ${radius} miles (${meters} meters) exceeds Google Places API maximum of ${maxRadius} meters. Using maximum allowed radius.`);
            return maxRadius;
        }
        
        return meters;
    }

    /**
     * Calculate distance between two points
     * @param {number} lat1 - First latitude
     * @param {number} lon1 - First longitude
     * @param {number} lat2 - Second latitude
     * @param {number} lon2 - Second longitude
     * @returns {number} Distance in miles
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3959; // Earth's radius in miles
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        return Math.round(distance * 10) / 10; // Round to 1 decimal place
    }

    /**
     * Convert degrees to radians
     * @param {number} deg - Degrees
     * @returns {number} Radians
     */
    deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    /**
     * Remove duplicate results based on place ID
     * @param {Array} results - Array of results
     * @returns {Array} Array with duplicates removed
     */
    removeDuplicates(results) {
        const seen = new Set();
        return results.filter(result => {
            if (seen.has(result.place_id)) {
                return false;
            }
            seen.add(result.place_id);
            return true;
        });
    }

    /**
     * Sort results by distance
     * @param {Array} results - Array of results
     * @param {Object} coordinates - Search coordinates
     * @returns {Array} Sorted results
     */
    sortByDistance(results, coordinates) {
        return results.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Delay execution
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Search for businesses by location, radius, and keyword
     * @param {string} location - Location to search (city, state, ZIP, address)
     * @param {number} radius - Search radius in miles
     * @param {string} keyword - Business keyword to search for
     * @param {number} maxResults - Maximum number of results to return
     * @param {string} country - Country code (e.g., 'US', 'GB', 'CA')
     * @param {Function} progressCallback - Progress callback function
     * @returns {Promise<Array>} Array of business results
     */
    async searchBusinesses(location, radius, keyword, maxResults = 200, country = 'US', progressCallback = null) {
        try {
            await this.waitForAPI();
            
            if (progressCallback) {
                progressCallback(5, 'Getting coordinates for location...');
            }
            
            // First, get coordinates for the location
            const coordinates = await this.getCoordinatesFromLocation(location, country);
            if (!coordinates) {
                throw new Error('Could not find coordinates for the provided location');
            }

            if (progressCallback) {
                progressCallback(10, 'Coordinates found, starting search...');
            }

            // Convert radius to meters
            const radiusInMeters = this.convertRadiusToMeters(radius);
            
            // For keyword searches, we'll use text search with location bias
            // This allows for flexible keyword matching instead of strict business types
            const searchTasks = [
                {
                    type: 'text',
                    query: keyword,
                    priority: 1
                }
            ];
            
            if (progressCallback) {
                progressCallback(15, `Starting search for "${keyword}" businesses...`);
            }
            
            // Execute text search
            const allResults = await this.executeTextSearch(
                coordinates, 
                radiusInMeters, 
                keyword,
                progressCallback
            );
            
            if (progressCallback) {
                progressCallback(85, 'Processing results...');
            }
            
            // Check if we have any results
            if (allResults.length === 0) {
                if (progressCallback) {
                    progressCallback(100, 'No results found');
                }
                return [];
            }
            
            // Remove duplicates based on place ID
            const uniqueResults = this.removeDuplicates(allResults);
            
            // Filter results by the user's requested distance
            const userRadiusInMiles = radius;
            const filteredResults = uniqueResults.filter(result => {
                return result.distance <= userRadiusInMiles;
            });
            
            if (progressCallback) {
                progressCallback(90, `Found ${filteredResults.length} unique results within ${userRadiusInMiles} miles`);
            }
            
            const sortedResults = this.sortByDistance(filteredResults, coordinates);
            
            if (progressCallback) {
                progressCallback(100, 'Search completed!');
            }
            
            console.log(`API fetched ${allResults.length} total results, ${filteredResults.length} within radius, limiting to ${maxResults} as requested`);
            
            // Limit results
            return sortedResults.slice(0, maxResults);
            
        } catch (error) {
            console.error('Error searching businesses:', error);
            throw error;
        }
    }

    /**
     * Execute text search for businesses
     * @param {Object} coordinates - Search coordinates
     * @param {number} radiusInMeters - Search radius in meters
     * @param {string} keyword - Search keyword
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Array>} Search results
     */
    async executeTextSearch(coordinates, radiusInMeters, keyword, progressCallback) {
        try {
            let allResults = [];
            let pageToken = null;
            const maxPages = CONFIG.MAX_PAGES_PER_SEARCH;
            let page = 0;
            
            for (; page < maxPages; page++) {
                const requestBody = {
                    textQuery: keyword,
                    maxResultCount: 20, // Maximum allowed by Google Places API
                    locationBias: {
                        circle: {
                            center: {
                                latitude: coordinates.lat,
                                longitude: coordinates.lng
                            },
                            radius: radiusInMeters
                        }
                    }
                };
                
                if (pageToken) {
                    requestBody.pageToken = pageToken;
                }

                if (progressCallback) {
                    const progress = 15 + (page / maxPages) * 60;
                    progressCallback(progress, `Searching page ${page + 1} for "${keyword}"...`);
                }

                const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': this.apiKey,
                        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.nationalPhoneNumber,places.websiteUri,places.regularOpeningHours,places.priceLevel,places.businessStatus,places.primaryType,places.primaryTypeDisplayName'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.warn(`Text search failed for "${keyword}" (page ${page + 1}):`, response.status, errorText);
                    break;
                }

                const data = await response.json();
                const pageResults = (data.places || [])
                    .map(place => this.formatPlaceResult(place, coordinates));
                
                allResults = allResults.concat(pageResults);
                
                // Check if there are more pages
                if (data.nextPageToken) {
                    pageToken = data.nextPageToken;
                    // Reduced delay for faster processing
                    await this.delay(CONFIG.REQUEST_DELAY);
                } else {
                    break;
                }
            }
            
            console.log(`executeTextSearch: Fetched ${allResults.length} results from ${page} pages (max pages: ${maxPages})`);
            return allResults;
        } catch (error) {
            console.warn('Text search failed:', error);
            return [];
        }
    }

    /**
     * Get coordinates from location using Geocoding service
     * @param {string} location - Location to geocode (city, state, ZIP, address)
     * @param {string} country - Country code (e.g., 'US', 'GB', 'CA')
     * @returns {Promise<Object|null>} Coordinates object or null
     */
    async getCoordinatesFromLocation(location, country = 'US') {
        await this.waitForAPI();
        
        return new Promise((resolve) => {
            const geocoder = new google.maps.Geocoder();
            const geocodeRequest = {
                address: location
            };
            
            // Add country restriction if provided
            if (country && country !== 'US') {
                geocodeRequest.componentRestrictions = {
                    country: country
                };
            }
            
            geocoder.geocode(geocodeRequest, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const location = results[0].geometry.location;
                    resolve({
                        lat: location.lat(),
                        lng: location.lng()
                    });
                } else {
                    console.warn('Geocoding failed for location:', location, 'Country:', country, 'Status:', status);
                    resolve(null);
                }
            });
        });
    }
}

// Export the class for use in other modules
export { GoogleMapsAPI }; 