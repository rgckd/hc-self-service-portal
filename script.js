/**
 * HC Self-Service Portal - Frontend JavaScript
 * Handles program selection, email verification, request selection, and form submission
 */

// Configuration
const CONFIG = {
    // Replace with your deployed Google Apps Script Web App URL
    API_URL: 'https://script.google.com/macros/s/AKfycbwJ-WQD61TAqxxgA3vN6f-F8RQzQgJsYZTTK3_YdTd7dFqcMs7CwSz9he1ecZYjvMOsbg/exec',
    // Replace with your reCAPTCHA v3 Site Key
    RECAPTCHA_SITE_KEY: '6Ld11zssAAAAAMa8hkYJHz1AWvXuUh_WIfad0zbT'
};

// State management
const state = {
    programs: [],
    currentProgram: null,
    isEmailVerified: false,
    requests: []
};

// DOM Elements
const elements = {
    form: document.getElementById('portalForm'),
    programSelect: document.getElementById('program'),
    emailInput: document.getElementById('email'),
    emailStatus: document.getElementById('emailStatus'),
    requestsSection: document.getElementById('requestsSection'),
    requestsContainer: document.getElementById('requestsContainer'),
    submitBtn: document.getElementById('submitBtn'),
    message: document.getElementById('message'),
    honeypot: document.querySelector('.honeypot')
};

/**
 * Initialize the portal on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
    await loadPrograms();
    attachEventListeners();
});

/**
 * Attach event listeners to form elements
 */
function attachEventListeners() {
    elements.programSelect.addEventListener('change', handleProgramChange);
    elements.emailInput.addEventListener('blur', handleEmailVerification);
    elements.form.addEventListener('submit', handleFormSubmit);
}

/**
 * Load available programs from the backend
 */
async function loadPrograms() {
    try {
        showMessage('Loading programs...', 'info');
        
        const response = await makeAPICall({
            action: 'getPrograms'
        });

        if (response.success && response.programs.length > 0) {
            state.programs = response.programs;
            populateProgramDropdown(response.programs);
            hideMessage();
        } else {
            showMessage('No active programs available at this time.', 'error');
            elements.programSelect.innerHTML = '<option value="">No programs available</option>';
        }
    } catch (error) {
        showMessage('Error loading programs. Please refresh the page.', 'error');
        console.error('Load programs error:', error);
    }
}

/**
 * Populate program dropdown with available programs
 */
function populateProgramDropdown(programs) {
    elements.programSelect.innerHTML = '<option value="">-- Select a Program --</option>';
    
    programs.forEach(program => {
        const option = document.createElement('option');
        option.value = program;
        option.textContent = program;
        elements.programSelect.appendChild(option);
    });
}

/**
 * Handle program selection change
 */
function handleProgramChange(event) {
    state.currentProgram = event.target.value;
    
    // Reset state when program changes
    state.isEmailVerified = false;
    elements.emailInput.value = '';
    elements.emailStatus.innerHTML = '';
    elements.requestsSection.classList.add('hidden');
    elements.submitBtn.disabled = true;
    hideMessage();
}

/**
 * Handle email verification
 */
async function handleEmailVerification() {
    const email = elements.emailInput.value.trim();
    const program = state.currentProgram;

    // Clear previous status
    elements.emailStatus.innerHTML = '';
    elements.requestsSection.classList.add('hidden');
    state.isEmailVerified = false;
    elements.submitBtn.disabled = true;

    // Validate inputs
    if (!program) {
        showMessage('Please select a program first.', 'error');
        return;
    }

    if (!email || !isValidEmail(email)) {
        showMessage('Please enter a valid email address.', 'error');
        return;
    }

    try {
        elements.emailStatus.innerHTML = '<p class="loading">Verifying email...</p>';

        const response = await makeAPICall({
            action: 'verifyEmail',
            program: program,
            email: email
        });

        if (response.success) {
            if (response.registered) {
                // Email is registered - proceed to load requests
                state.isEmailVerified = true;
                elements.emailStatus.innerHTML = '<p style="color: green;">✓ Email verified successfully!</p>';
                await loadRequests(program);
            } else {
                // Email not registered
                state.isEmailVerified = false;
                
                if (response.registrationUrl) {
                    // Show registration link
                    elements.emailStatus.innerHTML = `
                        <p style="color: #d68910;">⚠ Email not found.</p>
                        <a href="${response.registrationUrl}" target="_blank" class="registration-link">
                            Click here to register for this program
                        </a>
                    `;
                } else {
                    // Registration is closed
                    elements.emailStatus.innerHTML = '<p style="color: #d32f2f;">✗ Email not found and registration is currently closed.</p>';
                }
            }
        } else {
            showMessage(response.message || 'Error verifying email.', 'error');
        }
    } catch (error) {
        showMessage('Error verifying email. Please try again.', 'error');
        console.error('Email verification error:', error);
    }
}

