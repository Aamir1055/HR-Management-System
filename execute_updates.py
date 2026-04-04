import subprocess
import sys

# Read the SQL file
with open('employee_updates_mysql.sql', 'r', encoding='utf-8') as f:
    queries = f.readlines()

print(f"Total queries to execute: {len(queries)}")
print("=" * 60)

success_count = 0
error_count = 0
errors = []

for i, query in enumerate(queries, 1):
    query = query.strip()
    if not query:
        continue
    
    try:
        # Execute each query individually via SSH
        result = subprocess.run(
            ['ssh', '-o', 'StrictHostKeyChecking=no', 'root@77.42.45.79', 
             f'mysql payroll_system -e "{query}"'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            success_count += 1
            print(f"✅ Query {i}/{len(queries)} - Success")
        else:
            error_count += 1
            error_msg = result.stderr.strip()
            print(f"❌ Query {i}/{len(queries)} - Error: {error_msg[:80]}")
            errors.append((i, query[:80], error_msg[:100]))
    except Exception as e:
        error_count += 1
        print(f"❌ Query {i}/{len(queries)} - Exception: {str(e)[:80]}")
        errors.append((i, query[:80], str(e)[:100]))

print("\n" + "=" * 60)
print(f"✅ Successful: {success_count}")
print(f"❌ Errors: {error_count}")

if errors:
    print("\nErrors encountered:")
    for idx, query, error in errors[:5]:  # Show first 5 errors
        print(f"\nQuery {idx}: {query}")
        print(f"Error: {error}")
