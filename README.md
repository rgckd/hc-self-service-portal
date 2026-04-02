# HC Self-Service Portal

Google Apps Script based self-service portal for Heartful Communication participants.

## Current Implementation Overview

This repository currently contains:

- `Webapp.gs`: Main web app backend and API routing (`doGet`, `doPost`)
- `index.html`: Frontend UI + client-side JavaScript served by HtmlService
- `HCProdWrapper.gs`: Sheet UI menu wrapper that calls shared library functions
- `appsscript.json`: Manifest with runtime settings and library dependency

The app is implemented as a same-origin Apps Script web app:

- `doGet()` serves HTML from `index.html` using `HtmlService.createHtmlOutputFromFile('index')`
- Frontend calls `fetch(window.location.href, { method: 'POST' ... })`
- `doPost()` dispatches API actions and always returns JSON via `ContentService`

## API Actions in `doPost`

The backend currently supports these `action` values:

- `getPrograms`: Returns active `PROGRAM` entries from `MASTER`
- `verifyEmail`: Checks email existence in program registration sheet
- `getRequests`: Returns active `REQUEST` entries for selected program
- `submitRequest`: Validates captcha and writes to `NewPortalRequests`

All responses are JSON with `success` and related payload/message fields.

## Data Dependencies

The script is designed to run in a spreadsheet-bound Apps Script project and expects:

- `MASTER` sheet (configuration records)
- `NewPortalRequests` sheet (submission output)

Expected `MASTER` columns:

| Record_Type | Record_Name | Group | Content | Valid_From | Valid_Till |
|---|---|---|---|---|---|

Record type usage:

- `PROGRAM`: Program names shown in dropdown
- `REGISTER`: Spreadsheet URL used to verify registered emails
- `REGFORM`: Registration form URL shown when email is not found
- `REQUEST`: Request options shown for a selected program

Date filtering is handled by `isRecordValid(validFrom, validTill)`.

## Security and Validation

Current protections in code:

- reCAPTCHA v3 verification in backend (`verifyRecaptcha`)
- Honeypot field check (`honey` in backend, hidden `website` input in frontend)
- Required-field checks for program, email, and selected requests
- Server-side validation before writing rows

Script Properties required:

- `RECAPTCHA_SECRET`: server-side secret key used by `verifyRecaptcha`

Frontend currently uses a fixed `RECAPTCHA_SITE_KEY` in `index.html`.

## Output Format

On successful submission, one row is appended to `NewPortalRequests` in this order:

1. Timestamp
2. Program
3. Email
4. Requests (comma-separated string)

## Wrapper/Library Integration

`HCProdWrapper.gs` adds an `Admin` menu in Google Sheets with:

- `Refresh Request Form`
- `Process Pending Requests`

Both menu actions read script property `ENVIRONMENT` and call:

- `HCParticipantsSelfServiceScripts.refreshRequestForm(_environment)`
- `HCParticipantsSelfServiceScripts.processRequests(_environment)`

The library dependency is declared in `appsscript.json`.

## Setup Steps (Aligned to Current Code)

1. Create or open a spreadsheet-bound Apps Script project.
2. Add/update files from this repo: `Webapp.gs`, `HCProdWrapper.gs`, `index.html`, `appsscript.json`.
3. Ensure sheets exist: `MASTER` and `NewPortalRequests`.
4. Set script properties:
   - `RECAPTCHA_SECRET`
   - `ENVIRONMENT` (required for wrapper menu actions)
5. Deploy as Web App:
   - Execute as: Me
   - Access: based on your audience policy

## Known Notes

- `Webapp.gs` includes optional test helper functions at bottom; some refer to older function names and are not used by runtime routes.
- The web app title is set to `HC Self-Service Portal` in `doGet()`.

## Troubleshooting

- No programs visible: verify `MASTER` has valid `PROGRAM` rows and date windows.
- Email not verified: verify `REGISTER` row `Content` has a valid Google Sheet URL and email exists in first column of that registration sheet.
- No requests shown: verify valid `REQUEST` rows exist for selected program.
- Submission blocked: verify reCAPTCHA script loads on client and `RECAPTCHA_SECRET` is present in script properties.
