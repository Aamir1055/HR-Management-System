import mysql.connector
import json
from datetime import datetime

def check_employee_dates():
    """Connect to database and check a few employee records to see date formatting"""
    try:
        # You'll need to update these connection details
        connection = mysql.connector.connect(
            host='localhost',
            database='payroll_system2',  # From your .env file
            user='root',
            password=''
        )
        
        if connection.is_connected():
            cursor = connection.cursor(dictionary=True)
            
            # Get a few employee records to check date formats
            query = """
                SELECT employeeId, name, joiningDate, dob, passport_expiry, visa_expiry
                FROM employees 
                WHERE joiningDate IS NOT NULL OR dob IS NOT NULL 
                LIMIT 5
            """
            
            cursor.execute(query)
            employees = cursor.fetchall()
            
            print("📊 Employee Date Formats in Database:")
            print("="*60)
            
            for emp in employees:
                print(f"\n🔹 Employee ID: {emp['employeeId']} - {emp['name']}")
                print(f"   Joining Date: {emp['joiningDate']} (Type: {type(emp['joiningDate'])})")
                print(f"   DOB: {emp['dob']} (Type: {type(emp['dob'])})")
                print(f"   Passport Expiry: {emp['passport_expiry']} (Type: {type(emp['passport_expiry'])})")
                print(f"   Visa Expiry: {emp['visa_expiry']} (Type: {type(emp['visa_expiry'])})")
                
                # Convert to string representations
                if emp['joiningDate']:
                    print(f"   Joining Date as string: {str(emp['joiningDate'])}")
                if emp['dob']:
                    print(f"   DOB as string: {str(emp['dob'])}")
            
            cursor.close()
            connection.close()
            print("\n✅ Database check completed!")
            
    except mysql.connector.Error as e:
        print(f"❌ Database error: {e}")
        
        # Try alternative connection parameters
        try:
            print("Trying alternative connection...")
            connection = mysql.connector.connect(
                host='localhost',
                database='payroll_db',  # Alternative DB name
                user='root',
                password='root'
            )
            print("✅ Alternative connection successful!")
            connection.close()
        except Exception as e2:
            print(f"❌ Alternative connection also failed: {e2}")
            print("\n💡 Please check your database connection details:")
            print("   - Database name")
            print("   - Username/password")
            print("   - Host/port")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_employee_dates()
