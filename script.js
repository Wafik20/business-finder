// Main Application Logic for Business Data Collector
import { CONFIG } from './config.js';
import { GoogleMapsAPI } from './js/googleMaps.js';
import { GoogleSheetsAPI } from './js/googleSheets.js';

class BusinessDataCollector {
    constructor() {
        this.googleMapsAPI = new GoogleMapsAPI();
        this.googleSheetsAPI = new GoogleSheetsAPI();
        this.currentResults = [];
        this.currentLocation = '';
        this.currentCountry = '';
        this.isInitialized = false;
        this.sheetsInitialized = false;
        
        this.initializeApp();
    }

    /**
     * Initialize the application
     */
    async initializeApp() {
        try {
            // Set up event listeners first
            this.setupEventListeners();
            
            // Initialize radius unit settings
            this.handleRadiusUnitChange();
            
            // Initialize Google Sheets API (non-blocking)
            this.initializeGoogleSheets();
            
            this.isInitialized = true;
            console.log('Business Data Collector initialized successfully');
            
            // Add initial animation
            this.addInitialAnimations();
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showError('Failed to initialize the application. Please refresh the page.');
        }
    }

    /**
     * Add initial animations and UI enhancements
     */
    addInitialAnimations() {
        // Add fade-in animation to main content
        const main = document.querySelector('main');
        if (main) {
            main.style.opacity = '0';
            main.style.transform = 'translateY(20px)';
            setTimeout(() => {
                main.style.transition = 'all 0.6s ease-out';
                main.style.opacity = '1';
                main.style.transform = 'translateY(0)';
            }, 100);
        }

        // Add typing effect to header
        this.addTypingEffect();
    }

    /**
     * Add typing effect to header description
     */
    addTypingEffect() {
        const headerP = document.querySelector('header p');
        if (!headerP) return;

        const originalText = headerP.textContent;
        headerP.textContent = '';
        headerP.style.borderRight = '2px solid #fff';
        headerP.style.animation = 'blink 1s infinite';

        let i = 0;
        const typeWriter = () => {
            if (i < originalText.length) {
                headerP.textContent += originalText.charAt(i);
                i++;
                setTimeout(typeWriter, 30);
            } else {
                headerP.style.borderRight = 'none';
                headerP.style.animation = 'none';
            }
        };
        
        setTimeout(typeWriter, 500);
    }

    /**
     * Initialize Google Sheets API
     */
    async initializeGoogleSheets() {
        try {
            this.sheetsInitialized = await this.googleSheetsAPI.initialize();
            if (this.sheetsInitialized) {
                console.log('Google Sheets API initialized successfully');
                this.enableGoogleSheetsExport();
            } else {
                console.warn('Google Sheets API initialization failed, export features may not work');
                this.disableGoogleSheetsExport();
            }
        } catch (error) {
            console.error('Error initializing Google Sheets API:', error);
            this.sheetsInitialized = false;
            this.disableGoogleSheetsExport();
        }
    }

    /**
     * Enable Google Sheets export with visual feedback
     */
    enableGoogleSheetsExport() {
        const exportToSheetsBtn = document.getElementById('exportToSheets');
        if (exportToSheetsBtn) {
            exportToSheetsBtn.disabled = false;
            exportToSheetsBtn.title = 'Export results to Google Sheets';
            exportToSheetsBtn.style.opacity = '1';
            exportToSheetsBtn.style.cursor = 'pointer';
            
            // Add success indicator
            const icon = exportToSheetsBtn.querySelector('i');
            if (icon) {
                icon.style.color = '#10b981';
                setTimeout(() => {
                    icon.style.color = '';
                }, 2000);
            }
        }
        
        // Update quick search button state based on form validity
        this.updateSearchButtonState();
    }

