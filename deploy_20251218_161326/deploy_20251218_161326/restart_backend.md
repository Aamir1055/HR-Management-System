# 🔄 Restart Backend Server

The attendance Excel upload code has been updated with better header detection.

## Restart Command:

```bash
cd backend
npm start
```

## What Changed:

The code now:
1. ✅ Reads the Excel file as raw arrays first
2. ✅ Searches through the first 10 rows to find the header row
3. ✅ Looks for keywords like "employee", "date", "punch" to identify headers
4. ✅ Reconstructs the data using the found header row
5. ✅ Provides clear error if no header row is found

## After Restarting:

Try uploading your Excel file again. The system should now:
- Find the header row automatically (even if it's not in row 1)
- Map the columns correctly
- Process your attendance data

## If Still Having Issues:

Run the debug script to see your Excel structure:
```bash
cd backend
node debug_excel_structure.js "C:/path/to/your/attendance.xlsx"
```
