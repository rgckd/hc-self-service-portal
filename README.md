# HC Self-Service Portal - Deployment Guide

## 📋 Overview

The HC Self-Service Portal is a web application for the Heartful Communication (HC) Essentials program that allows users to:
- Select active programs (filtered by date validity)
- Verify their email registration
- Select and submit service requests
- All with built-in security (reCAPTCHA v3 + honeypot)

## 🏗️ Architecture

- **Frontend**: Static HTML + Vanilla JavaScript
- **Backend**: Google Apps Script (Web App)
- **Storage**: Google Sheets
- **Security**: reCAPTCHA v3 + Honeypot field
- **Hosting**: GitHub Pages / Google Sites / Any static host

---

## 📦 What You Need

### 1. Google Sheets Structure

#### **Portal MASTER Sheet**
Create a Google Sheet with these columns:

| Column | Description | Example |
|--------|-------------|---------|
| `Group` | Program identifier | `HC Essentials 2024` |
| `Record_Type` | Type: `PROGRAM`, `REQUEST`, `REGISTER`, `REGFORM` | `PROGRAM` |
| `Record_Name` | Display name | `Certificate Request` |
| `Valid_From` | Start date (optional) | `2024-01-01` |
| `Valid_Till` | End date (optional) | `2024-12-31` |
| `Content` | URL for `REGISTER`/`REGFORM` types | Sheet/Form URL |

**Example Data:**

| Group | Record_Type | Record_Name | Valid_From | Valid_Till | Content |
|-------|-------------|-------------|------------|------------|---------|
| HC Essentials 2024 | PROGRAM | HC Essentials 2024 | 2024-01-01 | 2024-12-31 | |
| HC Essentials 2024 | REGISTER | Registered Users | 2024-01-01 | 2024-12-31 | https://docs.google.com/spreadsheets/d/abc123 |
| HC Essentials 2024 | REGFORM | Registration Form | 2024-01-01 | 2024-12-31 | https://forms.gle/xyz789 |
| HC Essentials 2024 | REQUEST | Certificate Request | 2024-01-01 | 2024-12-31 | |
| HC Essentials 2024 | REQUEST | Resource Access | 2024-01-01 | 2024-12-31 | |

#### **Registration Sheet** (referenced by REGISTER records)
Simple sheet with email addresses in the first column:

| Email |
|-------|
| user1@example.com |
| user2@example.com |

#### **Requests Output Sheet**
Where submissions are stored:

| Timestamp | Program | Email | Requests |
|-----------|---------|-------|----------|
| (auto) | (auto) | (auto) | (auto) |

### 2. reCAPTCHA v3 Keys

1. Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Create a new site:
   - **Label**: HC Self-Service Portal
   - **reCAPTCHA type**: v3
   - **Domains**: Add your hosting domain (e.g., `yourusername.github.io`)
3. Save your:
   - **Site Key** (for frontend)
   - **Secret Key** (for backend)

---

## 🚀 Step-by-Step Deployment

### **Step 1: Set Up Google Apps Script**

1. Open your **Portal MASTER** Google Sheet
2. Go to **Extensions** → **Apps Script**
3. Delete any default code in `Code.gs`
4. Copy and paste the entire contents of `Code.gs` from this project
5. Update the configuration at the top:

```javascript
const CONFIG = {
  MASTER_SHEET_ID: 'YOUR_MASTER_SHEET_ID',      // From URL of Portal MASTER
  OUTPUT_SHEET_ID: 'YOUR_OUTPUT_SHEET_ID',      // Where submissions go
  MASTER_SHEET_NAME: 'Portal MASTER',           // Sheet tab name
  OUTPUT_SHEET_NAME: 'Requests',                // Output sheet tab name
  RECAPTCHA_SECRET: 'YOUR_RECAPTCHA_SECRET_KEY',
  RECAPTCHA_THRESHOLD: 0.5
};
```

6. **Save** the project (give it a name like "HC Portal Backend")

