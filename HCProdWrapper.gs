/**
 * Set up the menu in the google sheet with two commands - (a) Refresh the request (google) form, (b) Process the pending requests
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('Admin')
    .addItem('Refresh Request Form', 'refreshParticipantsForm')
    .addItem('Process Pending Requests', 'processRequests')
    .addToUi();
}

/**
 * Calling the main functions from the library with the ENVIRONMENT script property
 */

function refreshParticipantsForm(){
  let envProperty = PropertiesService.getScriptProperties();
  let _environment = envProperty.getProperty('ENVIRONMENT');
  HCParticipantsSelfServiceScripts.refreshRequestForm(_environment);
}

function processRequests(){
  let envProperty = PropertiesService.getScriptProperties();
  let _environment = envProperty.getProperty('ENVIRONMENT');
  HCParticipantsSelfServiceScripts.processRequests(_environment);
}
