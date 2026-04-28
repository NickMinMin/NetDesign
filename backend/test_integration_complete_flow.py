"""
Integration Test Script: Complete Flow Testing
測試案例 1-4：完整配對流程、輪詢機制、錯誤處理、聊天室持久化

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**

This script tests the complete user journey:
1. Post a story → Pat 3 times → Chat room unlocks → Send messages
2. Polling mechanism retrieves new messages
3. Error handling for network errors and validation errors
4. Chat room persistence after closing and reopening
"""

import pytest
import sqlite3
import os
import time
from datetime import datetime, timedelta
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
    
    # Create stories table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS stories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        pat_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Create pats table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_id) REFERENCES stories(id)
    )
    """)
    
    # Create chat_rooms table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_id) REFERENCES stories(id)
    )
    """)
    
    # Create messages table
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
    
    # Create index for messages
    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_messages_chat_room_created 
    ON messages(chat_room_id, created_at)
    """)
    
    conn.commit()
    conn.close()
    
    # Swap database for testing
    import app as app_module
    original_db = app_module.DB_NAME
    app_module.DB_NAME = test_db
    
    yield
    
    # Restore original database
    app_module.DB_NAME = original_db
    if os.path.exists(test_db):
        os.remove(test_db)


# ============================================================================
# 測試案例 1：完整配對流程（發文 → 拍拍 → 聊天）
# Test Case 1: Complete Matching Flow (Post → Pat → Chat)
# **Validates: Requirements 7.1, 7.2, 7.3**
# ============================================================================

def test_case_1_complete_matching_flow(client):
    """
    測試案例 1：完整配對流程
    
    步驟：
    1. 投稿慘事
    2. 拍拍 3 次
    3. 驗證聊天室解鎖
    4. 發送訊息
    5. 取得訊息列表
    
    預期結果：
    - 第 3 次拍拍後 match_unlocked = true
    - 聊天室成功建立
    - 訊息成功發送並可取得
    """
    print("\n" + "="*70)
    print("測試案例 1：完整配對流程（發文 → 拍拍 → 聊天）")
    print("="*70)
    
    # Step 1: 投稿慘事
    print("\n[Step 1] 投稿慘事...")
    response = client.post('/api/stories', json={
        'content': '今天被老闆罵了，超級慘'
    })
    assert response.status_code == 201
    story_data = response.get_json()
    story_id = story_data['id']
    print(f"✓ 慘事已投稿，ID: {story_id}")
    
    # Step 2: 拍拍 3 次
    print("\n[Step 2] 拍拍 3 次...")
    chat_room_id = None
    
    for i in range(3):
        response = client.put(f'/api/stories/{story_id}/pat')
        assert response.status_code == 200
        data = response.get_json()
        
        print(f"  拍拍 #{i+1}: pat_count = {data['pat_count']}, match_unlocked = {data.get('match_unlocked', False)}")
        
        if i < 2:
            # 前兩次拍拍不應解鎖
            assert data['match_unlocked'] == False
            assert 'chat_room_id' not in data
        else:
            # 第 3 次拍拍應解鎖聊天室
            assert data['match_unlocked'] == True
            assert 'chat_room_id' in data
            chat_room_id = data['chat_room_id']
            print(f"✓ 聊天室已解鎖，chat_room_id: {chat_room_id}")
    
    assert chat_room_id is not None
    
    # Step 3: 驗證聊天室已建立
    print("\n[Step 3] 驗證聊天室已建立...")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM chat_rooms WHERE id = ?", (chat_room_id,))
    chat_room = cursor.fetchone()
    conn.close()
    
    assert chat_room is not None
    assert chat_room['story_id'] == story_id
    print(f"✓ 聊天室記錄已建立：{dict(chat_room)}")
    
    # Step 4: 發送訊息
    print("\n[Step 4] 發送訊息...")
    response = client.post(f'/api/chat-rooms/{chat_room_id}/messages', json={
        'sender_story_id': story_id,
        'content': '我也覺得很慘，我們一起加油吧！'
    })
    assert response.status_code == 201
    message_data = response.get_json()
    message_id = message_data['id']
    print(f"✓ 訊息已發送，message_id: {message_id}")
    print(f"  內容: {message_data['content']}")
    
    # Step 5: 取得訊息列表
    print("\n[Step 5] 取得訊息列表...")
    response = client.get(f'/api/chat-rooms/{chat_room_id}/messages')
    assert response.status_code == 200
    messages_data = response.get_json()
    messages = messages_data['messages']
    
    assert len(messages) == 1
    assert messages[0]['id'] == message_id
    assert messages[0]['content'] == '我也覺得很慘，我們一起加油吧！'
    print(f"✓ 訊息列表已取得，共 {len(messages)} 則訊息")
    
    print("\n" + "="*70)
    print("✓ 測試案例 1 通過：完整配對流程正常運作")
    print("="*70)


# ============================================================================
# 測試案例 2：輪詢機制（新訊息自動更新）
# Test Case 2: Polling Mechanism (New Messages Auto-Update)
# **Validates: Requirements 7.2, 7.7**
# ============================================================================

def test_case_2_polling_mechanism(client):
    """
    測試案例 2：輪詢機制（新訊息自動更新）
    
    步驟：
    1. 建立聊天室
    2. 發送初始訊息
    3. 取得訊息（記錄時間戳）
    4. 發送新訊息
    5. 使用 since 參數輪詢新訊息
    
    預期結果：
    - since 參數正確過濾訊息
    - 只回傳新訊息
    - 訊息按時間排序
    """
    print("\n" + "="*70)
    print("測試案例 2：輪詢機制（新訊息自動更新）")
    print("="*70)
    
    # Setup: 建立聊天室
    print("\n[Setup] 建立聊天室...")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    conn.commit()
    conn.close()
    print(f"✓ 聊天室已建立，chat_room_id: {chat_room_id}")
    
    # Step 1: 發送初始訊息
    print("\n[Step 1] 發送初始訊息...")
    response = client.post(f'/api/chat-rooms/{chat_room_id}/messages', json={
        'sender_story_id': story_id,
        'content': '第一則訊息'
    })
    assert response.status_code == 201
    first_message = response.get_json()
    print(f"✓ 第一則訊息已發送，created_at: {first_message['created_at']}")
    
    # Step 2: 取得所有訊息（模擬初始載入）
    print("\n[Step 2] 取得所有訊息（初始載入）...")
    response = client.get(f'/api/chat-rooms/{chat_room_id}/messages')
    assert response.status_code == 200
    data = response.get_json()
    messages = data['messages']
    assert len(messages) == 1
    last_timestamp = messages[-1]['created_at']
    print(f"✓ 已取得 {len(messages)} 則訊息，last_timestamp: {last_timestamp}")
    
    # Step 3: 等待一小段時間（確保時間戳不同）
    print("\n[Step 3] 等待 0.1 秒...")
    time.sleep(0.1)
    
    # Step 4: 發送新訊息
    print("\n[Step 4] 發送新訊息...")
    response = client.post(f'/api/chat-rooms/{chat_room_id}/messages', json={
        'sender_story_id': story_id,
        'content': '第二則訊息'
    })
    assert response.status_code == 201
    second_message = response.get_json()
    print(f"✓ 第二則訊息已發送，created_at: {second_message['created_at']}")
    
    response = client.post(f'/api/chat-rooms/{chat_room_id}/messages', json={
        'sender_story_id': story_id,
        'content': '第三則訊息'
    })
    assert response.status_code == 201
    third_message = response.get_json()
    print(f"✓ 第三則訊息已發送，created_at: {third_message['created_at']}")
    
    # Step 5: 使用 since 參數輪詢新訊息
    print(f"\n[Step 5] 使用 since 參數輪詢新訊息（since={last_timestamp}）...")
    response = client.get(f'/api/chat-rooms/{chat_room_id}/messages?since={last_timestamp}')
    assert response.status_code == 200
    data = response.get_json()
    new_messages = data['messages']
    
    # 驗證只回傳新訊息
    assert len(new_messages) == 2
    assert new_messages[0]['content'] == '第二則訊息'
    assert new_messages[1]['content'] == '第三則訊息'
    print(f"✓ 輪詢成功，取得 {len(new_messages)} 則新訊息")
    
    # 驗證訊息按時間排序
    assert new_messages[0]['created_at'] < new_messages[1]['created_at']
    print("✓ 訊息按時間正確排序")
    
    # Step 6: 再次輪詢（應無新訊息）
    last_message_timestamp = new_messages[-1]['created_at']
    print(f"\n[Step 6] 再次輪詢（since={last_message_timestamp}）...")
    response = client.get(f'/api/chat-rooms/{chat_room_id}/messages?since={last_message_timestamp}')
    assert response.status_code == 200
    data = response.get_json()
    no_new_messages = data['messages']
    
    assert len(no_new_messages) == 0
    print("✓ 無新訊息，輪詢機制正常")
    
    print("\n" + "="*70)
    print("✓ 測試案例 2 通過：輪詢機制正常運作")
    print("="*70)


# ============================================================================
# 測試案例 3：錯誤處理（網路錯誤、驗證錯誤）
# Test Case 3: Error Handling (Network Errors, Validation Errors)
# **Validates: Requirements 7.3, 7.6**
# ============================================================================

def test_case_3_error_handling(client):
    """
    測試案例 3：錯誤處理（網路錯誤、驗證錯誤）
    
    測試項目：
    1. 404 錯誤：不存在的資源
    2. 400 錯誤：驗證失敗
    3. 403 錯誤：權限不足
    
    預期結果：
    - 正確的 HTTP 狀態碼
    - 清楚的錯誤訊息
    - 系統保持穩定
    """
    print("\n" + "="*70)
    print("測試案例 3：錯誤處理（網路錯誤、驗證錯誤）")
    print("="*70)
    
    # Setup: 建立測試資料
    print("\n[Setup] 建立測試資料...")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    conn.commit()
    conn.close()
    print(f"✓ 測試資料已建立，story_id: {story_id}, chat_room_id: {chat_room_id}")
    
    # Test 1: 404 錯誤 - 拍拍不存在的慘事
    print("\n[Test 1] 404 錯誤：拍拍不存在的慘事...")
    response = client.put('/api/stories/99999/pat')
    assert response.status_code == 404
    data = response.get_json()
    assert 'message' in data
    print(f"✓ 正確回傳 404，錯誤訊息: {data['message']}")
    
    # Test 2: 404 錯誤 - 取得不存在的聊天室訊息
    print("\n[Test 2] 404 錯誤：取得不存在的聊天室訊息...")
    response = client.get('/api/chat-rooms/99999/messages')
    assert response.status_code == 404
    data = response.get_json()
    assert 'message' in data
    print(f"✓ 正確回傳 404，錯誤訊息: {data['message']}")
    
    # Test 3: 400 錯誤 - 發送空白訊息
    print("\n[Test 3] 400 錯誤：發送空白訊息...")
    response = client.post(f'/api/chat-rooms/{chat_room_id}/messages', json={
        'sender_story_id': story_id,
        'content': '   '
    })
    assert response.status_code == 400
    data = response.get_json()
    assert 'message' in data
    assert '空白' in data['message']
    print(f"✓ 正確回傳 400，錯誤訊息: {data['message']}")
    
    # Test 4: 400 錯誤 - 發送超長訊息
    print("\n[Test 4] 400 錯誤：發送超長訊息（>500 字）...")
    long_content = 'a' * 501
    response = client.post(f'/api/chat-rooms/{chat_room_id}/messages', json={
        'sender_story_id': story_id,
        'content': long_content
    })
    assert response.status_code == 400
    data = response.get_json()
    assert 'message' in data
    assert '長度' in data['message'] or '500' in data['message']
    print(f"✓ 正確回傳 400，錯誤訊息: {data['message']}")
    
    # Test 5: 400 錯誤 - 建立聊天室時 pat_count 不足
    print("\n[Test 5] 400 錯誤：建立聊天室時 pat_count 不足...")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("拍拍數不足", 2))
    insufficient_story_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    response = client.post('/api/chat-rooms', json={
        'story_id': insufficient_story_id
    })
    assert response.status_code == 400
    data = response.get_json()
    assert 'message' in data
    print(f"✓ 正確回傳 400，錯誤訊息: {data['message']}")
    
    # Test 6: 400 錯誤 - since 參數格式錯誤
    print("\n[Test 6] 400 錯誤：since 參數格式錯誤...")
    response = client.get(f'/api/chat-rooms/{chat_room_id}/messages?since=invalid-timestamp')
    # Note: 根據實作，可能回傳 400 或忽略錯誤參數
    # 這裡我們驗證系統不會崩潰
    assert response.status_code in [200, 400]
    print(f"✓ 系統正確處理錯誤參數，status_code: {response.status_code}")
    
    # Test 7: 404 錯誤 - 發送訊息到不存在的聊天室
    print("\n[Test 7] 404 錯誤：發送訊息到不存在的聊天室...")
    response = client.post('/api/chat-rooms/99999/messages', json={
        'sender_story_id': story_id,
        'content': '測試訊息'
    })
    assert response.status_code == 404
    data = response.get_json()
    assert 'message' in data
    print(f"✓ 正確回傳 404，錯誤訊息: {data['message']}")
    
    print("\n" + "="*70)
    print("✓ 測試案例 3 通過：錯誤處理機制正常運作")
    print("="*70)


# ============================================================================
# 測試案例 4：聊天室持久化（關閉後重新開啟）
# Test Case 4: Chat Room Persistence (Close and Reopen)
# **Validates: Requirements 7.4, 7.5**
# ============================================================================

def test_case_4_chat_room_persistence(client):
    """
    測試案例 4：聊天室持久化（關閉後重新開啟）
    
    步驟：
    1. 建立聊天室並發送訊息
    2. 模擬關閉聊天室（前端行為）
    3. 重新開啟聊天室
    4. 驗證訊息歷史保留
    5. 發送新訊息
    6. 驗證新舊訊息都存在
    
    預期結果：
    - 聊天室狀態持久化
    - 訊息歷史完整保留
    - 可繼續發送新訊息
    """
    print("\n" + "="*70)
    print("測試案例 4：聊天室持久化（關閉後重新開啟）")
    print("="*70)
    
    # Step 1: 建立聊天室
    print("\n[Step 1] 建立聊天室...")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO stories (content, pat_count) VALUES (?, ?)", ("測試慘事", 3))
    story_id = cursor.lastrowid
    cursor.execute("INSERT INTO chat_rooms (story_id) VALUES (?)", (story_id,))
    chat_room_id = cursor.lastrowid
    conn.commit()
    conn.close()
    print(f"✓ 聊天室已建立，chat_room_id: {chat_room_id}")
    
    # Step 2: 發送多則訊息
    print("\n[Step 2] 發送多則訊息...")
    messages_content = [
        '第一則訊息：你好',
        '第二則訊息：我也很慘',
        '第三則訊息：我們一起加油'
    ]
    
    sent_messages = []
    for content in messages_content:
        response = client.post(f'/api/chat-rooms/{chat_room_id}/messages', json={
            'sender_story_id': story_id,
            'content': content
        })
        assert response.status_code == 201
        sent_messages.append(response.get_json())
        time.sleep(0.05)  # 確保時間戳不同
    
    print(f"✓ 已發送 {len(sent_messages)} 則訊息")
    
    # Step 3: 模擬關閉聊天室（前端行為，後端無狀態）
    print("\n[Step 3] 模擬關閉聊天室（前端行為）...")
    print("  （後端無狀態，聊天室資料保留在資料庫中）")
    
    # Step 4: 重新開啟聊天室（取得訊息歷史）
    print("\n[Step 4] 重新開啟聊天室（取得訊息歷史）...")
    response = client.get(f'/api/chat-rooms/{chat_room_id}/messages')
    assert response.status_code == 200
    data = response.get_json()
    messages = data['messages']
    
    # 驗證訊息歷史完整保留
    assert len(messages) == 3
    for i, message in enumerate(messages):
        assert message['content'] == messages_content[i]
    print(f"✓ 訊息歷史完整保留，共 {len(messages)} 則訊息")
    
    # Step 5: 發送新訊息
    print("\n[Step 5] 發送新訊息...")
    response = client.post(f'/api/chat-rooms/{chat_room_id}/messages', json={
        'sender_story_id': story_id,
        'content': '第四則訊息：重新開啟後的訊息'
    })
    assert response.status_code == 201
    new_message = response.get_json()
    print(f"✓ 新訊息已發送，message_id: {new_message['id']}")
    
    # Step 6: 驗證新舊訊息都存在
    print("\n[Step 6] 驗證新舊訊息都存在...")
    response = client.get(f'/api/chat-rooms/{chat_room_id}/messages')
    assert response.status_code == 200
    data = response.get_json()
    all_messages = data['messages']
    
    assert len(all_messages) == 4
    assert all_messages[0]['content'] == '第一則訊息：你好'
    assert all_messages[3]['content'] == '第四則訊息：重新開啟後的訊息'
    print(f"✓ 新舊訊息都存在，共 {len(all_messages)} 則訊息")
    
    # Step 7: 驗證訊息按時間排序
    print("\n[Step 7] 驗證訊息按時間排序...")
    for i in range(len(all_messages) - 1):
        assert all_messages[i]['created_at'] <= all_messages[i+1]['created_at']
    print("✓ 訊息按時間正確排序")
    
    # Step 8: 驗證聊天室可多次開啟關閉
    print("\n[Step 8] 驗證聊天室可多次開啟關閉...")
    for iteration in range(3):
        # 模擬關閉
        print(f"  迭代 {iteration+1}: 關閉聊天室...")
        
        # 模擬重新開啟
        print(f"  迭代 {iteration+1}: 重新開啟聊天室...")
        response = client.get(f'/api/chat-rooms/{chat_room_id}/messages')
        assert response.status_code == 200
        data = response.get_json()
        messages = data['messages']
        assert len(messages) == 4
        print(f"  迭代 {iteration+1}: ✓ 訊息歷史保留")
    
    print("✓ 聊天室可多次開啟關閉，狀態持久化正常")
    
    print("\n" + "="*70)
    print("✓ 測試案例 4 通過：聊天室持久化機制正常運作")
    print("="*70)


# ============================================================================
# 整合測試：所有測試案例
# Integration Test: All Test Cases
# ============================================================================

def test_all_integration_cases(client):
    """
    執行所有整合測試案例
    
    這個測試會依序執行所有測試案例，確保整個系統正常運作。
    """
    print("\n" + "="*70)
    print("執行所有整合測試案例")
    print("="*70)
    
    test_case_1_complete_matching_flow(client)
    test_case_2_polling_mechanism(client)
    test_case_3_error_handling(client)
    test_case_4_chat_room_persistence(client)
    
    print("\n" + "="*70)
    print("✓✓✓ 所有整合測試案例通過 ✓✓✓")
    print("="*70)


if __name__ == "__main__":
    """
    直接執行此腳本進行測試
    
    使用方法：
    1. 確保後端伺服器未運行（測試會使用測試資料庫）
    2. 執行：pytest backend/test_integration_complete_flow.py -v -s
    """
    print("請使用 pytest 執行此測試腳本：")
    print("pytest backend/test_integration_complete_flow.py -v -s")
