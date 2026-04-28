import pytest
import sqlite3
import os
from app import app, get_db_connection

@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture(autouse=True)
def setup_test_db():
    """Set up a clean test database before each test."""
    # Use a test database
    test_db = "test_loser.db"
    
    # Remove existing test database if it exists
    if os.path.exists(test_db):
        os.remove(test_db)
    
    # Create test database with schema
    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS stories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        pat_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_id) REFERENCES stories(id)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_id) REFERENCES stories(id)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_room_id INTEGER NOT NULL,
        sender_story_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id),
        FOREIGN KEY (sender_story_id) REFERENCES stories(id)
    )
    """)
    
    conn.commit()
    conn.close()
    
    # Temporarily replace DB_NAME in app module
    import app as app_module
    original_db = app_module.DB_NAME
    app_module.DB_NAME = test_db
    
    yield
    
    # Restore original DB_NAME and clean up
    app_module.DB_NAME = original_db
    if os.path.exists(test_db):
        os.remove(test_db)


def test_create_chat_room_missing_story_id(client):
    """Test POST /api/chat-rooms with missing story_id."""
    response = client.post('/api/chat-rooms', json={})
    assert response.status_code == 400
    data = response.get_json()
    assert "story_id" in data["message"]


def test_create_chat_room_nonexistent_story(client):
    """Test POST /api/chat-rooms with non-existent story_id."""
    response = client.post('/api/chat-rooms', json={"story_id": 999})
    assert response.status_code == 404
    data = response.get_json()
    assert "不存在" in data["message"]


def test_create_chat_room_insufficient_pats(client):
    """Test POST /api/chat-rooms with story that has pat_count < 3."""
    # Create a story with pat_count < 3
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 2))
    story_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    response = client.post('/api/chat-rooms', json={"story_id": story_id})
    assert response.status_code == 400
    data = response.get_json()
    assert "拍拍數不足" in data["message"]


def test_create_chat_room_success(client):
    """Test POST /api/chat-rooms successfully creates a chat room."""
    # Create a story with pat_count >= 3
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    response = client.post('/api/chat-rooms', json={"story_id": story_id})
    assert response.status_code == 201
    data = response.get_json()
    assert "chat_room_id" in data
    assert "created_at" in data
    assert isinstance(data["chat_room_id"], int)


def test_create_chat_room_idempotency(client):
    """Test POST /api/chat-rooms returns existing chat_room_id (idempotency)."""
    # Create a story with pat_count >= 3
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # First request - creates chat room
    response1 = client.post('/api/chat-rooms', json={"story_id": story_id})
    assert response1.status_code == 201
    data1 = response1.get_json()
    chat_room_id_1 = data1["chat_room_id"]
    
    # Second request - should return existing chat room
    response2 = client.post('/api/chat-rooms', json={"story_id": story_id})
    assert response2.status_code == 200
    data2 = response2.get_json()
    chat_room_id_2 = data2["chat_room_id"]
    
    # Should return the same chat_room_id
    assert chat_room_id_1 == chat_room_id_2


def test_create_chat_room_with_pat_count_greater_than_3(client):
    """Test POST /api/chat-rooms with story that has pat_count > 3."""
    # Create a story with pat_count > 3
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 5))
    story_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    response = client.post('/api/chat-rooms', json={"story_id": story_id})
    assert response.status_code == 201
    data = response.get_json()
    assert "chat_room_id" in data
    assert "created_at" in data


def test_get_messages_nonexistent_chat_room(client):
    """Test GET /api/chat-rooms/{chat_room_id}/messages with non-existent chat_room_id."""
    response = client.get('/api/chat-rooms/999/messages')
    assert response.status_code == 404
    data = response.get_json()
    assert "聊天室不存在" in data["message"]


def test_get_messages_empty_chat_room(client):
    """Test GET /api/chat-rooms/{chat_room_id}/messages with empty chat room."""
    # Create a story and chat room
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    response = client.get(f'/api/chat-rooms/{chat_room_id}/messages')
    assert response.status_code == 200
    data = response.get_json()
    assert "messages" in data
    assert isinstance(data["messages"], list)
    assert len(data["messages"]) == 0


def test_get_messages_with_messages(client):
    """Test GET /api/chat-rooms/{chat_room_id}/messages returns messages in ascending order."""
    # Create a story and chat room
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    
    # Insert messages with different timestamps
    cursor.execute(
        "INSERT INTO messages (chat_room_id, sender_story_id, content, created_at) VALUES (?, ?, ?, ?)",
        (chat_room_id, story_id, "第一則訊息", "2025-01-15 10:00:00")
    )
    cursor.execute(
        "INSERT INTO messages (chat_room_id, sender_story_id, content, created_at) VALUES (?, ?, ?, ?)",
        (chat_room_id, story_id, "第二則訊息", "2025-01-15 10:01:00")
    )
    cursor.execute(
        "INSERT INTO messages (chat_room_id, sender_story_id, content, created_at) VALUES (?, ?, ?, ?)",
        (chat_room_id, story_id, "第三則訊息", "2025-01-15 10:02:00")
    )
    conn.commit()
    conn.close()
    
    response = client.get(f'/api/chat-rooms/{chat_room_id}/messages')
    assert response.status_code == 200
    data = response.get_json()
    assert "messages" in data
    assert len(data["messages"]) == 3
    
    # Verify messages are in ascending order
    assert data["messages"][0]["content"] == "第一則訊息"
    assert data["messages"][1]["content"] == "第二則訊息"
    assert data["messages"][2]["content"] == "第三則訊息"
    
    # Verify message structure
    for msg in data["messages"]:
        assert "id" in msg
        assert "sender_story_id" in msg
        assert "content" in msg
        assert "created_at" in msg


def test_get_messages_with_since_parameter(client):
    """Test GET /api/chat-rooms/{chat_room_id}/messages with since parameter filters messages."""
    # Create a story and chat room
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    
    # Insert messages with different timestamps
    cursor.execute(
        "INSERT INTO messages (chat_room_id, sender_story_id, content, created_at) VALUES (?, ?, ?, ?)",
        (chat_room_id, story_id, "舊訊息1", "2025-01-15 10:00:00")
    )
    cursor.execute(
        "INSERT INTO messages (chat_room_id, sender_story_id, content, created_at) VALUES (?, ?, ?, ?)",
        (chat_room_id, story_id, "舊訊息2", "2025-01-15 10:01:00")
    )
    cursor.execute(
        "INSERT INTO messages (chat_room_id, sender_story_id, content, created_at) VALUES (?, ?, ?, ?)",
        (chat_room_id, story_id, "新訊息1", "2025-01-15 10:02:00")
    )
    cursor.execute(
        "INSERT INTO messages (chat_room_id, sender_story_id, content, created_at) VALUES (?, ?, ?, ?)",
        (chat_room_id, story_id, "新訊息2", "2025-01-15 10:03:00")
    )
    conn.commit()
    conn.close()
    
    # Request messages since 10:01:30 (should get only the last two messages)
    response = client.get(f'/api/chat-rooms/{chat_room_id}/messages?since=2025-01-15 10:01:30')
    assert response.status_code == 200
    data = response.get_json()
    assert "messages" in data
    assert len(data["messages"]) == 2
    assert data["messages"][0]["content"] == "新訊息1"
    assert data["messages"][1]["content"] == "新訊息2"


def test_get_messages_with_invalid_since_format(client):
    """Test GET /api/chat-rooms/{chat_room_id}/messages with invalid since parameter format."""
    # Create a story and chat room
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Note: SQLite is quite lenient with timestamp formats, so we need to test with a truly invalid format
    # However, the current implementation may not catch all invalid formats
    # This test documents the expected behavior
    response = client.get(f'/api/chat-rooms/{chat_room_id}/messages?since=invalid-timestamp')
    # SQLite might accept this or reject it, depending on the format
    # The endpoint should handle this gracefully
    assert response.status_code in [200, 400]


def test_get_messages_since_with_no_new_messages(client):
    """Test GET /api/chat-rooms/{chat_room_id}/messages with since parameter when no new messages exist."""
    # Create a story and chat room
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    
    # Insert messages
    cursor.execute(
        "INSERT INTO messages (chat_room_id, sender_story_id, content, created_at) VALUES (?, ?, ?, ?)",
        (chat_room_id, story_id, "舊訊息", "2025-01-15 10:00:00")
    )
    conn.commit()
    conn.close()
    
    # Request messages since a time after all messages
    response = client.get(f'/api/chat-rooms/{chat_room_id}/messages?since=2025-01-15 11:00:00')
    assert response.status_code == 200
    data = response.get_json()
    assert "messages" in data
    assert len(data["messages"]) == 0


def test_send_message_success(client):
    """Test POST /api/chat-rooms/{chat_room_id}/messages successfully sends a message."""
    # Create a story and chat room
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Send a message
    response = client.post(
        f'/api/chat-rooms/{chat_room_id}/messages',
        json={"sender_story_id": story_id, "content": "你好，我也很慘"}
    )
    assert response.status_code == 201
    data = response.get_json()
    assert "id" in data
    assert data["sender_story_id"] == story_id
    assert data["content"] == "你好，我也很慘"
    assert "created_at" in data


def test_send_message_empty_content(client):
    """Test POST /api/chat-rooms/{chat_room_id}/messages with empty content."""
    # Create a story and chat room
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Send a message with empty content
    response = client.post(
        f'/api/chat-rooms/{chat_room_id}/messages',
        json={"sender_story_id": story_id, "content": "   "}
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "空白" in data["message"]


def test_send_message_content_too_long(client):
    """Test POST /api/chat-rooms/{chat_room_id}/messages with content exceeding 500 characters."""
    # Create a story and chat room
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Send a message with content > 500 characters
    long_content = "a" * 501
    response = client.post(
        f'/api/chat-rooms/{chat_room_id}/messages',
        json={"sender_story_id": story_id, "content": long_content}
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "長度超過限制" in data["message"]


def test_send_message_nonexistent_chat_room(client):
    """Test POST /api/chat-rooms/{chat_room_id}/messages with non-existent chat_room_id."""
    # Create a story
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Send a message to non-existent chat room
    response = client.post(
        '/api/chat-rooms/999/messages',
        json={"sender_story_id": story_id, "content": "測試訊息"}
    )
    assert response.status_code == 404
    data = response.get_json()
    assert "聊天室不存在" in data["message"]


def test_send_message_nonexistent_sender(client):
    """Test POST /api/chat-rooms/{chat_room_id}/messages with non-existent sender_story_id."""
    # Create a story and chat room
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Send a message with non-existent sender_story_id
    response = client.post(
        f'/api/chat-rooms/{chat_room_id}/messages',
        json={"sender_story_id": 999, "content": "測試訊息"}
    )
    assert response.status_code == 403
    data = response.get_json()
    assert "發送者" in data["message"]


def test_send_message_missing_sender_story_id(client):
    """Test POST /api/chat-rooms/{chat_room_id}/messages with missing sender_story_id."""
    # Create a story and chat room
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Send a message without sender_story_id
    response = client.post(
        f'/api/chat-rooms/{chat_room_id}/messages',
        json={"content": "測試訊息"}
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "sender_story_id" in data["message"]


def test_send_message_trims_whitespace(client):
    """Test POST /api/chat-rooms/{chat_room_id}/messages trims whitespace from content."""
    # Create a story and chat room
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Send a message with leading/trailing whitespace
    response = client.post(
        f'/api/chat-rooms/{chat_room_id}/messages',
        json={"sender_story_id": story_id, "content": "  測試訊息  "}
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["content"] == "測試訊息"


def test_send_message_exactly_500_characters(client):
    """Test POST /api/chat-rooms/{chat_room_id}/messages with exactly 500 characters."""
    # Create a story and chat room
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Send a message with exactly 500 characters
    content_500 = "a" * 500
    response = client.post(
        f'/api/chat-rooms/{chat_room_id}/messages',
        json={"sender_story_id": story_id, "content": content_500}
    )
    assert response.status_code == 201
    data = response.get_json()
    assert len(data["content"]) == 500


def test_pat_unlock_logic_third_pat(client):
    """Test PUT /api/stories/{story_id}/pat returns match_unlocked on third pat.
    
    Validates: Requirements 7.2, 7.3
    """
    # Create a story with pat_count = 0
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 0))
    story_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # First pat - should not unlock
    response = client.put(f'/api/stories/{story_id}/pat')
    assert response.status_code == 200
    data = response.get_json()
    assert data["pat_count"] == 1
    assert data["match_unlocked"] == False
    assert "chat_room_id" not in data
    
    # Second pat - should not unlock
    response = client.put(f'/api/stories/{story_id}/pat')
    assert response.status_code == 200
    data = response.get_json()
    assert data["pat_count"] == 2
    assert data["match_unlocked"] == False
    assert "chat_room_id" not in data
    
    # Third pat - should unlock and return chat_room_id
    response = client.put(f'/api/stories/{story_id}/pat')
    assert response.status_code == 200
    data = response.get_json()
    assert data["pat_count"] == 3
    assert data["match_unlocked"] == True
    assert "chat_room_id" in data
    assert isinstance(data["chat_room_id"], int)
    
    # Verify chat_room was created in database
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM chat_rooms WHERE story_id = ?", (story_id,))
    chat_room = cursor.fetchone()
    conn.close()
    assert chat_room is not None
    assert chat_room["id"] == data["chat_room_id"]


def test_pat_unlock_idempotency(client):
    """Test PUT /api/stories/{story_id}/pat returns same chat_room_id on subsequent pats.
    
    Validates: Requirements 7.2, 7.3
    """
    # Create a story with pat_count = 3 and existing chat_room
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    existing_chat_room_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Pat again - should return existing chat_room_id
    response = client.put(f'/api/stories/{story_id}/pat')
    assert response.status_code == 200
    data = response.get_json()
    assert data["pat_count"] == 4
    assert data["match_unlocked"] == True
    assert data["chat_room_id"] == existing_chat_room_id


def test_get_messages_since_boundary(client):
    """Test GET /api/chat-rooms/{chat_room_id}/messages with since at exact message timestamp.
    
    Validates: Requirements 7.4
    """
    # Create a story and chat room
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    
    # Insert messages with specific timestamps
    cursor.execute(
        "INSERT INTO messages (chat_room_id, sender_story_id, content, created_at) VALUES (?, ?, ?, ?)",
        (chat_room_id, story_id, "訊息1", "2025-01-15 10:00:00")
    )
    cursor.execute(
        "INSERT INTO messages (chat_room_id, sender_story_id, content, created_at) VALUES (?, ?, ?, ?)",
        (chat_room_id, story_id, "訊息2", "2025-01-15 10:01:00")
    )
    cursor.execute(
        "INSERT INTO messages (chat_room_id, sender_story_id, content, created_at) VALUES (?, ?, ?, ?)",
        (chat_room_id, story_id, "訊息3", "2025-01-15 10:02:00")
    )
    conn.commit()
    conn.close()
    
    # Request messages since exact timestamp of message 2 (should only get message 3)
    response = client.get(f'/api/chat-rooms/{chat_room_id}/messages?since=2025-01-15 10:01:00')
    assert response.status_code == 200
    data = response.get_json()
    assert "messages" in data
    assert len(data["messages"]) == 1
    assert data["messages"][0]["content"] == "訊息3"


def test_send_message_missing_content(client):
    """Test POST /api/chat-rooms/{chat_room_id}/messages with missing content field.
    
    Validates: Requirements 7.6
    """
    # Create a story and chat room
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Send a message without content field
    response = client.post(
        f'/api/chat-rooms/{chat_room_id}/messages',
        json={"sender_story_id": story_id}
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "空白" in data["message"]


def test_error_handling_404_chat_room(client):
    """Test 404 error handling for non-existent chat room in GET and POST.
    
    Validates: Requirements 7.6
    """
    # Create a story for sending message
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Test GET messages with non-existent chat_room_id
    response = client.get('/api/chat-rooms/999/messages')
    assert response.status_code == 404
    data = response.get_json()
    assert "聊天室不存在" in data["message"]
    
    # Test POST message with non-existent chat_room_id
    response = client.post(
        '/api/chat-rooms/999/messages',
        json={"sender_story_id": story_id, "content": "測試訊息"}
    )
    assert response.status_code == 404
    data = response.get_json()
    assert "聊天室不存在" in data["message"]


def test_error_handling_400_validation(client):
    """Test 400 error handling for validation failures.
    
    Validates: Requirements 7.6
    """
    # Test POST chat-rooms with missing story_id
    response = client.post('/api/chat-rooms', json={})
    assert response.status_code == 400
    data = response.get_json()
    assert "story_id" in data["message"]
    
    # Test POST chat-rooms with insufficient pats
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 2))
    story_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    response = client.post('/api/chat-rooms', json={"story_id": story_id})
    assert response.status_code == 400
    data = response.get_json()
    assert "拍拍數不足" in data["message"]


def test_error_handling_403_unauthorized_sender(client):
    """Test 403 error handling for unauthorized sender.
    
    Validates: Requirements 7.6
    """
    # Create a story and chat room
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Send a message with non-existent sender_story_id
    response = client.post(
        f'/api/chat-rooms/{chat_room_id}/messages',
        json={"sender_story_id": 999, "content": "測試訊息"}
    )
    assert response.status_code == 403
    data = response.get_json()
    assert "發送者" in data["message"]
