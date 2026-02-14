#!/usr/bin/env python3
"""
Backend API Testing for Warp Battle Game
Tests the FastAPI server endpoints and basic functionality
"""

import requests
import json
import sys
from datetime import datetime

class WarpBattleAPITester:
    def __init__(self, base_url="https://warp-battle.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

    def log_result(self, test_name, success, details="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED")
        else:
            print(f"❌ {test_name}: FAILED - {details}")
        
        self.results.append({
            "test": test_name,
            "passed": success,
            "details": details,
            "response_data": response_data
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=10):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            else:
                self.log_result(name, False, f"Unsupported method: {method}")
                return False, {}

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            response_json = {}
            
            try:
                response_json = response.json() if response.content else {}
                print(f"   Response: {json.dumps(response_json, indent=2)[:200]}...")
            except:
                response_json = {"raw_content": response.text[:200]}
                print(f"   Raw Response: {response.text[:200]}...")

            details = f"Expected {expected_status}, got {response.status_code}"
            if not success:
                details += f" - {response.text[:100]}"
            
            self.log_result(name, success, details if not success else "", response_json)
            return success, response_json

        except requests.exceptions.Timeout:
            self.log_result(name, False, f"Request timeout ({timeout}s)")
            return False, {}
        except requests.exceptions.ConnectionError as e:
            self.log_result(name, False, f"Connection error: {str(e)[:100]}")
            return False, {}
        except Exception as e:
            self.log_result(name, False, f"Unexpected error: {str(e)[:100]}")
            return False, {}

    def test_health_endpoint(self):
        """Test the /api/ health endpoint"""
        success, response = self.run_test(
            "Health Endpoint (/api/)",
            "GET", 
            "api/",
            200
        )
        
        if success and response:
            message = response.get("message", "")
            if "online" in message.lower() or "warp battle" in message.lower():
                print(f"   ✅ Health message looks good: '{message}'")
                return True
            else:
                print(f"   ⚠️  Unexpected health message: '{message}'")
                
        return success

    def test_rooms_endpoint(self):
        """Test the /api/rooms endpoint"""
        success, response = self.run_test(
            "Rooms Endpoint (/api/rooms)", 
            "GET",
            "api/rooms",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   ✅ Rooms endpoint returned array with {len(response)} rooms")
            for room in response[:2]:  # Show first 2 rooms
                if isinstance(room, dict):
                    room_id = room.get('id', 'unknown')
                    player_count = room.get('playerCount', 0)
                    print(f"   🏠 Room: {room_id} ({player_count} players)")
            return True
        elif success:
            print(f"   ⚠️  Expected array, got: {type(response)}")
        
        return success

    def test_websocket_endpoint_check(self):
        """Basic check for WebSocket endpoint accessibility (HTTP request should fail gracefully)"""
        # This is a basic connectivity test - WebSocket upgrade should fail with specific status
        success, response = self.run_test(
            "WebSocket Endpoint Check (/api/ws/default)",
            "GET",
            "api/ws/default?name=TestPilot&ship_class=vanguard",
            400  # Expecting 400 since it's not a WebSocket upgrade request
        )
        
        # For WebSocket endpoints, we expect either 400 (bad request) or 426 (upgrade required)
        # Both indicate the endpoint exists
        if not success:
            # Try again expecting 426 (Upgrade Required)
            success2, response2 = self.run_test(
                "WebSocket Endpoint Check (Upgrade Required)",
                "GET",
                "api/ws/default?name=TestPilot&ship_class=vanguard", 
                426
            )
            if success2:
                print("   ✅ WebSocket endpoint exists (upgrade required)")
                return True
        else:
            print("   ✅ WebSocket endpoint exists (bad request as expected)")
            return True
            
        print("   ⚠️  WebSocket endpoint may not be accessible")
        return False

    def test_cors_headers(self):
        """Test CORS configuration"""
        url = f"{self.base_url}/api/"
        
        try:
            response = requests.options(url, headers={
                'Origin': 'https://test.example.com',
                'Access-Control-Request-Method': 'GET'
            }, timeout=10)
            
            cors_origin = response.headers.get('Access-Control-Allow-Origin', '')
            cors_methods = response.headers.get('Access-Control-Allow-Methods', '')
            
            success = cors_origin == '*' or 'https://' in cors_origin
            
            details = f"Origin: {cors_origin}, Methods: {cors_methods}"
            self.log_result("CORS Configuration", success, details if not success else "")
            
            print(f"   CORS Origin: {cors_origin}")
            print(f"   CORS Methods: {cors_methods}")
            
            return success
            
        except Exception as e:
            self.log_result("CORS Configuration", False, f"Error: {str(e)[:100]}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Warp Battle Backend API Tests")
        print(f"🌐 Base URL: {self.base_url}")
        print("=" * 60)

        # Run individual tests
        self.test_health_endpoint()
        self.test_rooms_endpoint()
        self.test_websocket_endpoint_check()
        self.test_cors_headers()

        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "No tests run")
        
        # Show failed tests
        failed_tests = [r for r in self.results if not r['passed']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['details']}")
        else:
            print("\n🎉 ALL TESTS PASSED!")

        return self.tests_passed == self.tests_run

def main():
    """Main function to run all tests"""
    tester = WarpBattleAPITester()
    success = tester.run_all_tests()
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = f"/tmp/backend_test_results_{timestamp}.json"
    
    with open(results_file, 'w') as f:
        json.dump({
            "timestamp": timestamp,
            "total_tests": tester.tests_run,
            "passed_tests": tester.tests_passed,
            "success_rate": (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0,
            "results": tester.results
        }, f, indent=2)
    
    print(f"\n📁 Results saved to: {results_file}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())