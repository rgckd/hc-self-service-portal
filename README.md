# HC Self-Service Portal

A Google Apps Script web application for Heartful Communication (HC) Essentials Program participants to submit requests.

## Architecture

This application runs **entirely within Google Apps Script** as a single-origin web app. No CORS configuration needed.

- **Frontend**: Served via `doGet()` using HtmlService from `Index.html`
- **Backend**: Handled via `doPost()` in `Webapp.gs`
- **Same Origin**: Frontend POSTs to same URL it's served from - no cross-origin requests

## Features

- ✅ Program selection with date-based validity
- ✅ Email verification against registration sheets
- ✅ Dynamic request loading based on date validity
- ✅ Multiple request selection
- ✅ reCAPTCHA v3 spam protection
- ✅ Honeypot anti-bot field
- ✅ Registration redirect for unregistered users
- ✅ Responsive design

## Deployment Steps

### 1. Create Google Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Create a new project
3. Name it "HC Self-Service Portal"

### 2. Add Files to Apps Script

Copy the contents of these files to your Apps Script project:

- `Webapp.gs` → Create as "Webapp.gs" (Script file)
- `Index.html` → Create as "Index.html" (HTML file)
- `HCProdWrapper.gs` → Create as "HCProdWrapper.gs" (Script file - optional)

**Important**: The HTML file in Apps Script must be named exactly `Index.html` (capital I).

### 3. Configure Script Properties

1. In Apps Script, go to **Project Settings** (gear icon)
2. Click **Script Properties** → **Add script property**
3. Add: `RECAPTCHA_SECRET` = `your-recaptcha-secret-key`

### 4. Bind to Spreadsheet

1. In Apps Script, click **Project Settings**
2. Under **Google Cloud Platform (GCP) Project**, link to your GCP project
3. Or use the standalone deployment (recommended)

The script expects a spreadsheet with these sheets:
- `MASTER` - Contains program, request, and registration configurations
- `NewPortalRequests` - Where form submissions are saved

### 5. Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Select type: **Web app**
3. Configure:
   - Description: "HC Self-Service Portal v1"
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**
5. **Copy the Web App URL** - this is your portal URL

### 6. Test the Deployment

1. Open the Web App URL in a browser
2. The HTML interface should load from the same origin
3. Test:
   - Program loading
   - Email verification
   - Request selection
   - Form submission

## MASTER Sheet Structure

The `MASTER` sheet should have these columns:

| Record_Type | Record_Name | Group | Content | Valid_From | Valid_Till |
|------------|-------------|-------|---------|------------|------------|
| PROGRAM | HC Essentials 2024 | | | 2024-01-01 | 2024-12-31 |
| REGISTER | Registration Sheet | HC Essentials 2024 | https://docs.google.com/spreadsheets/d/SHEET_ID | | |
| REGFORM | Registration Form | HC Essentials 2024 | https://forms.gle/FORM_ID | 2024-01-01 | 2024-06-30 |
| REQUEST | Certificate Request | HC Essentials 2024 | | 2024-01-01 | 2024-12-31 |
| REQUEST | Transcript Request | HC Essentials 2024 | | 2024-01-01 | 2024-12-31 |

### Record Types:
- **PROGRAM**: Active programs to show in dropdown
- **REGISTER**: Spreadsheet URL containing registered emails
- **REGFORM**: Registration form URL (shown when email not found)
- **REQUEST**: Available requests for a program

## Same-Origin Execution

The application eliminates CORS entirely by:

1. **doGet()** serves the HTML interface via HtmlService
2. **Frontend JavaScript** POSTs to `window.location.href` (same origin)
3. **doPost()** handles all API requests
4. **No CORS headers** needed - browser doesn't enforce CORS for same-origin

## Local Development Files

These files are for version control only and are NOT deployed:

- `index.html` - Local copy for editing (lowercase)
- `script.js` - Separate JS file (embedded in Index.html)
- `README.md` - This file
- `appsscript.json` - Apps Script manifest

The actual deployment file is `Index.html` (capital I) which you copy to Apps Script.

## Security Features

1. **reCAPTCHA v3** - Verifies user is not a bot
2. **Honeypot field** - Hidden field to catch bots
3. **Email verification** - Checks registration before allowing requests
4. **Date-based validity** - Programs and requests are time-bound
5. **Server-side validation** - All checks performed in Apps Script

## Maintenance

### Update Programs/Requests
Edit the MASTER sheet - changes take effect immediately

### Redeploy
1. Make changes in Apps Script
2. Deploy → **Manage deployments**
3. Click ✏️ on your deployment
4. Change version to **New version**
5. Click **Deploy**

### View Logs
- In Apps Script: **Executions** tab shows all doGet/doPost calls
- Check for errors in submission processing

## Troubleshooting

**Programs not loading?**
- Check MASTER sheet has PROGRAM records
- Verify Valid_From/Valid_Till dates

**Email verification failing?**
- Check REGISTER record has correct sheet URL
- Verify registration sheet is accessible
- Email must be in first column

**Requests not showing?**
- Verify REQUEST records exist for the program
- Check Valid_From/Valid_Till dates

**Form submission failing?**
- Check RECAPTCHA_SECRET is set in Script Properties
- Verify NewPortalRequests sheet exists
- Check Apps Script execution logs

## Support

For issues or questions, check the Apps Script execution logs and verify all configuration steps.
