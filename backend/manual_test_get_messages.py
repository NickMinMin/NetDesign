"""
Manual test script for GET /api/chat-rooms/{chat_room_id}/messages endpoint
"""
import sqlite3
import requests
import time

DB_NAME = "loser.db"
BASE_URL = "http://localhost:5000"

def setup_test_data():
    """Create test data: story, chat_room, and messages"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Create a story with pat_count >= 3
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事 - GET messages", 3))
    story_id = cursor.lastrowid
    print(f"Created story with id: {story_id}")
    
    # Create a chat_room
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    print(f"Created chat_room with id: {chat_room_id}")
    
    # Create some messages
    messages = [
        ("第一則訊息", "2025-01-15 10:00:00"),
        ("第二則訊息", "2025-01-15 10:01:00"),
        ("第三則訊息", "2025-01-15 10:02:00"),
    ]
    
    for content, created_at in messages:
        cursor.execute(
            "INSERT INTO messages (chat_room_id, sender_story_id, content, created_at) VALUES (?, ?, ?, ?)",
            (chat_room_id, story_id, content, created_at)
        )
    
    conn.commit()
    conn.close()
    
    print(f"Created {len(messages)} messages")
    return chat_room_id, story_id

def test_get_all_messages(chat_room_id):
    """Test GET /api/chat-rooms/{chat_room_id}/messages without since parameter"""
    print("\n=== Test 1: Get all messages ===")
    response = requests.get(f"{BASE_URL}/api/chat-rooms/{chat_room_id}/messages")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Retrieved {len(data['messages'])} messages")
        for msg in data['messages']:
            print(f"  - {msg['content']} (created_at: {msg['created_at']})")
    else:
        print("✗ Failed to get messages")

def test_get_messages_with_since(chat_room_id):
    """Test GET /api/chat-rooms/{chat_room_id}/messages with since parameter"""
    print("\n=== Test 2: Get messages with since parameter ===")
    since = "2025-01-15 10:00:30"
    response = requests.get(f"{BASE_URL}/api/chat-rooms/{chat_room_id}/messages?since={since}")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Retrieved {len(data['messages'])} messages after {since}")
        for msg in data['messages']:
            print(f"  - {msg['content']} (created_at: {msg['created_at']})")
    else:
        print("✗ Failed to get messages")

def test_get_messages_nonexistent_chat_room():
    """Test GET /api/chat-rooms/{chat_room_id}/messages with non-existent chat_room_id"""
    print("\n=== Test 3: Get messages from non-existent chat room ===")
    response = requests.get(f"{BASE_URL}/api/chat-rooms/99999/messages")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 404:
        print("✓ Correctly returned 404 for non-existent chat room")
    else:
        print("✗ Expected 404 status code")

def cleanup_test_data(chat_room_id, story_id):
    """Clean up test data"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM messages WHERE chat_room_id = ?", (chat_room_id,))
    cursor.execute("DELETE FROM chat_rooms WHERE id = ?", (chat_room_id,))
    cursor.execute("DELETE FROM stories WHERE id = ?", (story_id,))
    
    conn.commit()
    conn.close()
    print("\n=== Cleanup completed ===")

if __name__ == "__main__":
    print("Starting manual test for GET /api/chat-rooms/{chat_room_id}/messages")
    print("Make sure Flask server is running on http://localhost:5000")
    print()
    
    try:
        # Setup test data
        chat_room_id, story_id = setup_test_data()
        
        # Run tests
        test_get_all_messages(chat_room_id)
        test_get_messages_with_since(chat_room_id)
        test_get_messages_nonexistent_chat_room()
        
        # Cleanup
        cleanup_test_data(chat_room_id, story_id)
        
        print("\n✓ All manual tests completed successfully!")
        
    except requests.exceptions.ConnectionError:
        print("\n✗ Error: Could not connect to Flask server.")
        print("Please make sure the server is running: python backend/app.py")
    except Exception as e:
        print(f"\n✗ Error: {e}")
