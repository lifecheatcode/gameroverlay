import requests
import sys
import base64
import json
from datetime import datetime
from io import BytesIO
from PIL import Image

class GameInsightAPITester:
    def __init__(self, base_url="https://live-game-insight.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if success:
                try:
                    response_data = response.json()
                    details += f", Response: {json.dumps(response_data, indent=2)[:200]}..."
                    self.log_test(name, True, details)
                    return True, response_data
                except:
                    # For non-JSON responses (like TTS audio)
                    details += f", Content-Type: {response.headers.get('content-type', 'unknown')}"
                    self.log_test(name, True, details)
                    return True, response.content
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Raw response: {response.text[:200]}"
                self.log_test(name, False, details)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def create_test_image(self):
        """Create a simple test image as base64"""
        # Create a simple test image
        img = Image.new('RGB', (800, 600), color='blue')
        # Add some text to make it look like a game screenshot
        buffer = BytesIO()
        img.save(buffer, format='JPEG')
        img_bytes = buffer.getvalue()
        return base64.b64encode(img_bytes).decode('utf-8')

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_status_endpoints(self):
        """Test status check endpoints"""
        # Create status check
        success, response = self.run_test(
            "Create Status Check",
            "POST",
            "status",
            200,
            data={"client_name": "test_client"}
        )
        
        if success:
            # Get status checks
            self.run_test("Get Status Checks", "GET", "status", 200)
        
        return success

    def test_session_management(self):
        """Test session creation and management"""
        # Create session
        success, response = self.run_test(
            "Create Session",
            "POST",
            "sessions",
            200,
            data={"game_type": "test_game", "user_id": "test_user"}
        )
        
        if success and 'id' in response:
            self.session_id = response['id']
            print(f"   Created session: {self.session_id}")
            
            # Get session details
            self.run_test(
                "Get Session Details",
                "GET",
                f"sessions/{self.session_id}",
                200
            )
            
            # Update session activity
            self.run_test(
                "Update Session Activity",
                "PUT",
                f"sessions/{self.session_id}/active",
                200
            )
            
            # List sessions
            self.run_test("List Sessions", "GET", "sessions", 200)
        
        return success

    def test_game_analysis(self):
        """Test game analysis endpoint"""
        test_image = self.create_test_image()
        
        success, response = self.run_test(
            "Game Analysis",
            "POST",
            "analyze",
            200,
            data={
                "image_base64": test_image,
                "game_type": "general",
                "context": "Testing game analysis"
            }
        )
        
        if success:
            # Verify response structure
            required_fields = ['id', 'tips', 'strategy', 'game_detected', 'confidence', 'timestamp']
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                self.log_test("Analysis Response Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Analysis Response Structure", True, "All required fields present")
        
        return success

    def test_chat_functionality(self):
        """Test chat endpoints"""
        if not self.session_id:
            print("⚠️  Skipping chat tests - no session ID available")
            return False
        
        # Send chat message
        success, response = self.run_test(
            "Send Chat Message",
            "POST",
            "chat",
            200,
            data={
                "session_id": self.session_id,
                "message": "What's the best strategy for this game?",
                "game_context": "Testing chat functionality"
            }
        )
        
        if success:
            # Get chat history
            self.run_test(
                "Get Chat History",
                "GET",
                f"chat/{self.session_id}/history",
                200
            )
            
            # Clear chat history
            self.run_test(
                "Clear Chat History",
                "DELETE",
                f"chat/{self.session_id}/clear",
                200
            )
        
        return success

    def test_tts_functionality(self):
        """Test text-to-speech endpoints"""
        # Test regular TTS endpoint
        success1, response1 = self.run_test(
            "Text-to-Speech",
            "POST",
            "tts",
            200,
            data={
                "text": "This is a test of the text to speech system",
                "voice": "nova",
                "speed": 1.0
            }
        )
        
        # Test base64 TTS endpoint
        success2, response2 = self.run_test(
            "Text-to-Speech Base64",
            "POST",
            "tts/base64",
            200,
            data={
                "text": "Testing base64 audio response",
                "voice": "alloy",
                "speed": 1.1
            }
        )
        
        if success2 and isinstance(response2, dict):
            if 'audio_base64' in response2:
                self.log_test("TTS Base64 Response Structure", True, "Contains audio_base64 field")
            else:
                self.log_test("TTS Base64 Response Structure", False, "Missing audio_base64 field")
        
        return success1 and success2

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Game Insight API Tests")
        print(f"   Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test basic connectivity
        self.test_root_endpoint()
        
        # Test status endpoints
        self.test_status_endpoints()
        
        # Test session management
        self.test_session_management()
        
        # Test game analysis (requires LLM)
        print("\n🧠 Testing AI-powered features...")
        self.test_game_analysis()
        
        # Test chat functionality
        self.test_chat_functionality()
        
        # Test TTS functionality
        self.test_tts_functionality()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            failed_tests = [r for r in self.test_results if not r['success']]
            print("\nFailed tests:")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['details']}")
            return 1

def main():
    tester = GameInsightAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())