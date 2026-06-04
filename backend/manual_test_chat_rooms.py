"""
Manual test script for POST /api/chat-rooms endpoint.
This script demonstrates the endpoint functionality.
"""
import sqlite3
import requests
import json

DB_NAME = "loser.db"
API_BASE = "http://localhost:5000"

def setup_test_story():
    """Create a test story with pat_count = 1."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Create a test story with pat_count = 1
    cursor.execute(
        "INSERT INTO stories (content, pat_count) VALUES (?, ?)",
        ("手動測試慘事 - 今天被老闆罵了", 1)
    )
    story_id = cursor.lastrowid
    conn.commit()
    conn.close()

    print(f"✓ Created test story with ID: {story_id}, pat_count: 1")
    return story_id

def test_create_chat_room(story_id):
    """Test POST /api/chat-rooms endpoint."""
    print(f"\n--- Testing POST /api/chat-rooms ---")
    
    # First request - should create new chat room
    print(f"\n1. First request (should create new chat room):")
    response = requests.post(
        f"{API_BASE}/api/chat-rooms",
        json={"story_id": story_id}
    )
    print(f"   Status: {response.status_code}")
    print(f"   Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    if response.status_code == 201:
        chat_room_id = response.json()["chat_room_id"]
        print(f"   ✓ Chat room created with ID: {chat_room_id}")
    else:
        print(f"   ✗ Failed to create chat room")
        return
    
    # Second request - should return existing chat room (idempotency)
    print(f"\n2. Second request (should return existing chat room):")
    response = requests.post(
        f"{API_BASE}/api/chat-rooms",
        json={"story_id": story_id}
    )
    print(f"   Status: {response.status_code}")
    print(f"   Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    if response.status_code == 200:
        returned_chat_room_id = response.json()["chat_room_id"]
        if returned_chat_room_id == chat_room_id:
            print(f"   ✓ Idempotency verified: returned same chat_room_id")
        else:
            print(f"   ✗ Idempotency failed: different chat_room_id")
    else:
        print(f"   ✗ Failed to return existing chat room")

def test_error_cases():
    """Test error cases."""
    print(f"\n--- Testing Error Cases ---")
    
    # Test 1: Missing story_id
    print(f"\n1. Missing story_id:")
    response = requests.post(f"{API_BASE}/api/chat-rooms", json={})
    print(f"   Status: {response.status_code}")
    print(f"   Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    if response.status_code == 400:
        print(f"   ✓ Correctly returned 400")
    
    # Test 2: Non-existent story
    print(f"\n2. Non-existent story:")
    response = requests.post(f"{API_BASE}/api/chat-rooms", json={"story_id": 99999})
    print(f"   Status: {response.status_code}")
    print(f"   Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    if response.status_code == 404:
        print(f"   ✓ Correctly returned 404")
    
    # Test 3: Insufficient pat_count
    print(f"\n3. Insufficient pat_count:")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO stories (content, pat_count) VALUES (?, ?)",
        ("測試慘事 - 拍拍數不足", 0)
    )
    insufficient_story_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    response = requests.post(
        f"{API_BASE}/api/chat-rooms",
        json={"story_id": insufficient_story_id}
    )
    print(f"   Status: {response.status_code}")
    print(f"   Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    if response.status_code == 400:
        print(f"   ✓ Correctly returned 400")

if __name__ == "__main__":
    print("=" * 60)
    print("Manual Test: POST /api/chat-rooms Endpoint")
    print("=" * 60)
    print("\nNote: Make sure the Flask server is running on http://localhost:5000")
    print("Run: python backend/app.py")
    print()
    
    try:
        # Check if server is running
        response = requests.get(f"{API_BASE}/")
        print(f"✓ Server is running: {response.json()['message']}\n")
        
        # Run tests
        story_id = setup_test_story()
        test_create_chat_room(story_id)
        test_error_cases()
        
        print("\n" + "=" * 60)
        print("All tests completed!")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("✗ Error: Cannot connect to server at http://localhost:5000")
        print("Please start the server first: python backend/app.py")
