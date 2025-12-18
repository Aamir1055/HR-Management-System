# Database Migration Instructions

## Apply the first_login Field Migration

To complete the 2FA first login implementation, you need to run the following SQL commands on your database:

### 1. Connect to your MySQL database
Open your MySQL client (e.g., MySQL Workbench, command line, or any other MySQL client).

### 2. Run the following SQL commands:

```sql
-- Connect to your payroll database
USE payrole_management;

-- Add the first_login field to users table
ALTER TABLE users ADD COLUMN first_login BOOLEAN DEFAULT TRUE;

-- Update existing users to not require first login setup (since they already exist)
UPDATE users SET first_login = FALSE WHERE created_at IS NOT NULL;

-- Add comment to document the field  
ALTER TABLE users MODIFY COLUMN first_login BOOLEAN DEFAULT TRUE COMMENT 'Indicates if user needs to complete first login 2FA setup';
```

### 3. Verify the migration:
```sql
-- Check that the column was added correctly
DESCRIBE users;

-- Verify existing users have first_login = FALSE
SELECT username, first_login, two_factor_enabled FROM users;
```

## Testing the New Feature

After running the migration:

1. **Create a new user** with the 2FA toggle **enabled** in the Role Management page
2. **Try logging in** with the new user credentials
3. **Verify** that the system shows a QR code setup screen
4. **Complete the 2FA setup** by scanning the QR code and entering the verification code
5. **Test subsequent logins** to ensure they require 2FA normally

### Expected Behavior:
- **New users with 2FA enabled**: Will see QR code setup on first login
- **New users with 2FA disabled**: Will login normally without 2FA setup
- **Existing users**: Will continue to login as before (no first login setup required)

## Troubleshooting

If you encounter any issues:

1. **Check database connection**: Ensure your application can connect to the database
2. **Verify column exists**: Run `DESCRIBE users;` to confirm the `first_login` column was added
3. **Check user settings**: Verify that `two_factor_enabled` is set correctly for test users
4. **Review logs**: Check the backend console for any error messages during login attempts