    /**
     * Disable Google Sheets export when not available
     */
    disableGoogleSheetsExport() {
        const exportToSheetsBtn = document.getElementById('exportToSheets');
        if (exportToSheetsBtn) {
            exportToSheetsBtn.disabled = true;
            exportToSheetsBtn.title = 'Google Sheets integration not available';
            exportToSheetsBtn.style.opacity = '0.5';
            exportToSheetsBtn.style.cursor = 'not-allowed';
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Search form submission
        const searchForm = document.getElementById('searchForm');
        searchForm.addEventListener('submit', (e) => this.handleSearch(e));

        // Quick search and export button
        const quickSearchExportBtn = document.getElementById('quickSearchExport');
        quickSearchExportBtn.addEventListener('click', () => this.handleQuickSearchExport());

        // Real-time input validation
        this.setupInputValidation();

        // Radius unit change handler
        const radiusUnitSelect = document.getElementById('radiusUnit');
        radiusUnitSelect.addEventListener('change', () => this.handleRadiusUnitChange());

        // Export to Google Sheets button
        const exportToSheetsBtn = document.getElementById('exportToSheets');
        exportToSheetsBtn.addEventListener('click', () => this.showSheetsModal());

        // Download CSV button
        const downloadCSVBtn = document.getElementById('downloadCSV');
        downloadCSVBtn.addEventListener('click', () => this.downloadCSV());

        // Modal controls
        const closeModalBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const exportBtn = document.getElementById('exportBtn');
        const sheetsModal = document.getElementById('sheetsModal');

        closeModalBtn.addEventListener('click', () => this.hideSheetsModal());
        cancelBtn.addEventListener('click', () => this.hideSheetsModal());
        exportBtn.addEventListener('click', () => this.handleSheetsExport());

        // Close modal when clicking outside
        sheetsModal.addEventListener('click', (e) => {
            if (e.target === sheetsModal) {
                this.hideSheetsModal();
            }
        });

        // Retry button
        const retryBtn = document.getElementById('retryBtn');
        retryBtn.addEventListener('click', () => this.retrySearch());

        // Handle existing sheet ID input visibility
        const sheetsOptions = document.querySelectorAll('input[name="sheetsOption"]');
        const existingSheetInput = document.getElementById('existingSheetId');
        
        sheetsOptions.forEach(option => {
            option.addEventListener('change', () => {
                existingSheetInput.style.display = 
                    document.querySelector('input[name="sheetsOption"]:checked').value === 'existing' 
                        ? 'block' 
                        : 'none';
                
                // Update validation for sheet ID input
                if (existingSheetInput.style.display === 'block') {
                    existingSheetInput.required = true;
                } else {
                    existingSheetInput.required = false;
                    existingSheetInput.value = '';
                }
            });
        });

        // Add keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    /**
     * Set up real-time input validation
     */
    setupInputValidation() {
        const countryInput = document.getElementById('country');
        const locationInput = document.getElementById('location');
        const radiusInput = document.getElementById('radius');
        const keywordInput = document.getElementById('keyword');
        const maxResultsInput = document.getElementById('maxResults');
        const searchBtn = document.querySelector('.search-btn');

        // Country validation (always valid, but update button state)
        countryInput.addEventListener('change', () => {
            this.updateSearchButtonState();
        });

        // Location validation
        locationInput.addEventListener('input', (e) => {
            const value = e.target.value;
            const isValid = this.validateLocation(value);
            
            this.updateInputValidation(locationInput, isValid, 'Please enter a valid location');
            
            // Enable/disable search button based on form validity
            this.updateSearchButtonState();
        });

        // Radius validation
        radiusInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const radiusUnitSelect = document.getElementById('radiusUnit');
            const unit = radiusUnitSelect.value;
            const maxRadiusMiles = CONFIG.MAX_RADIUS; // 31 miles
            const maxRadiusKm = Math.round(maxRadiusMiles * 1.60934); // ~50 km
            const maxValue = unit === 'kilometers' ? maxRadiusKm : maxRadiusMiles;
            
            const isValid = value >= 1 && value <= maxValue;
            
            this.updateInputValidation(radiusInput, isValid, `Radius must be between 1 and ${maxValue} ${unit}`);
            
            this.updateSearchButtonState();
        });

        // Keyword validation
        keywordInput.addEventListener('input', (e) => {
            const value = e.target.value;
            const isValid = this.validateKeyword(value);
            
            this.updateInputValidation(keywordInput, isValid, 'Please enter a business keyword');
            
            this.updateSearchButtonState();
        });

        // Max results validation
        maxResultsInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const isValid = value >= 10 && value <= CONFIG.MAX_RESULTS;
            
            this.updateInputValidation(maxResultsInput, isValid, `Max results must be between 10 and ${CONFIG.MAX_RESULTS}`);
            
            this.updateSearchButtonState();
        });

        // Add focus effects
        [countryInput, locationInput, radiusInput, keywordInput, maxResultsInput].forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.classList.add('focused');
            });
            
            input.addEventListener('blur', () => {
                input.parentElement.classList.remove('focused');
            });
        });
    }

    /**
     * Update input validation visual feedback
     */
    updateInputValidation(input, isValid, errorMessage) {
        const formGroup = input.closest('.form-group');
        const existingError = formGroup.querySelector('.validation-error');
        
        if (existingError) {
            existingError.remove();
        }

        if (!isValid && input.value.trim() !== '') {
            const errorElement = document.createElement('div');
            errorElement.className = 'validation-error';
            errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${errorMessage}`;
            errorElement.style.color = 'var(--error)';
            errorElement.style.fontSize = '0.85rem';
            errorElement.style.marginTop = '0.25rem';
            errorElement.style.display = 'flex';
            errorElement.style.alignItems = 'center';
            errorElement.style.gap = '0.5rem';
            
            formGroup.appendChild(errorElement);
            
            input.style.borderColor = 'var(--error)';
            input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
        } else {
            input.style.borderColor = '';
            input.style.boxShadow = '';
        }
    }

    /**
     * Check if the search form is valid
     * @returns {boolean} True if form is valid
     */
    isFormValid() {
        const countryInput = document.getElementById('country');
        const locationInput = document.getElementById('location');
        const radiusInput = document.getElementById('radius');
        const radiusUnitSelect = document.getElementById('radiusUnit');
        const keywordInput = document.getElementById('keyword');
        const maxResultsInput = document.getElementById('maxResults');
        
        const isCountryValid = this.validateCountry(countryInput.value);
        const isLocationValid = this.validateLocation(locationInput.value);
        
        // Dynamic radius validation based on unit
        const unit = radiusUnitSelect.value;
        const maxRadiusMiles = CONFIG.MAX_RADIUS; // 31 miles
        const maxRadiusKm = Math.round(maxRadiusMiles * 1.60934); // ~50 km
        const maxValue = unit === 'kilometers' ? maxRadiusKm : maxRadiusMiles;
        const isRadiusValid = parseInt(radiusInput.value) >= 1 && parseInt(radiusInput.value) <= maxValue;
        
        const isKeywordValid = this.validateKeyword(keywordInput.value);
        const isMaxResultsValid = parseInt(maxResultsInput.value) >= 10 && parseInt(maxResultsInput.value) <= CONFIG.MAX_RESULTS;
        
        return isCountryValid && isLocationValid && isRadiusValid && isKeywordValid && isMaxResultsValid;
    }

    /**
     * Update search button state based on form validity
     */
    updateSearchButtonState() {
        const searchBtn = document.querySelector('.search-btn');
        const quickSearchExportBtn = document.getElementById('quickSearchExport');
        const isFormValid = this.isFormValid();
        
        // Update main search button
        if (isFormValid) {
            searchBtn.disabled = false;
            searchBtn.style.opacity = '1';
            searchBtn.style.cursor = 'pointer';
        } else {
            searchBtn.disabled = true;
            searchBtn.style.opacity = '0.6';
            searchBtn.style.cursor = 'not-allowed';
        }
        
        // Update quick search button (only if app is initialized and sheets are available)
        if (quickSearchExportBtn && this.isInitialized && this.sheetsInitialized) {
            if (isFormValid) {
                quickSearchExportBtn.disabled = false;
                quickSearchExportBtn.title = 'Quick search with default settings and export to Google Sheets';
                quickSearchExportBtn.style.opacity = '1';
                quickSearchExportBtn.style.cursor = 'pointer';
            } else {
                quickSearchExportBtn.disabled = true;
                quickSearchExportBtn.title = 'Please fix form errors before using quick search';
                quickSearchExportBtn.style.opacity = '0.5';
                quickSearchExportBtn.style.cursor = 'not-allowed';
            }
        }
    }

    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to submit search
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                const searchForm = document.getElementById('searchForm');
                if (searchForm && !searchForm.classList.contains('hidden')) {
                    e.preventDefault();
                    searchForm.dispatchEvent(new Event('submit'));
                }
            }
            
            // Escape to close modal
            if (e.key === 'Escape') {
                const modal = document.getElementById('sheetsModal');
                if (!modal.classList.contains('hidden')) {
                    this.hideSheetsModal();
                }
            }
        });
    }

    /**
     * Handle search form submission
     * @param {Event} e - Form submission event
     */
    async handleSearch(e) {
        e.preventDefault();
        
        const searchStartTime = performance.now();
        
        const formData = new FormData(e.target);
        const country = formData.get('country');
        const location = formData.get('location').trim();
        const radius = parseInt(formData.get('radius'));
        const radiusUnit = formData.get('radiusUnit');
        const keyword = formData.get('keyword').trim();
        const maxResults = parseInt(formData.get('maxResults'));

        // Validate input
        if (!this.validateCountry(country)) {
            this.showError('Please select a valid country');
            return;
        }

        if (!this.validateLocation(location)) {
            this.showError('Please enter a valid location');
            return;
        }

        // Dynamic radius validation based on unit
        const maxRadiusMiles = CONFIG.MAX_RADIUS; // 31 miles
        const maxRadiusKm = Math.round(maxRadiusMiles * 1.60934); // ~50 km
        const maxValue = radiusUnit === 'kilometers' ? maxRadiusKm : maxRadiusMiles;
        
        if (radius < 1 || radius > maxValue) {
            this.showError(`Search radius must be between 1 and ${maxValue} ${radiusUnit}`);
            return;
        }

        if (!this.validateKeyword(keyword)) {
            this.showError('Please enter a valid business keyword');
            return;
        }

        if (maxResults < 10 || maxResults > CONFIG.MAX_RESULTS) {
            this.showError(`Maximum results must be between 10 and ${CONFIG.MAX_RESULTS}`);
            return;
        }

        // Convert radius to miles if needed
        const radiusInMiles = radiusUnit === 'kilometers' ? radius * 0.621371 : radius;

        // Store current search parameters
        this.currentLocation = location;
        this.currentCountry = country;

        // Show loading state with enhanced animation
        this.showLoadingWithProgress();

        try {
            const searchPhase1Start = performance.now();
            
            // Perform search with progress tracking
            const results = await this.googleMapsAPI.searchBusinesses(
                location, 
                radiusInMiles, 
                keyword,
                maxResults,
                country,
                (percentage, status, details) => {
                    this.updateProgress(percentage, status, details);
                }
            );
            
            const searchPhase1Time = performance.now() - searchPhase1Start;
            console.log(`Phase 1 (Search) completed in ${(searchPhase1Time / 1000).toFixed(2)}s`);
            
            const searchPhase2Start = performance.now();
            
            // Get additional details for each result
            const detailedResults = await this.getDetailedResults(results);
            
            const searchPhase2Time = performance.now() - searchPhase2Start;
            console.log(`Phase 2 (Details) completed in ${(searchPhase2Time / 1000).toFixed(2)}s`);
            
            // Store results
            this.currentResults = detailedResults;
            
            // Display results with animation - use original radius value for display
            this.displayResults(detailedResults, location, radius, radiusUnit, country);
            
            const totalSearchTime = performance.now() - searchStartTime;
            console.log(`Total search completed in ${(totalSearchTime / 1000).toFixed(2)}s`);
            
            // Show success notification
            this.showSearchSuccess(detailedResults.length, totalSearchTime);
            
        } catch (error) {
            console.error('Search error:', error);
            this.showError(this.getErrorMessage(error));
        }
    }

    /**
     * Handle quick search and export functionality
     */
    async handleQuickSearchExport() {
        if (!this.isInitialized) {
            this.showError('Application not initialized. Please refresh the page.');
            return;
        }

        // Check if form is valid
        if (!this.isFormValid()) {
            this.showError('Please fix form errors before using quick search.');
            return;
        }

        // Get form values
        const countryInput = document.getElementById('country');
        const locationInput = document.getElementById('location');
        const country = countryInput.value;
        const location = locationInput.value.trim();

        // Use default search parameters
        const radius = 10;
        const radiusUnit = 'miles';
        const keyword = 'Manufacturer'; // Default keyword
        const maxResults = 200; // Increased from 50 to 200 for quick search

        try {
            this.showLoadingWithProgress();
            this.updateProgress(10, 'Quick search in progress...', `Searching for ${keyword} businesses in ${location}, ${country} (10 mile radius)`);

            const startTime = performance.now();
            
            // Search for businesses with default parameters
            const results = await this.googleMapsAPI.searchBusinesses(
                location, 
                radius, 
                keyword,
                maxResults,
                country,
                (percentage, status, details) => {
                    this.updateProgress(percentage, status, details);
                }
            );
            
            if (results.length === 0) {
                this.hideLoading();
                this.showError(`No ${keyword} businesses found within ${radius} ${radiusUnit} of ${location}, ${country}. Try the full search with different parameters.`);
                return;
            }

            this.updateProgress(50, 'Getting detailed information...', `Found ${results.length} businesses, fetching details...`);

            // Get detailed information for each result
            const detailedResults = await this.getDetailedResults(results);
            
            const endTime = performance.now();
            const searchTime = ((endTime - startTime) / 1000).toFixed(1);

            this.hideLoading();
            this.currentResults = detailedResults;
            this.currentLocation = location;
            this.currentCountry = country;
            
            this.displayResults(detailedResults, location, radius, radiusUnit, country);
            this.showSearchSuccess(detailedResults.length, searchTime);
            
            // Automatically show the export modal
            setTimeout(() => {
                this.showSheetsModal();
            }, 500);
            
        } catch (error) {
            console.error('Quick search error:', error);
            this.showError(this.getErrorMessage(error));
        }
    }

    /**
     * Show search success notification
     */
    showSearchSuccess(resultCount, searchTime) {
        const timeInSeconds = (searchTime / 1000).toFixed(1);
        const message = `Found ${resultCount} business${resultCount !== 1 ? 'es' : ''} in ${timeInSeconds} seconds! 🎉`;
        
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'search-success';
        successDiv.innerHTML = `
            <div class="success-content">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Style the success message
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--success-gradient);
            color: white;
            padding: 1rem 2rem;
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-xl);
            z-index: 1001;
            animation: slideInDown 0.5s ease-out;
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(successDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            successDiv.style.animation = 'slideOutUp 0.5s ease-in';
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.parentNode.removeChild(successDiv);
                }
            }, 500);
        }, 3000);
    }

    /**
     * Get detailed information for search results - OPTIMIZED VERSION
     * @param {Array} results - Basic search results
     * @returns {Promise<Array>} Detailed results
     */
    async getDetailedResults(results) {
        if (results.length === 0) return results;
        
        // Limit the number of results to get details for to improve performance
        const maxResultsForDetails = Math.min(results.length, CONFIG.MAX_DETAILED_RESULTS);
        const resultsToProcess = results.slice(0, maxResultsForDetails);
        
        this.updateProgress(95, 'Fetching additional details...', `Processing ${resultsToProcess.length} results`);
        
        // Process in parallel batches to avoid overwhelming the API
        const batchSize = 5;
        const detailedResults = [];
        
        for (let i = 0; i < resultsToProcess.length; i += batchSize) {
            const batch = resultsToProcess.slice(i, i + batchSize);
            const batchPromises = batch.map(async (result) => {
                try {
                    const details = await this.googleMapsAPI.getPlaceDetails(result.place_id);
                    return {
                        ...result,
                        // Update with additional details if not already present
                        formatted_phone_number: details.phone || result.formatted_phone_number,
                        website: details.website || result.website,
                        opening_hours: details.hours || result.opening_hours,
                        rating: details.rating || result.rating,
                        user_ratings_total: details.userRatingCount || result.user_ratings_total,
                        types: details.types.length > 0 ? details.types : result.types,
                        price_level: details.priceLevel || result.price_level,
                        business_status: details.businessStatus || result.business_status,
                        primary_type: details.primaryType || result.primary_type,
                        primary_type_display_name: details.primaryTypeDisplayName || result.primary_type_display_name
                    };
                } catch (error) {
                    console.warn(`Failed to get details for ${result.name}:`, error);
                    return result;
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            detailedResults.push(...batchResults);
            
            // Update progress
            const progress = 95 + ((i + batchSize) / resultsToProcess.length) * 5;
            this.updateProgress(progress, 'Fetching additional details...', `Processed ${Math.min(i + batchSize, resultsToProcess.length)} of ${resultsToProcess.length}`);
            
            // Small delay between batches to avoid rate limiting
            if (i + batchSize < resultsToProcess.length) {
                await this.delay(100);
            }
        }
        
        // Add remaining results without details
        if (results.length > maxResultsForDetails) {
            detailedResults.push(...results.slice(maxResultsForDetails));
        }
        
        return detailedResults;
    }

    /**
     * Display search results
     * @param {Array} results - Search results
     * @param {string} location - Searched location
     * @param {number} radius - Search radius in miles
     * @param {string} radiusUnit - Radius unit
     * @param {string} country - Searched country
     */
    displayResults(results, location, radius, radiusUnit, country) {
        this.hideLoading();
        this.hideError();
        this.showResults();

        const resultsList = document.getElementById('resultsList');
        const resultsCount = document.getElementById('resultsCount');

        // Update results count
        const unitText = radiusUnit === 'kilometers' ? 'km' : 'miles';
        resultsCount.textContent = `Found ${results.length} business${results.length !== 1 ? 'es' : ''} within ${radius} ${unitText} of ${location}, ${country}`;

        // Clear previous results
        resultsList.innerHTML = '';

        if (results.length === 0) {
            resultsList.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No Results Found</h3>
                    <p>No businesses were found within ${radius} ${unitText} of ${location}, ${country}. Try increasing the search radius or checking the location.</p>
                </div>
            `;
            return;
        }

        // Create result cards with staggered animation
        results.forEach((result, index) => {
            const card = this.createResultCard(result, index, radiusUnit);
            resultsList.appendChild(card);

            // Add staggered animation
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    /**
     * Create a result card for a business
     * @param {Object} result - Business result data
     * @param {number} index - Result index
     * @param {string} radiusUnit - Radius unit (miles or kilometers)
     * @returns {HTMLElement} Result card element
     */
    createResultCard(result, index, radiusUnit = 'miles') {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.3s ease';

        const rating = result.rating || 0;
        const reviewCount = result.user_ratings_total || 0;
        const priceLevel = result.price_level || 0;
        const priceText = priceLevel > 0 ? '💰'.repeat(priceLevel) : '';

        // Convert distance to appropriate unit if needed
        let distanceText = 'Distance not available';
        if (result.distance) {
            if (radiusUnit === 'kilometers') {
                const distanceKm = result.distance * 1.60934; // Convert miles to km
                distanceText = `${distanceKm.toFixed(1)} km away`;
            } else {
                distanceText = `${result.distance.toFixed(1)} miles away`;
            }
        }

        card.innerHTML = `
            <div class="card-header">
                <div class="business-info">
                    <h3 class="business-name">
                        <i class="fas fa-building"></i>
                        ${this.escapeHtml(result.name)}
                    </h3>
                    <div class="business-meta">
                        ${rating > 0 ? `
                            <div class="rating">
                                ${this.createRatingStars(rating)}
                                <span class="rating-text">${rating.toFixed(1)} (${reviewCount} reviews)</span>
                            </div>
                        ` : ''}
                        ${priceText ? `<div class="price-level">${priceText}</div>` : ''}
                    </div>
                </div>
                <div class="business-type">
                    <span class="type-badge">${this.escapeHtml(result.types ? result.types[0] : 'Business')}</span>
                </div>
            </div>

            <div class="card-body">
                <div class="contact-info">
                    <div class="contact-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${this.escapeHtml(result.vicinity || result.formatted_address || 'Address not available')}</span>
                    </div>
                    
                    ${result.formatted_phone_number ? `
                        <div class="contact-item">
                            <i class="fas fa-phone"></i>
                            <a href="tel:${result.formatted_phone_number}" class="contact-link">
                                ${this.escapeHtml(result.formatted_phone_number)}
                            </a>
                        </div>
                    ` : ''}
                    
                    ${result.website ? `
                        <div class="contact-item">
                            <i class="fas fa-globe"></i>
                            <a href="${result.website}" target="_blank" rel="noopener noreferrer" class="contact-link">
                                ${this.escapeHtml(result.website)}
                            </a>
                        </div>
                    ` : ''}
                    
                    ${result.email ? `
                        <div class="contact-item">
                            <i class="fas fa-envelope"></i>
                            <a href="mailto:${result.email}" class="contact-link">
                                ${this.escapeHtml(result.email)}
                            </a>
                        </div>
                    ` : ''}
                </div>

                ${result.opening_hours ? `
                    <div class="hours-info">
                        <h4><i class="fas fa-clock"></i> Hours</h4>
                        <div class="hours-content">
                            ${this.createHoursHtml(result.opening_hours)}
                        </div>
                    </div>
                ` : ''}

                ${result.editorial_summary ? `
                    <div class="description">
                        <h4><i class="fas fa-info-circle"></i> About</h4>
                        <p>${this.escapeHtml(result.editorial_summary.overview)}</p>
                    </div>
                ` : ''}

                ${result.photos && result.photos.length > 0 ? `
                    <div class="photos">
                        <h4><i class="fas fa-images"></i> Photos</h4>
                        <div class="photo-grid">
                            ${result.photos.slice(0, 3).map(photo => `
                                <img src="${photo.getUrl({maxWidth: 200, maxHeight: 150})}" 
                                     alt="Business photo" 
                                     loading="lazy"
                                     class="business-photo">
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="card-footer">
                <div class="distance">
                    <i class="fas fa-ruler"></i>
                    ${distanceText}
                </div>
                <div class="actions">
                    ${result.place_id ? `
                        <a href="https://www.google.com/maps/place/?q=place_id:${result.place_id}" 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           class="btn btn-small btn-secondary">
                            <i class="fas fa-map"></i> View on Maps
                        </a>
                    ` : ''}
                </div>
            </div>
        `;

        return card;
    }

    /**
     * Create rating stars HTML
     * @param {number} rating - Rating value
     * @returns {string} Stars HTML
     */
    createRatingStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }

        return stars;
    }

    /**
     * Create hours HTML
     * @param {Array} hours - Hours data
     * @returns {string} Hours HTML
     */
    createHoursHtml(hours) {
        if (!hours || hours.length === 0) return '';

        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const todayHours = hours.find(h => h.day === today);
        
        if (todayHours) {
            return `Today: ${todayHours.hours}`;
        }
        
        return hours[0] ? `${hours[0].day}: ${hours[0].hours}` : '';
    }

    /**
     * Show Google Sheets export modal
     */
    showSheetsModal() {
        if (!this.isInitialized) {
            this.showError('Application not initialized. Please refresh the page.');
            return;
        }

        if (!this.sheetsInitialized) {
            this.showError('Google Sheets integration is not available. Please refresh the page and try again.');
            return;
        }

        const modal = document.getElementById('sheetsModal');
        modal.classList.remove('hidden');
    }

    /**
     * Hide Google Sheets export modal
     */
    hideSheetsModal() {
        const modal = document.getElementById('sheetsModal');
        modal.classList.add('hidden');
        
        // Reset form
        document.querySelector('input[name="sheetsOption"][value="new"]').checked = true;
        document.getElementById('existingSheetId').value = '';
        document.getElementById('existingSheetId').style.display = 'none';
    }

    /**
     * Handle Google Sheets export
     */
    async handleSheetsExport() {
        if (this.currentResults.length === 0) {
            this.showError('No results to export. Please perform a search first.');
            return;
        }

        if (!this.sheetsInitialized) {
            this.showError('Google Sheets integration is not available. Please refresh the page and try again.');
            return;
        }

        const exportBtn = document.getElementById('exportBtn');
        const originalText = exportBtn.innerHTML;
        
        try {
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            exportBtn.disabled = true;

            // Check authorization
            if (!this.googleSheetsAPI.isUserAuthorized()) {
                const authorized = await this.googleSheetsAPI.requestAuthorization();
                if (!authorized) {
                    throw new Error('Failed to authorize Google Sheets access');
                }
            }

            // Get export options
            const option = document.querySelector('input[name="sheetsOption"]:checked').value;
            const existingSheetId = document.getElementById('existingSheetId').value.trim();
            
            const options = {};
            if (option === 'existing' && existingSheetId) {
                options.spreadsheetId = this.googleSheetsAPI.extractSpreadsheetId(existingSheetId);
            }

            // Export to sheets
            const result = await this.googleSheetsAPI.exportToSheets(this.currentResults, this.currentLocation, {
                ...options,
                country: this.currentCountry
            });
            
            // Show success message
            this.hideSheetsModal();
            this.showSuccess(`Successfully exported ${result.rowsAdded} rows to Google Sheets!`, result.spreadsheetUrl);
            
        } catch (error) {
            console.error('Export error:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        }
    }

    /**
     * Download CSV file
     */
    downloadCSV() {
        if (this.currentResults.length === 0) {
            this.showError('No results to download. Please perform a search first.');
            return;
        }

        try {
            this.googleSheetsAPI.downloadCSV(this.currentResults, this.currentLocation, this.currentCountry);
        } catch (error) {
            console.error('CSV download error:', error);
            this.showError('Failed to download CSV file.');
        }
    }

    /**
     * Retry the last search
     */
    retrySearch() {
        this.hideError();
        const searchForm = document.getElementById('searchForm');
        searchForm.dispatchEvent(new Event('submit'));
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.hideResults();
        this.hideError();
        document.getElementById('loadingSection').classList.remove('hidden');
        document.getElementById('loadingSection').classList.add('fade-in');
    }

    /**
     * Show loading state with progress indicator
     */
    showLoadingWithProgress() {
        this.showLoading();
        document.getElementById('progressContainer').classList.remove('hidden');
        this.updateProgress(0, 'Initializing search...');
    }

    /**
     * Update progress indicator
     * @param {number} percentage - Progress percentage (0-100)
     * @param {string} status - Status message
     * @param {string} details - Additional details
     */
    updateProgress(percentage, status, details = '') {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const progressDetails = document.getElementById('progressDetails');
        
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = status;
        progressDetails.textContent = details;
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        document.getElementById('loadingSection').classList.add('hidden');
        document.getElementById('progressContainer').classList.add('hidden');
    }

    /**
     * Show results section
     */
    showResults() {
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.classList.remove('hidden');
    }

    /**
     * Hide results section
     */
    hideResults() {
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.classList.add('hidden');
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.hideLoading();
        this.hideResults();
        
        const errorSection = document.getElementById('errorSection');
        const errorText = document.getElementById('errorText');
        
        errorText.textContent = message;
        errorSection.classList.remove('hidden');
    }

    /**
     * Hide error message
     */
    hideError() {
        const errorSection = document.getElementById('errorSection');
        errorSection.classList.add('hidden');
    }

    /**
     * Show success message
     * @param {string} message - Success message
     * @param {string} url - Optional URL to show
     */
    showSuccess(message, url = null) {
        // Create temporary success notification
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.innerHTML = `
            <div class="success-content">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
                ${url ? `<a href="${url}" target="_blank" class="success-link">View Spreadsheet</a>` : ''}
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;
        
        const successContent = notification.querySelector('.success-content');
        successContent.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        const successLink = notification.querySelector('.success-link');
        if (successLink) {
            successLink.style.cssText = `
                color: white;
                text-decoration: underline;
                margin-left: 10px;
            `;
        }
        
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 5000);
    }

    /**
     * Validate location format
     * @param {string} location - Location to validate
     * @returns {boolean} Validation result
     */
    validateLocation(location) {
        // Location should not be empty and should have at least 2 characters
        return location && location.trim().length >= 2;
    }

    /**
     * Validate keyword format
     * @param {string} keyword - Keyword to validate
     * @returns {boolean} Validation result
     */
    validateKeyword(keyword) {
        // Keyword should not be empty and should have at least 2 characters
        return keyword && keyword.trim().length >= 2;
    }

    /**
     * Validate country selection
     * @param {string} country - Country code to validate
     * @returns {boolean} Validation result
     */
    validateCountry(country) {
        // Country should not be empty
        return country && country.trim().length > 0;
    }

    /**
     * Get user-friendly error message
     * @param {Error} error - Error object
     * @returns {string} User-friendly error message
     */
    getErrorMessage(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('api quota exceeded') || message.includes('over_query_limit')) {
            return 'Google Maps API quota exceeded. Please try again later.';
        }
        
        if (message.includes('invalid request') || message.includes('invalid_parameter')) {
            return 'Invalid search parameters. Please check your input and try again.';
        }
        
        if (message.includes('request denied') || message.includes('access_denied')) {
            return 'Access denied. Please check your API key configuration.';
        }
        
        if (message.includes('not found') || message.includes('zero_results')) {
            return 'No auto shops found in the specified area. Try increasing the search radius.';
        }
        
        if (message.includes('network') || message.includes('fetch')) {
            return 'Network error. Please check your internet connection and try again.';
        }
        
        if (message.includes('google api not properly loaded')) {
            return 'Google Sheets integration is not available. Please refresh the page and try again.';
        }
        
        return 'An unexpected error occurred. Please try again.';
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
     * Handle radius unit change
     */
    handleRadiusUnitChange() {
        const radiusInput = document.getElementById('radius');
        const radiusUnitSelect = document.getElementById('radiusUnit');
        const radiusGroup = radiusInput.closest('.form-group');
        const helpText = radiusGroup.querySelector('.form-help');
        
        const unit = radiusUnitSelect.value;
        const maxRadiusMiles = CONFIG.MAX_RADIUS; // 31 miles
        const maxRadiusKm = Math.round(maxRadiusMiles * 1.60934); // ~50 km
        
        if (unit === 'kilometers') {
            radiusInput.max = maxRadiusKm;
            helpText.textContent = `Maximum radius: ${maxRadiusKm} kilometers (Google Places API limit)`;
        } else {
            radiusInput.max = maxRadiusMiles;
            helpText.textContent = `Maximum radius: ${maxRadiusMiles} miles (Google Places API limit)`;
        }
        
        // Re-validate the current radius value
        const currentValue = parseInt(radiusInput.value);
        const maxValue = parseInt(radiusInput.max);
        
        if (currentValue > maxValue) {
            radiusInput.value = maxValue;
        }
        
        // Trigger validation update
        this.updateInputValidation(radiusInput, currentValue <= maxValue, `Radius must be between 1 and ${maxValue} ${unit}`);
        this.updateSearchButtonState();
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BusinessDataCollector();
}); 