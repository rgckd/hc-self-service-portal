/**
 * HC Self-Service Portal - Google Apps Script Backend
 * 
 * This script handles all backend operations for the HC Self-Service Portal:
 * - Program retrieval (with date-based validity)
 * - Email verification against registration sheets
 * - Request retrieval (with date-based validity)
 * - Request submission with reCAPTCHA verification
 */

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
  // Sheet names (Apps Script is bound to the spreadsheet containing these sheets)
  MASTER_SHEET_NAME: 'MASTER',
  OUTPUT_SHEET_NAME: 'NewPortalRequests',
  
  // reCAPTCHA Secret Key (stored in Script Properties for security)
  // Set via: Project Settings > Script Properties > Add: RECAPTCHA_SECRET
  RECAPTCHA_THRESHOLD: 0.5 // Minimum score (0.0 to 1.0)
};

// ========================================
// HELPER FUNCTIONS FOR JSON RESPONSES
// ========================================

/**
 * Create a JSON response object
 * @param {Object} obj - Object to return as JSON
 * @returns {TextOutput} ContentService JSON response
 */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Create a JSON error response
 * @param {string} message - Error message
 * @returns {TextOutput} ContentService JSON response with success: false
 */
function jsonError(message) {
  return jsonResponse({ success: false, message: message });
}

// ========================================
// MAIN ENTRY POINT
// ========================================

/**
 * Serve the HTML interface using Google Apps Script HTML Service
 * This eliminates CORS by serving frontend and backend from the same origin
 * @returns {HtmlOutput} The HTML interface
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('HC Self-Service Portal')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Handle POST requests from the frontend
 * ALWAYS returns JSON via ContentService in every code path
 * @param {Object} e - Event object containing request data
 * @returns {TextOutput} JSON response (ContentService)
 */
function doPost(e) {
  try {
    Logger.log('doPost called with action: ' + (e.parameter.action || 'NONE'));
    
    // Check for honeypot (anti-spam)
    if (e.parameter.honey && e.parameter.honey.length > 0) {
      Logger.log('Honeypot triggered - blocking request');
      return jsonError('Submission blocked');
    }
    
    // Get action from form parameters
    const action = e.parameter.action;
    
    // Validate action exists
    if (!action) {
      Logger.log('Missing action parameter');
      return jsonError('Missing action parameter');
    }
    
    Logger.log('Processing action: ' + action);
    
    // Route to appropriate handler - EACH MUST RETURN JSON
    switch (action) {
      case 'getPrograms':
        return handleGetPrograms();
        
      case 'verifyEmail':
        return handleVerifyEmail(e.parameter.program, e.parameter.email);
        
      case 'getRequests':
        return handleGetRequests(e.parameter.program);
        
      case 'submitRequest':
        // Handle multiple requests array
        const requests = e.parameter.requests;
        const requestsArray = Array.isArray(requests) ? requests : (requests ? [requests] : []);
        return handleSubmitRequest(
          e.parameter.program,
          e.parameter.email,
          requestsArray,
          e.parameter.recaptchaToken
        );
        
      default:
        Logger.log('Unknown action: ' + action);
        return jsonError('Unknown action: ' + action);
    }
    
  } catch (err) {
    Logger.log('doPost EXCEPTION: ' + err.toString() + ' | ' + err.stack);
    return jsonError('Server error: ' + err.message);
  }
}

// ========================================
// ACTION HANDLERS (ALL RETURN JSON OBJECTS)
// ========================================

/**
 * Handle getPrograms action
 * @returns {TextOutput} JSON response
 */
function handleGetPrograms() {
  try {
    const masterData = getMasterSheetData();
    const programs = [];
    
    // Filter for valid PROGRAM records
    masterData.forEach(row => {
      if (row.Record_Type === 'PROGRAM' && 
          isRecordValid(row.Valid_From, row.Valid_Till)) {
        programs.push(row.Record_Name);
      }
    });
    
    Logger.log('Found ' + programs.length + ' valid programs');
    return jsonResponse({
      success: true,
      programs: programs
    });
    
  } catch (error) {
    Logger.log('handleGetPrograms error: ' + error.toString());
    return jsonError('Error loading programs: ' + error.message);
  }
}

/**
 * Handle verifyEmail action
 * @returns {TextOutput} JSON response
 */
