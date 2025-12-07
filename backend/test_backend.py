import requests
import pandas as pd
import io

# Create test CSV
test_data = pd.DataFrame({
    'age': [25, 30, 35, 40, 45],
    'salary': [50000, 60000, 70000, 80000, 90000],
    'experience': [2, 5, 8, 12, 15]
})

csv_buffer = io.StringIO()
test_data.to_csv(csv_buffer, index=False)
csv_buffer.seek(0)

print("Testing backend on port 5002...")

# Test upload
print("\n1. Testing upload...")
files = {'file': ('test.csv', csv_buffer.getvalue(), 'text/csv')}
response = requests.post('http://localhost:5002/api/upload', files=files)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

if response.status_code == 200:
    data_id = response.json()['data']['id']
    
    # Test describe
    print("\n2. Testing describe...")
    response = requests.post('http://localhost:5002/api/describe', 
                            json={'data_id': data_id})
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    # Test each analysis
    analyses = ['descriptive', 'regression', 'pls', 'sem', 'visualization', 'predictive']
    for analysis in analyses:
        print(f"\n3. Testing {analysis}...")
        response = requests.post('http://localhost:5002/api/analyze',
                                json={'data_id': data_id, 'analysis_type': analysis})
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Success: {result.get('success')}")
            if not result.get('success'):
                print(f"Error: {result.get('error')}")
        else:
            print(f"Error: {response.text}")

print("\n✅ Testing complete!")
