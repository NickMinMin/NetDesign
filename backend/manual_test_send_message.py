"""
Manual test script for POST /api/chat-rooms/{chat_room_id}/messages endpoint.

This script tests the send message functionality by:
1. Creating a test story with pat_count >= 3
2. Creating a chat room for that story
3. Sending a message to the chat room
4. Retrieving messages to verify the message was sent
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_send_message():
    print("=== Manual Test: POST /api/chat-rooms/{chat_room_id}/messages ===\n")
    
    # Step 1: Create a test story
    print("Step 1: Creating a test story...")
    story_response = requests.post(
        f"{BASE_URL}/api/stories",
        json={"content": "今天被老闆罵了，超慘的"}
    )
    
    if story_response.status_code != 201:
        print(f"❌ Failed to create story: {story_response.status_code}")
        print(story_response.json())
        return
    
    story_data = story_response.json()
    story_id = story_data["id"]
    print(f"✅ Story created with ID: {story_id}")
    print(f"   Content: {story_data['content']}\n")
    
    # Step 2: Pat the story 3 times to unlock chat room
    print("Step 2: Patting the story 3 times to unlock chat room...")
    for i in range(3):
        pat_response = requests.put(f"{BASE_URL}/api/stories/{story_id}/pat")
        if pat_response.status_code != 200:
            print(f"❌ Failed to pat story: {pat_response.status_code}")
            return
        pat_data = pat_response.json()
        print(f"   Pat {i+1}: pat_count = {pat_data['pat_count']}")
    
    # Get chat_room_id from the last pat response
    if pat_data.get("match_unlocked"):
        chat_room_id = pat_data.get("chat_room_id")
        print(f"✅ Chat room unlocked! chat_room_id = {chat_room_id}\n")
    else:
        print("❌ Chat room not unlocked after 3 pats")
        return
    
    # Step 3: Send a message to the chat room
    print("Step 3: Sending a message to the chat room...")
    message_content = "你好，我也很慘，我們一起加油吧！"
    send_response = requests.post(
        f"{BASE_URL}/api/chat-rooms/{chat_room_id}/messages",
        json={
            "sender_story_id": story_id,
            "content": message_content
        }
    )
    
    if send_response.status_code != 201:
        print(f"❌ Failed to send message: {send_response.status_code}")
        print(send_response.json())
        return
    
    message_data = send_response.json()
    print(f"✅ Message sent successfully!")
    print(f"   Message ID: {message_data['id']}")
    print(f"   Sender Story ID: {message_data['sender_story_id']}")
    print(f"   Content: {message_data['content']}")
    print(f"   Created At: {message_data['created_at']}\n")
    
    # Step 4: Retrieve messages to verify
    print("Step 4: Retrieving messages from the chat room...")
    get_response = requests.get(f"{BASE_URL}/api/chat-rooms/{chat_room_id}/messages")
    
    if get_response.status_code != 200:
        print(f"❌ Failed to get messages: {get_response.status_code}")
        return
    
    messages_data = get_response.json()
    messages = messages_data["messages"]
    print(f"✅ Retrieved {len(messages)} message(s):")
    for msg in messages:
        print(f"   - [{msg['id']}] {msg['content']} (at {msg['created_at']})")
    print()
    
    # Step 5: Test validation - empty content
    print("Step 5: Testing validation - empty content...")
    empty_response = requests.post(
        f"{BASE_URL}/api/chat-rooms/{chat_room_id}/messages",
        json={
            "sender_story_id": story_id,
            "content": "   "
        }
    )
    
    if empty_response.status_code == 400:
        print(f"✅ Empty content validation works: {empty_response.json()['message']}\n")
    else:
        print(f"❌ Empty content validation failed: {empty_response.status_code}\n")
    
    # Step 6: Test validation - content too long
    print("Step 6: Testing validation - content too long...")
    long_content = "a" * 501
    long_response = requests.post(
        f"{BASE_URL}/api/chat-rooms/{chat_room_id}/messages",
        json={
            "sender_story_id": story_id,
            "content": long_content
        }
    )
    
    if long_response.status_code == 400:
        print(f"✅ Content length validation works: {long_response.json()['message']}\n")
    else:
        print(f"❌ Content length validation failed: {long_response.status_code}\n")
    
    # Step 7: Test error handling - non-existent chat room
    print("Step 7: Testing error handling - non-existent chat room...")
    error_response = requests.post(
        f"{BASE_URL}/api/chat-rooms/999/messages",
        json={
            "sender_story_id": story_id,
            "content": "測試訊息"
        }
    )
    
    if error_response.status_code == 404:
        print(f"✅ Non-existent chat room handling works: {error_response.json()['message']}\n")
    else:
        print(f"❌ Non-existent chat room handling failed: {error_response.status_code}\n")
    
    print("=== All manual tests completed! ===")

if __name__ == "__main__":
    try:
        test_send_message()
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to the server.")
        print("   Please make sure the Flask server is running on http://localhost:5000")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
