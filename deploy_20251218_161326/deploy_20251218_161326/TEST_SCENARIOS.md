# 2FA Toggle Feature Test Scenarios

## Test Scenario 1: Create User with 2FA Enabled

### Steps:
1. Go to **Role Management** page
2. Click **"Add New User"**
3. Fill in the form:
   - Username: `testuser_2fa`
   - Password: `test123`
   - Role: `hr` (or any role)
   - **Toggle 2FA to "Required"** (should be blue/enabled)
   - Select at least one office
4. Click **"Create User"**

### Expected Result:
- User should be created successfully
- You should see a blue notification section indicating "This user will see a QR code setup screen on their first login"

---

## Test Scenario 2: Create User with 2FA Disabled

### Steps:
1. Go to **Role Management** page
2. Click **"Add New User"**
3. Fill in the form:
   - Username: `testuser_no2fa`
   - Password: `test123`
   - Role: `hr` (or any role)
   - **Keep 2FA toggle as "Optional"** (should be gray/disabled)
   - Select at least one office
4. Click **"Create User"**

### Expected Result:
- User should be created successfully
- The 2FA toggle should remain gray showing "Optional"

---

## Test Scenario 3: First Login with 2FA Enabled

### Steps:
1. **Logout** from your current session
2. Go to the **login page**
3. Login with:
   - Username: `testuser_2fa`
   - Password: `test123`

### Expected Result:
- Instead of going to the dashboard, you should see a **QR Code setup modal**
- The modal should show:
  - A QR code for scanning
  - Manual entry secret key
  - Backup codes
  - Clear instructions for Google Authenticator setup

### Next Steps:
4. **Scan the QR code** with Google Authenticator (or similar app)
5. **Enter the 6-digit code** from your authenticator app
6. Click **"Complete Setup & Login"**

### Expected Final Result:
- You should be logged into the system successfully
- 2FA setup is now complete for this user

---

## Test Scenario 4: First Login with 2FA Disabled

### Steps:
1. **Logout** from your current session
2. Go to the **login page**
3. Login with:
   - Username: `testuser_no2fa`
   - Password: `test123`

### Expected Result:
- You should be logged into the system **immediately**
- **No QR code setup** should appear
- User goes straight to the dashboard

---

## Test Scenario 5: Admin User Auto-Office Selection

### Steps:
1. Go to **Role Management** page
2. Click **"Add New User"**
3. Fill in the form:
   - Username: `admin_test`
   - Password: `admin123`
   - **Role: `Admin`** ← This is the key step
   - Set 2FA toggle as desired (either enabled or disabled)

### Expected Result:
- **All offices should be automatically selected** when Admin role is chosen
- Office checkboxes should become **disabled** with "Auto-selected" labels
- You should see the message: "(All offices automatically selected for Admin)"

---

## Test Scenario 6: Subsequent Login (2FA User)

### Prerequisites:
- Complete Test Scenario 3 first

### Steps:
1. **Logout** from the system
2. **Login again** with:
   - Username: `testuser_2fa`
   - Password: `test123`

### Expected Result:
- You should see the **regular 2FA prompt** (not the QR code setup)
- Enter your **6-digit authenticator code**
- System should log you in normally

---

## Test Scenario 7: Edit User 2FA Settings

### Steps:
1. Go to **Role Management** page
2. Find an existing user and click **"Edit"**
3. **Toggle the 2FA setting** (enable if disabled, or vice versa)
4. Click **"Update User"**

### Expected Result:
- User should be updated successfully
- The 2FA toggle should reflect the new state
- This change affects future logins for that user

---

## Troubleshooting Common Issues

### Issue 1: QR Code Not Showing
**Possible Cause**: Database migration not applied
**Solution**: Run the SQL commands in `MIGRATION_INSTRUCTIONS.md`

### Issue 2: Toggle Not Saving
**Possible Cause**: Frontend/backend mismatch
**Solution**: Check browser developer console for errors

### Issue 3: Users Not Logging In
**Possible Cause**: 2FA configuration mismatch
**Solution**: Check the user's `two_factor_enabled` and `first_login` fields in the database

### Issue 4: Admin Offices Not Auto-Selected
**Possible Cause**: JavaScript issue in UserForm component
**Solution**: Check browser console for errors, verify the role change handler is working
