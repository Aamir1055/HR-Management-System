import re

# Read the input file
with open('employee_updates.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace date_of_birth with dob
content = content.replace('date_of_birth', 'dob')

# Convert DD/MM/YYYY to YYYY-MM-DD for dob
def convert_dob(match):
    day, month, year = match.groups()
    return f"dob = '{year}-{month}-{day}'"

content = re.sub(r"dob = '(\d{2})/(\d{2})/(\d{4})'", convert_dob, content)

# Convert DD/MM/YYYY to YYYY-MM-DD for passport_expiry
def convert_passport(match):
    day, month, year = match.groups()
    return f"passport_expiry = '{year}-{month}-{day}'"

content = re.sub(r"passport_expiry = '(\d{2})/(\d{2})/(\d{4})'", convert_passport, content)

# Convert DD/MM/YYYY to YYYY-MM-DD for visa_expiry
def convert_visa(match):
    day, month, year = match.groups()
    return f"visa_expiry = '{year}-{month}-{day}'"

content = re.sub(r"visa_expiry = '(\d{2})/(\d{2})/(\d{4})'", convert_visa, content)

# Write the output file
with open('employee_updates_mysql.sql', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Conversion complete! File saved as: employee_updates_mysql.sql")
