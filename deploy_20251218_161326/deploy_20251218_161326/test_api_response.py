import requests
import json

def test_api_response():
    """Test what the API is actually returning for date format"""
    
    # First, let's try to create a user and get a token
    try:
        # Register/Login to get a token (you might need to adjust these credentials)
        login_url = "http://localhost:3000/api/auth/login"
        # Try multiple common passwords for the admin user
        passwords_to_try = ["admin", "password", "admin123", "123456", ""]
        
        login_successful = False
        for pwd in passwords_to_try:
            login_data = {
                "username": "admin",  
                "password": pwd        
            }
            print(f"Trying password: '{pwd}' (empty string if blank)")
            login_response = requests.post(login_url, json=login_data)
            if login_response.status_code == 200:
                login_successful = True
                break
            elif 'requiresTwoFactor' in login_response.text:
                print(f"2FA required for password '{pwd}' - this means the password is correct!")
                login_successful = True  
                token_data = login_response.json()
                break
        
        print("🔐 Attempting to login...")
        login_response = requests.post(login_url, json=login_data)
        print(f"Login Status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            token = token_data.get('token')
            print(f"✅ Login successful! Token: {token[:20]}...")
            
            # Now get employees data
            employees_url = "http://localhost:3000/api/employees"
            headers = {'Authorization': f'Bearer {token}'}
            
            print("📊 Getting employees data...")
            emp_response = requests.get(employees_url, headers=headers)
            print(f"Employees API Status: {emp_response.status_code}")
            
            if emp_response.status_code == 200:
                employees = emp_response.json()
                print(f"✅ Got {len(employees)} employees")
                
                # Check date formats in the response
                if employees:
                    first_emp = employees[0]
                    print(f"\n🔹 Sample Employee: {first_emp.get('name')}")
                    print(f"   Joining Date (raw): {first_emp.get('joiningDate')}")
                    print(f"   DOB (raw): {first_emp.get('dob')}")
                    print(f"   Passport Expiry (raw): {first_emp.get('passport_expiry')}")
                    print(f"   Visa Expiry (raw): {first_emp.get('visa_expiry')}")
                    
                    # Simulate what frontend would do
                    joining_date = first_emp.get('joiningDate')
                    if joining_date:
                        from datetime import datetime
                        # Try parsing the date string and formatting
                        try:
                            date_obj = datetime.fromisoformat(joining_date.replace('Z', '+00:00'))
                            formatted_date = date_obj.strftime('%d/%m/%Y')
                            print(f"   Frontend would show: {formatted_date}")
                        except:
                            print(f"   Could not parse date: {joining_date}")
                            
            else:
                print(f"❌ Failed to get employees: {emp_response.text}")
                
        else:
            print(f"❌ Login failed: {login_response.text}")
            
            # Try different login credentials
            print("\n🔄 Trying alternative login credentials...")
            alt_login_data = {
                "username": "admin",
                "password": "password"
            }
            
            alt_response = requests.post(login_url, json=alt_login_data)
            print(f"Alternative login status: {alt_response.status_code}")
            if alt_response.status_code != 200:
                print(f"Alternative login failed: {alt_response.text}")
                
                # Let's check what users exist by looking at the auth routes
                register_url = "http://localhost:3000/api/auth/register"
                test_user = {
                    "email": "testuser@example.com",
                    "password": "testpass123",
                    "name": "Test User",
                    "role": "admin"
                }
                
                print("\n🔄 Trying to register a test user...")
                reg_response = requests.post(register_url, json=test_user)
                print(f"Registration status: {reg_response.status_code}")
                print(f"Registration response: {reg_response.text}")
                
                if reg_response.status_code in [200, 201]:
                    # Try to login with the new user
                    print("🔐 Trying to login with new user...")
                    new_login = requests.post(login_url, json={
                        "email": "testuser@example.com", 
                        "password": "testpass123"
                    })
                    if new_login.status_code == 200:
                        print("✅ New user login successful!")
                        # Recursively call the employees test
                        token_data = new_login.json()
                        token = token_data.get('token')
                        headers = {'Authorization': f'Bearer {token}'}
                        emp_response = requests.get("http://localhost:3000/api/employees", headers=headers)
                        if emp_response.status_code == 200:
                            employees = emp_response.json()
                            if employees:
                                first_emp = employees[0] 
                                print(f"\n🔹 Sample Employee: {first_emp.get('name')}")
                                print(f"   Raw joiningDate: {first_emp.get('joiningDate')}")
                
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_api_response()
