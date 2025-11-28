import requests
import sys

def test_export_headers():
    base_url = "http://127.0.0.1:5000"
    
    # Test JSON Export
    try:
        r_json = requests.get(f"{base_url}/api/logs/export/json")
        print(f"JSON Status: {r_json.status_code}")
        print(f"JSON Content-Disposition: {r_json.headers.get('Content-Disposition')}")
        if "filename=" in r_json.headers.get('Content-Disposition', '') and ".json" in r_json.headers.get('Content-Disposition', ''):
            print("JSON Export Header: PASS")
        else:
            print("JSON Export Header: FAIL")
    except Exception as e:
        print(f"JSON Export Error: {e}")

    # Test CSV Export
    try:
        r_csv = requests.get(f"{base_url}/api/logs/export/csv")
        print(f"CSV Status: {r_csv.status_code}")
        print(f"CSV Content-Disposition: {r_csv.headers.get('Content-Disposition')}")
        if "filename=" in r_csv.headers.get('Content-Disposition', '') and ".csv" in r_csv.headers.get('Content-Disposition', ''):
            print("CSV Export Header: PASS")
        else:
            print("CSV Export Header: FAIL")
    except Exception as e:
        print(f"CSV Export Error: {e}")

if __name__ == "__main__":
    test_export_headers()
