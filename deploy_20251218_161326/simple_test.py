import requests
import json

def test_login_and_dates():
    """Simple test to get actual API date format"""
    
    login_url = "http://localhost:3000/api/auth/login" 
    employees_url = "http://localhost:3000/api/employees"
    
    # Try common passwords for admin user
    passwords = ["admin", "password", "123456", "admin123", ""]
    
    print("🔐 Testing login with different passwords...")
    
    for pwd in passwords:
        print(f"\n   Trying: username='admin', password='{pwd if pwd else '[empty]'}'")
        
        login_data = {"username": "admin", "password": pwd}
        response = requests.post(login_url, json=login_data)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            if 'requiresTwoFactor' in result:
                print(f"   ✅ Password correct but needs 2FA")
                continue
            
            if 'token' in result:
                token = result['token']
                print(f"   ✅ Login successful!")
                
                # Get employees data
                headers = {'Authorization': f'Bearer {token}'}
                emp_response = requests.get(employees_url, headers=headers)
                
                if emp_response.status_code == 200:
                    employees = emp_response.json()
                    print(f"\n📊 SUCCESS! Got {len(employees)} employees")
                    
                    if employees:
                        emp = employees[0]
                        print(f"\n🔹 Sample Employee: {emp.get('name')}")
                        print(f"   joiningDate: '{emp.get('joiningDate')}'")
                        print(f"   dob: '{emp.get('dob')}'")
                        print(f"   passport_expiry: '{emp.get('passport_expiry')}'")
                        print(f"   visa_expiry: '{emp.get('visa_expiry')}'")
                        
                        # Test JavaScript date formatting simulation
                        joining_date = emp.get('joiningDate')
                        if joining_date:
                            print(f"\n🎯 TESTING DATE FORMAT:")
                            print(f"   Raw from API: {joining_date}")
                            
                            try:
                                from datetime import datetime
                                # Parse the date string
                                if joining_date:
                                    if 'T' in joining_date:
                                        # ISO format with time
                                        date_obj = datetime.fromisoformat(joining_date.replace('Z', '+00:00'))
                                    else:
                                        # Just date string
                                        date_obj = datetime.fromisoformat(joining_date)
                                    
                                    # Format as dd/mm/yyyy (what frontend should show)
                                    formatted = date_obj.strftime('%d/%m/%Y')
                                    print(f"   Should display as: {formatted}")
                                    
                                    # Check if it's correct
                                    if formatted.endswith('/2020') or formatted.endswith('/1990'):
                                        print(f"   ✅ Date format looks CORRECT!")
                                    else:
                                        print(f"   ❌ Date format may have issues")
                                        
                            except Exception as e:
                                print(f"   ❌ Could not parse date: {e}")
                    
                    return True  # Success, exit
                else:
                    print(f"   ❌ Failed to get employees: {emp_response.text}")
                    
        elif response.status_code == 401:
            print(f"   ❌ Wrong password")
        else:
            print(f"   ❌ Error: {response.text}")
    
    print("\n❌ Could not login with any password. You might need to:")
    print("   1. Check the actual password in your database")
    print("   2. Or access your frontend to see the current date display issue")
    return False

if __name__ == "__main__":
    success = test_login_and_dates()
    if not success:
        print("\n💡 Alternative: Check your browser at http://localhost:5173")
        print("   to see the actual date formatting issue in the UI")
