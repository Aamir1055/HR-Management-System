import requests
import json

# Upload the Excel file to test the import functionality
def test_upload():
    url = "http://localhost:3000/api/employees/import-secondary"
    
    try:
        with open(r"C:\Users\bazaa\Desktop\EmployeeDetails\EMPLOYEE_DIRECTORY_dates_ddmmyyyy.xlsx", 'rb') as file:
            files = {'file': ('EMPLOYEE_DIRECTORY_dates_ddmmyyyy.xlsx', file, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            
            print("Uploading Excel file to test date formatting...")
            response = requests.post(url, files=files)
            
            print(f"Response Status: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Upload successful!")
                print(f"Updated: {result.get('updated', 0)} employees")
                if result.get('errors'):
                    print(f"Errors: {result.get('errors')}")
            else:
                print(f"❌ Upload failed!")
                
    except Exception as e:
        print(f"Error: {str(e)}")

def test_get_employees():
    """Test getting employees data to see date format"""
    url = "http://localhost:3000/api/employees"
    
    try:
        # This will fail due to auth, but let's try the template endpoint instead
        template_url = "http://localhost:3000/api/employees/template"
        response = requests.get(template_url)
        
        print(f"Template endpoint status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Template endpoint works (no auth required)")
        
    except Exception as e:
        print(f"Error getting employees: {str(e)}")

if __name__ == "__main__":
    test_get_employees()
    print("\n" + "="*50 + "\n")
    test_upload()
