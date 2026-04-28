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
    test_db = "test_loser.db"
    
    if os.path.exists(test_db):
        os.remove(test_db)
    
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
    
    conn.commit()
    conn.close()
    
    import app as app_module
    original_db = app_module.DB_NAME
    app_module.DB_NAME = test_db
    
    yield
    
    app_module.DB_NAME = original_db
    if os.path.exists(test_db):
        os.remove(test_db)


def test_integration_pat_and_create_chat_room(client):
    """Test integration: pat 3 times, then create chat room via POST endpoint."""
    # Create a story
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 0))
    story_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Pat the story 3 times
    for i in range(3):
        response = client.put(f'/api/stories/{story_id}/pat')
        assert response.status_code == 200
        data = response.get_json()
        
        if i < 2:
            assert data['match_unlocked'] == False
            assert 'chat_room_id' not in data
        else:
            # Third pat should unlock and create chat room
            assert data['match_unlocked'] == True
            assert 'chat_room_id' in data
            chat_room_id_from_pat = data['chat_room_id']
    
    # Now try to create chat room via POST endpoint (should return existing)
    response = client.post('/api/chat-rooms', json={"story_id": story_id})
    assert response.status_code == 200  # Should return existing
    data = response.get_json()
    assert data['chat_room_id'] == chat_room_id_from_pat


def test_integration_create_chat_room_then_pat(client):
    """Test integration: create chat room first, then pat should return same ID."""
    # Create a story with pat_count = 3
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Create chat room via POST endpoint
    response = client.post('/api/chat-rooms', json={"story_id": story_id})
    assert response.status_code == 201
    data = response.get_json()
    chat_room_id_from_post = data['chat_room_id']
    
    # Pat the story (should return existing chat room)
    response = client.put(f'/api/stories/{story_id}/pat')
    assert response.status_code == 200
    data = response.get_json()
    assert data['match_unlocked'] == True
    assert data['chat_room_id'] == chat_room_id_from_post