/**
 * Load available requests for the selected program
 */
async function loadRequests(program) {
    try {
        const response = await makeAPICall({
            action: 'getRequests',
            program: program
        });

        if (response.success && response.requests.length > 0) {
            state.requests = response.requests;
            displayRequests(response.requests);
            elements.requestsSection.classList.remove('hidden');
        } else {
            showMessage('No requests available for this program at this time.', 'info');
        }
    } catch (error) {
        showMessage('Error loading requests. Please try again.', 'error');
        console.error('Load requests error:', error);
    }
}

/**
 * Display request checkboxes
 */
function displayRequests(requests) {
    elements.requestsContainer.innerHTML = '';

    requests.forEach((request, index) => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `request-${index}`;
        checkbox.value = request;
        checkbox.name = 'requests';
        checkbox.addEventListener('change', validateForm);

        const label = document.createElement('label');
        label.htmlFor = `request-${index}`;
        label.textContent = request;

        div.appendChild(checkbox);
        div.appendChild(label);
        elements.requestsContainer.appendChild(div);
    });
}

/**
 * Validate form and enable/disable submit button
 */
function validateForm() {
    const selectedRequests = getSelectedRequests();
    elements.submitBtn.disabled = !(state.isEmailVerified && selectedRequests.length > 0);
}

/**
 * Get selected requests from checkboxes
 */
function getSelectedRequests() {
    const checkboxes = document.querySelectorAll('input[name="requests"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    // Check honeypot
    if (elements.honeypot.value !== '') {
        console.warn('Honeypot triggered - potential bot detected');
        showMessage('Submission failed. Please try again.', 'error');
        return;
    }

    const program = state.currentProgram;
    const email = elements.emailInput.value.trim();
    const selectedRequests = getSelectedRequests();

    // Final validation
    if (!program || !email || selectedRequests.length === 0) {
        showMessage('Please complete all required fields.', 'error');
        return;
    }

    try {
        elements.submitBtn.disabled = true;
        elements.submitBtn.textContent = 'Submitting...';

        // Get reCAPTCHA token
        const recaptchaToken = await getRecaptchaToken();

        // Submit to backend
        const response = await makeAPICall({
            action: 'submitRequest',
            program: program,
            email: email,
            requests: selectedRequests,
            recaptchaToken: recaptchaToken
        });

        if (response.success) {
            showMessage('✓ Your request has been submitted successfully!', 'success');
            resetForm();
        } else {
            showMessage(response.message || 'Submission failed. Please try again.', 'error');
            elements.submitBtn.disabled = false;
            elements.submitBtn.textContent = 'Submit Request';
        }
    } catch (error) {
        showMessage('Error submitting request. Please try again.', 'error');
        console.error('Submit error:', error);
        elements.submitBtn.disabled = false;
        elements.submitBtn.textContent = 'Submit Request';
    }
}

/**
 * Get reCAPTCHA v3 token
 */
function getRecaptchaToken() {
    return new Promise((resolve, reject) => {
        try {
            grecaptcha.ready(() => {
                grecaptcha.execute(CONFIG.RECAPTCHA_SITE_KEY, { action: 'submit' })
                    .then(token => resolve(token))
                    .catch(error => reject(error));
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Make API call to Google Apps Script backend
 */
async function makeAPICall(payload) {
    const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

/**
 * Display message to user
 */
function showMessage(text, type = 'info') {
    elements.message.textContent = text;
    elements.message.className = `message ${type} show`;
}

/**
 * Hide message
 */
function hideMessage() {
    elements.message.className = 'message';
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Reset form after successful submission
 */
function resetForm() {
    elements.form.reset();
    elements.requestsSection.classList.add('hidden');
    elements.emailStatus.innerHTML = '';
    state.isEmailVerified = false;
    state.currentProgram = null;
    elements.submitBtn.disabled = true;
    elements.submitBtn.textContent = 'Submit Request';
}