function handleVerifyEmail(program, email) {
  try {
    if (!program || !email) {
      return jsonError('Program and email are required');
    }
    
    const masterData = getMasterSheetData();
    
    // Find valid REGISTER record for this program
    let registerRecord = null;
    masterData.forEach(row => {
      if (row.Group === program && 
          row.Record_Type === 'REGISTER' &&
          isRecordValid(row.Valid_From, row.Valid_Till)) {
        registerRecord = row;
      }
    });
    
    if (!registerRecord || !registerRecord.Content) {
      return jsonError('Registration sheet not found for this program');
    }
    
    // Extract Sheet ID from URL
    const sheetId = extractSheetId(registerRecord.Content);
    if (!sheetId) {
      return jsonError('Invalid registration sheet URL');
    }
    
    // Check if email exists in registration sheet
    const isRegistered = checkEmailInSheet(sheetId, email);
    
    if (isRegistered) {
      Logger.log('Email verified: ' + email);
      return jsonResponse({
        success: true,
        registered: true
      });
    } else {
      // Email not found - check if registration form is available
      let regFormUrl = null;
      
      masterData.forEach(row => {
        if (row.Group === program && 
            row.Record_Type === 'REGFORM' &&
            isRecordValid(row.Valid_From, row.Valid_Till)) {
          regFormUrl = row.Content;
        }
      });
      
      Logger.log('Email not found, registration form available: ' + (regFormUrl ? 'yes' : 'no'));
      return jsonResponse({
        success: true,
        registered: false,
        registrationUrl: regFormUrl || null
      });
    }
    
  } catch (error) {
    Logger.log('handleVerifyEmail error: ' + error.toString());
    return jsonError('Error verifying email: ' + error.message);
  }
}

/**
 * Handle getRequests action
 * @returns {TextOutput} JSON response
 */
function handleGetRequests(program) {
  try {
    if (!program) {
      return jsonError('Program is required');
    }
    
    const masterData = getMasterSheetData();
    const requests = [];
    
    // Filter for valid REQUEST records for this program
    masterData.forEach(row => {
      if (row.Group === program && 
          row.Record_Type === 'REQUEST' &&
          isRecordValid(row.Valid_From, row.Valid_Till)) {
        requests.push(row.Record_Name);
      }
    });
    
    Logger.log('Found ' + requests.length + ' valid requests for program: ' + program);
    return jsonResponse({
      success: true,
      requests: requests
    });
    
  } catch (error) {
    Logger.log('handleGetRequests error: ' + error.toString());
    return jsonError('Error loading requests: ' + error.message);
  }
}

/**
 * Handle submitRequest action
 * @returns {TextOutput} JSON response
 */
function handleSubmitRequest(program, email, requests, recaptchaToken) {
  try {
    // Validate inputs
    if (!program || !email || !requests || requests.length === 0) {
      return jsonError('All fields are required');
    }
    
    // Verify reCAPTCHA
    if (!verifyRecaptcha(recaptchaToken)) {
      Logger.log('reCAPTCHA verification failed for: ' + email);
      return jsonError('Security verification failed. Please try again.');
    }
    
    // Append to output sheet
    const outputSheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG.OUTPUT_SHEET_NAME);
    
    if (!outputSheet) {
      return jsonError('Output sheet not found');
    }
    
    // Prepare row data
    const timestamp = new Date();
    const requestsText = requests.join(', ');
    
    // Append row: [Timestamp, Program, Email, Requests]
    outputSheet.appendRow([
      timestamp,
      program,
      email,
      requestsText
    ]);
    
    Logger.log('Request submitted by ' + email + ' for program ' + program);
    return jsonResponse({
      success: true,
      message: 'Request submitted successfully'
    });
    
  } catch (error) {
    Logger.log('handleSubmitRequest error: ' + error.toString());
    return jsonError('Error submitting request: ' + error.message);
  }
}

// ========================================
// CORE UTILITY FUNCTIONS
// ========================================

/**
 * Check if a record is valid based on Valid_From and Valid_Till dates
 * @param {Date|string|null} validFrom - Start date (or null/blank)
 * @param {Date|string|null} validTill - End date (or null/blank)
 * @returns {boolean} True if record is currently valid
 */
function isRecordValid(validFrom, validTill) {
  // Get current date (normalized to midnight)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check Valid_From
  if (validFrom) {
    const fromDate = new Date(validFrom);
    fromDate.setHours(0, 0, 0, 0);
    
    if (fromDate > today) {
      return false; // Not yet valid
    }
  }
  
  // Check Valid_Till
  if (validTill) {
    const tillDate = new Date(validTill);
    tillDate.setHours(0, 0, 0, 0);
    
    if (tillDate < today) {
      return false; // No longer valid
    }
  }
  
  // If both checks passed (or fields were blank), record is valid
  return true;
}

