"""
Manual test script to verify Task 2.1: pat_story endpoint with chat_room unlock logic
"""
import sqlite3
import requests
import json

DB_NAME = "loser.db"
API_BASE = "http://localhost:5000"

def reset_test_db():
    """Reset database for testing"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Clear existing data
    cursor.execute("DELETE FROM messages")
    cursor.execute("DELETE FROM chat_rooms")
    cursor.execute("DELETE FROM pats")
    cursor.execute("DELETE FROM stories")
    
    # Create a test story
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 0))
    story_id = cursor.lastrowid
    
    conn.commit()
    conn.close()
    
    return story_id

def test_pat_unlock():
    """Test that patting 3 times unlocks chat room"""
    print("=== Testing Task 2.1: Pat Story with Chat Room Unlock ===\n")
    
    # Reset database and create test story
    story_id = reset_test_db()
    print(f"✓ Created test story with ID: {story_id}\n")
    
    # Test patting 3 times
    for i in range(1, 4):
        print(f"--- Pat #{i} ---")
        response = requests.put(f"{API_BASE}/api/stories/{story_id}/pat")
        
        if response.status_code != 200:
            print(f"✗ FAILED: Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify pat_count
        if data["pat_count"] != i:
            print(f"✗ FAILED: Expected pat_count={i}, got {data['pat_count']}")
            return False
        print(f"✓ pat_count is correct: {i}")
        
        # Check match_unlocked flag
        if i < 3:
            if data["match_unlocked"] != False:
                print(f"✗ FAILED: Expected match_unlocked=False for pat #{i}")
                return False
            print(f"✓ match_unlocked is False (as expected)")
            
            if "chat_room_id" in data:
                print(f"✗ FAILED: chat_room_id should not be present for pat #{i}")
                return False
            print(f"✓ chat_room_id not present (as expected)")
        else:
            # Third pat should unlock
            if data["match_unlocked"] != True:
                print(f"✗ FAILED: Expected match_unlocked=True for pat #3")
                return False
            print(f"✓ match_unlocked is True (as expected)")
            
            if "chat_room_id" not in data:
                print(f"✗ FAILED: chat_room_id should be present for pat #3")
                return False
            
            chat_room_id = data["chat_room_id"]
            print(f"✓ chat_room_id is present: {chat_room_id}")
        
        print()
    
    # Verify chat_room was created in database
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT id, story_id FROM chat_rooms WHERE story_id = ?", (story_id,))
    chat_room = cursor.fetchone()
    conn.close()
    
    if not chat_room:
        print("✗ FAILED: chat_room not found in database")
        return False
    
    print(f"✓ chat_room exists in database: id={chat_room[0]}, story_id={chat_room[1]}")
    
    # Test idempotency: patting again should return same chat_room_id
    print("\n--- Testing Idempotency (Pat #4) ---")
    response = requests.put(f"{API_BASE}/api/stories/{story_id}/pat")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if data["pat_count"] != 4:
        print(f"✗ FAILED: Expected pat_count=4, got {data['pat_count']}")
        return False
    
    if data["match_unlocked"] != True:
        print(f"✗ FAILED: Expected match_unlocked=True")
        return False
    
    if data["chat_room_id"] != chat_room[0]:
        print(f"✗ FAILED: Expected same chat_room_id={chat_room[0]}, got {data['chat_room_id']}")
        return False
    
    print(f"✓ Idempotency verified: same chat_room_id returned")
    
    print("\n=== ALL TESTS PASSED ===")
    return True

if __name__ == "__main__":
    try:
        test_pat_unlock()
    except requests.exceptions.ConnectionError:
        print("✗ ERROR: Could not connect to backend server.")
        print("Please ensure the Flask server is running on http://localhost:5000")
    except Exception as e:
        print(f"✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