7. **Deploy as Web App**:
   - Click **Deploy** → **New deployment**
   - Type: **Web app**
   - Description: `HC Portal v1`
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**
   - **Authorize** the app when prompted
   - **Copy the Web App URL** (you'll need this for the frontend)

### **Step 2: Configure Frontend Files**

1. Open `script.js`
2. Update the configuration:

```javascript
const CONFIG = {
    API_URL: 'YOUR_APPS_SCRIPT_WEB_APP_URL',  // Paste URL from Step 1
    RECAPTCHA_SITE_KEY: 'YOUR_RECAPTCHA_SITE_KEY'  // From reCAPTCHA admin
};
```

3. Open `index.html` (line 10)
4. Replace the reCAPTCHA script URL:

```html
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_RECAPTCHA_SITE_KEY"></script>
```

### **Step 3: Host the Frontend**

#### **Option A: GitHub Pages** (Recommended)

1. Create a new GitHub repository
2. Upload these files:
   - `index.html`
   - `script.js`
3. Go to **Settings** → **Pages**
4. Source: Deploy from branch `main`
5. Your site will be at: `https://yourusername.github.io/repository-name`

#### **Option B: Google Sites**

1. Create a new Google Site
2. Add an **Embed** component
3. Use **Embed code** and paste the entire `index.html` content
4. Upload `script.js` to Google Drive and link it

#### **Option C: Any Static Host**

Upload `index.html` and `script.js` to:
- Netlify
- Vercel
- Firebase Hosting
- Your own web server

---

## ✅ Testing

### Test the Backend (Optional)

In Apps Script editor:

1. Select function `testGetPrograms`
2. Click **Run**
3. Check **Execution log** for results

### Test the Frontend

1. Open your hosted page
2. **Test Program Loading**:
   - Should see active programs in dropdown
3. **Test Email Verification**:
   - Enter registered email → should verify
   - Enter unregistered email → should show registration link (if available)
4. **Test Request Submission**:
   - Select program
   - Verify email
   - Select requests
   - Submit
   - Check output sheet for new row

---

## 🔧 Troubleshooting

### Programs Not Loading
- Check `MASTER_SHEET_ID` in `Code.gs`
- Verify `Record_Type = "PROGRAM"` exists
- Check that programs have valid dates
- Open browser console for errors

### Email Verification Fails
- Verify `REGISTER` record exists with correct sheet URL
- Check that registration sheet has emails in column A
- Ensure sheet permissions allow script access

### Submissions Not Appearing
- Check `OUTPUT_SHEET_ID` in `Code.gs`
- Verify sheet name matches `OUTPUT_SHEET_NAME`
- Check Apps Script execution logs

### reCAPTCHA Errors
- Verify site key matches domain
- Check secret key in backend
- Ensure reCAPTCHA type is v3 (not v2)

### CORS Errors
- Apps Script Web App must be deployed as "Anyone"
- Clear browser cache
- Redeploy Apps Script with new version

---

## 🔒 Security Features

1. **reCAPTCHA v3**: Scores user interactions (0.0-1.0)
2. **Honeypot Field**: Hidden field that bots tend to fill
3. **Server-side Validation**: All checks happen in backend
4. **Date-based Access Control**: Automatic validity checking

---

## 📊 Date Validity Logic

Records are considered **VALID** if:

```
(Valid_From is blank OR Valid_From ≤ today)
AND
(Valid_Till is blank OR Valid_Till ≥ today)
```

**Examples**:
- `Valid_From: blank, Valid_Till: blank` → Always valid
- `Valid_From: 2024-01-01, Valid_Till: blank` → Valid from Jan 1, 2024 onward
- `Valid_From: blank, Valid_Till: 2024-12-31` → Valid until Dec 31, 2024
- `Valid_From: 2024-01-01, Valid_Till: 2024-12-31` → Valid only in 2024

---

## 📝 Customization

### Change Styling

Edit the `<style>` section in `index.html`:
- Colors: Update gradient, button colors
- Layout: Adjust `.container` width, padding
- Fonts: Change `font-family`

### Add Form Fields

1. Add HTML input in `index.html`
2. Update `handleFormSubmit()` in `script.js`
3. Update `submitRequest()` in `Code.gs`
4. Add column to output sheet

### Change Threshold

Adjust reCAPTCHA sensitivity in `Code.gs`:
```javascript
RECAPTCHA_THRESHOLD: 0.5  // 0.0 (lenient) to 1.0 (strict)
```

---

## 🆘 Support

For issues:
1. Check browser console (F12)
2. Check Apps Script execution logs
3. Verify all IDs and keys are correct
4. Test with sample data first

---

## 📄 File Summary

| File | Purpose |
|------|---------|
| `index.html` | Portal UI structure and styling |
| `script.js` | Frontend logic and API calls |
| `Code.gs` | Google Apps Script backend |
| `README.md` | This deployment guide |

---

## ✨ Features Implemented

- ✅ Dynamic program loading with date filtering
- ✅ Email verification with registration link fallback
- ✅ Dynamic request selection
- ✅ reCAPTCHA v3 integration
- ✅ Honeypot bot detection
- ✅ Responsive design
- ✅ Error handling and user feedback
- ✅ Date-based validity checking (Valid_From/Valid_Till)
- ✅ Case-insensitive email matching
- ✅ Automatic timestamp on submission

---

**Built with ❤️ for the Heartful Communication Essentials Program**