/**
 * Get the Portal MASTER sheet data
 * @returns {Array} Array of row objects with headers as keys
 */
function getMasterSheetData() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG.MASTER_SHEET_NAME);
    
    if (!sheet) {
      throw new Error(`Master sheet '${CONFIG.MASTER_SHEET_NAME}' not found`);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = [];
    
    // Convert to array of objects
    for (let i = 1; i < data.length; i++) {
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      rows.push(row);
    }
    
    return rows;
  } catch (error) {
    Logger.log('getMasterSheetData error: ' + error.toString());
    throw error;
  }
}

/**
 * Verify reCAPTCHA token
 * @param {string} token - reCAPTCHA token from frontend
 * @returns {boolean} True if verification passes
 */
function verifyRecaptcha(token) {
  if (!token) {
    return false;
  }
  
  try {
    // Get reCAPTCHA secret from Script Properties
    const recaptchaSecret = PropertiesService.getScriptProperties().getProperty('RECAPTCHA_SECRET');
    
    if (!recaptchaSecret) {
      Logger.log('RECAPTCHA_SECRET not found in Script Properties');
      return false;
    }
    
    const url = 'https://www.google.com/recaptcha/api/siteverify';
    const payload = {
      secret: recaptchaSecret,
      response: token
    };
    
    const options = {
      method: 'post',
      payload: payload,
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    
    // Check if verification succeeded and score meets threshold
    return result.success === true && 
           (result.score >= CONFIG.RECAPTCHA_THRESHOLD);
           
  } catch (error) {
    Logger.log('verifyRecaptcha error: ' + error.toString());
    return false;
  }
}

// ========================================
// ACTION HANDLERS
// ========================================
// Old handler functions removed - see new handleGetPrograms, handleVerifyEmail, etc. above

/**
 * Extract Google Sheet ID from URL
 * @param {string} url - Google Sheets URL
 * @returns {string|null} Sheet ID or null if invalid
 */
function extractSheetId(url) {
  try {
    if (!url) return null;
    
    // Match pattern: /spreadsheets/d/{ID}/
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  } catch (error) {
    Logger.log('extractSheetId error: ' + error.toString());
    return null;
  }
}

/**
 * Check if email exists in a registration sheet (case-insensitive)
 * Assumes email is in the first column
 * @param {string} sheetId - Google Sheet ID
 * @param {string} email - Email to search for
 * @returns {boolean} True if email found
 */
function checkEmailInSheet(sheetId, email) {
  try {
    const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    const emailLower = email.toLowerCase().trim();
    
    // Search for email (case-insensitive, skip header row)
    for (let i = 1; i < data.length; i++) {
      const cellValue = String(data[i][0]).toLowerCase().trim();
      if (cellValue === emailLower) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    Logger.log('checkEmailInSheet error: ' + error.toString());
    return false;
  }
}

// ========================================
// TESTING FUNCTIONS (Optional)
// ========================================

/**
 * Test isRecordValid function
 */
function testIsRecordValid() {
  const today = new Date();
  
  // Test cases
  console.log('Both blank (should be true):', isRecordValid(null, null));
  
  const pastDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  
  console.log('Past to Future (should be true):', isRecordValid(pastDate, futureDate));
  console.log('Future to Future (should be false):', isRecordValid(futureDate, futureDate));
  console.log('Past to Past (should be false):', isRecordValid(pastDate, pastDate.getTime() - 1));
  console.log('Only Valid_From past (should be true):', isRecordValid(pastDate, null));
  console.log('Only Valid_From future (should be false):', isRecordValid(futureDate, null));
  console.log('Only Valid_Till future (should be true):', isRecordValid(null, futureDate));
  console.log('Only Valid_Till past (should be false):', isRecordValid(null, pastDate));
}

/**
 * Test getPrograms function
 */
function testGetPrograms() {
  const result = getPrograms();
  console.log('getPrograms result:', JSON.stringify(result, null, 2));
}

/**
 * Test verifyEmail function
 */
function testVerifyEmail() {
  const result = verifyEmail('HC Essentials 2024', 'test@example.com');
  console.log('verifyEmail result:', JSON.stringify(result, null, 2));
}
