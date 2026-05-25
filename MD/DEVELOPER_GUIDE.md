# 開發者指南：擴展聊天室功能

## 概述

本指南提供「魯蛇回收站」聊天室功能的擴展方向與實作建議，幫助開發者理解系統架構並進行功能擴展。

## 目錄

1. [系統架構](#系統架構)
2. [前端架構](#前端架構)
3. [後端架構](#後端架構)
4. [擴展方向](#擴展方向)
5. [最佳實踐](#最佳實踐)
6. [常見問題](#常見問題)

---

## 系統架構

### 技術棧

- **前端**：Vanilla JavaScript (ES6 模組)
- **後端**：Python Flask + SQLite
- **通訊**：RESTful API + 輪詢（3 秒間隔）

### 模組職責

| 模組 | 職責 | 檔案 |
|------|------|------|
| **fetchClient** | 封裝所有 API 呼叫 | `frontend/js/fetchClient.js` |
| **chat** | 聊天室邏輯（開啟、關閉、輪詢、發送） | `frontend/js/chat.js` |
| **renderer** | UI 渲染與更新 | `frontend/js/renderer.js` |
| **router** | 頁面路由與狀態管理 | `frontend/js/router.js` |
| **feed** | Feed 頁邏輯 | `frontend/js/feed.js` |
| **Flask API** | 後端 API 端點 | `backend/app.py` |
| **Database** | 資料持久化 | `backend/init_db.py` |

### 資料流

```
使用者互動 → router → chat → fetchClient → Flask API → SQLite
                                    ↓
                              renderer ← chat ← fetchClient
```

---

## 前端架構

### 模組設計原則

1. **單一職責**：每個模組只負責一件事
2. **低耦合**：模組之間透過明確的介面溝通
3. **可測試性**：函式設計為純函式或易於測試的形式

### fetchClient 模組

**職責**：封裝所有 API 呼叫，處理錯誤與回應格式

**核心方法**：
```javascript
// 取得聊天室 ID
async getChatRoomId(storyId)

// 取得訊息（支援 since 參數）
async getMessages(chatRoomId, since = null)

// 發送訊息
async sendMessage(chatRoomId, senderStoryId, content)
```

**擴展建議**：
- 新增重試機制（網路錯誤時自動重試）
- 新增請求快取（減少重複請求）
- 新增請求佇列（避免同時發送多個請求）

### chat 模組

**職責**：管理聊天室狀態、輪詢機制、訊息發送

**核心狀態**：
```javascript
const chatState = {
  chatRoomId: null,        // 當前聊天室 ID
  messages: [],            // 訊息列表
  lastFetchedAt: null,     // 最後一次取得訊息的時間戳
  pollingInterval: null,   // 輪詢計時器
  isSending: false,        // 發送中旗標
}
```

**核心方法**：
```javascript
// 初始化聊天室模組
chat.init()

// 開啟聊天室
chat.open(chatRoomId)

// 關閉聊天室
chat.close()

// 發送訊息
chat.sendMessage(content)

// 輪詢新訊息（內部方法）
pollMessages()
```

**擴展建議**：
- 新增「對方正在輸入…」提示
- 新增訊息已讀/未讀狀態
- 新增訊息撤回功能
- 新增訊息搜尋功能

### renderer 模組

**職責**：渲染 UI 元素、更新 DOM

**核心方法**：
```javascript
// 渲染訊息列表
renderer.renderMessages(messages)

// 渲染錯誤訊息
renderer.renderError(message)

// 渲染載入狀態
renderer.renderLoadingState(message)
```

**擴展建議**：
- 新增訊息動畫效果
- 新增訊息氣泡樣式變化（如已讀/未讀）
- 新增訊息類型渲染（圖片、貼圖、表情符號）

---

## 後端架構

### Flask 應用程式結構

```python
# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

# 資料庫連線
def get_db_connection():
    conn = sqlite3.connect("loser.db")
    conn.row_factory = sqlite3.Row
    return conn

# API 端點
@app.route("/api/chat-rooms/<int:chat_room_id>/messages", methods=["GET"])
def get_messages(chat_room_id):
    # 實作邏輯...
    pass
```

### 資料庫設計

**chat_rooms 表**：
```sql
CREATE TABLE chat_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id)
);
```

**messages 表**：
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_room_id INTEGER NOT NULL,
    sender_story_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id),
    FOREIGN KEY (sender_story_id) REFERENCES stories(id)
);

CREATE INDEX idx_messages_chat_room_created 
ON messages(chat_room_id, created_at);
```

---

## 擴展方向

### 1. 升級為 WebSocket 即時通訊

**目標**：取代輪詢機制，實現真正的即時通訊

#### 後端實作

1. **安裝 Flask-SocketIO**：
   ```bash
   pip install flask-socketio python-socketio
   ```

2. **修改 app.py**：
   ```python
   from flask import Flask
   from flask_socketio import SocketIO, emit, join_room, leave_room
   
   app = Flask(__name__)
   socketio = SocketIO(app, cors_allowed_origins="*")
   
   @socketio.on('join_chat')
   def handle_join_chat(data):
       chat_room_id = data['chat_room_id']
       join_room(chat_room_id)
       emit('joined', {'chat_room_id': chat_room_id})
   
   @socketio.on('send_message')
   def handle_send_message(data):
       chat_room_id = data['chat_room_id']
       sender_story_id = data['sender_story_id']
       content = data['content']
       
       # 儲存訊息到資料庫
       conn = get_db_connection()
       cursor = conn.cursor()
       cursor.execute(
           "INSERT INTO messages (chat_room_id, sender_story_id, content) VALUES (?, ?, ?)",
           (chat_room_id, sender_story_id, content)
       )
       conn.commit()
       message_id = cursor.lastrowid
       
       cursor.execute("SELECT * FROM messages WHERE id = ?", (message_id,))
       message = cursor.fetchone()
       conn.close()
       
       # 廣播訊息到聊天室
       emit('new_message', {
           'id': message['id'],
           'sender_story_id': message['sender_story_id'],
           'content': message['content'],
           'created_at': message['created_at']
       }, room=chat_room_id)
   
   if __name__ == '__main__':
       socketio.run(app, debug=True, port=5000)
   ```

#### 前端實作

1. **引入 Socket.IO 客戶端**：
   ```html
   <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
   ```

2. **修改 chat.js**：
   ```javascript
   // 初始化 Socket.IO 連線
   const socket = io('http://localhost:5000');
   
   // 開啟聊天室
   function open(chatRoomId) {
     chatState.chatRoomId = chatRoomId;
     
     // 加入聊天室
     socket.emit('join_chat', { chat_room_id: chatRoomId });
     
     // 監聽新訊息
     socket.on('new_message', (message) => {
       chatState.messages.push(message);
       renderer.renderMessages(chatState.messages);
     });
     
     // 載入初始訊息
     fetchClient.getMessages(chatRoomId).then(result => {
       if (result.ok) {
         chatState.messages = result.data.messages;
         renderer.renderMessages(chatState.messages);
       }
     });
     
     // 顯示聊天室面板
     document.getElementById('chat-panel').classList.remove('hidden');
   }
   
   // 發送訊息
   function sendMessage(content) {
     socket.emit('send_message', {
       chat_room_id: chatState.chatRoomId,
       sender_story_id: feedState.currentStory.id,
       content: content
     });
   }
   ```

#### 優勢

- **即時性**：訊息即時送達，無延遲
- **效能**：減少不必要的 HTTP 請求
- **功能擴展**：支援「對方正在輸入…」等即時功能

---

### 2. 新增訊息類型（圖片、貼圖、表情符號）

**目標**：豐富訊息表達方式

#### 資料庫修改

```sql
-- 新增 message_type 欄位
ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text';

-- 新增 metadata 欄位（儲存圖片 URL、貼圖 ID 等）
ALTER TABLE messages ADD COLUMN metadata TEXT;
```

#### 後端實作

```python
@app.route("/api/chat-rooms/<int:chat_room_id>/messages", methods=["POST"])
def send_message(chat_room_id):
    data = request.get_json(silent=True) or {}
    sender_story_id = data.get("sender_story_id")
    content = data.get("content", "").strip()
    message_type = data.get("message_type", "text")
    metadata = data.get("metadata")
    
    # 驗證訊息類型
    if message_type not in ['text', 'image', 'sticker', 'emoji']:
        return jsonify({"message": "不支援的訊息類型"}), 400
    
    # 根據類型驗證內容
    if message_type == 'text' and not content:
        return jsonify({"message": "訊息不可為空白"}), 400
    
    if message_type == 'image' and not metadata:
        return jsonify({"message": "圖片 URL 為必填"}), 400
    
    # 插入訊息
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (chat_room_id, sender_story_id, content, message_type, metadata) VALUES (?, ?, ?, ?, ?)",
        (chat_room_id, sender_story_id, content, message_type, metadata)
    )
    conn.commit()
    # ...
```

#### 前端實作

```javascript
// renderer.js
function renderMessage(message) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message';
  
  switch (message.message_type) {
    case 'text':
      messageEl.innerHTML = `<p>${escapeHtml(message.content)}</p>`;
      break;
    
    case 'image':
      const imageUrl = JSON.parse(message.metadata).url;
      messageEl.innerHTML = `<img src="${imageUrl}" alt="圖片" />`;
      break;
    
    case 'sticker':
      const stickerId = JSON.parse(message.metadata).sticker_id;
      messageEl.innerHTML = `<img src="/stickers/${stickerId}.png" alt="貼圖" />`;
      break;
    
    case 'emoji':
      messageEl.innerHTML = `<span class="emoji">${message.content}</span>`;
      break;
  }
  
  return messageEl;
}
```

---

### 3. 新增已讀/未讀狀態

**目標**：讓使用者知道對方是否已讀訊息

#### 資料庫修改

```sql
-- 新增 is_read 欄位
ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0;

-- 新增 read_at 欄位
ALTER TABLE messages ADD COLUMN read_at TIMESTAMP;
```

#### 後端實作

```python
@app.route("/api/chat-rooms/<int:chat_room_id>/messages/<int:message_id>/read", methods=["PUT"])
def mark_message_as_read(chat_room_id, message_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE messages SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ? AND chat_room_id = ?",
        (message_id, chat_room_id)
    )
    conn.commit()
    conn.close()
    
    return jsonify({"message": "已標記為已讀"}), 200
```

#### 前端實作

```javascript
// chat.js
async function pollMessages() {
  const result = await fetchClient.getMessages(
    chatState.chatRoomId,
    chatState.lastFetchedAt
  );
  
  if (result.ok && result.data.messages.length > 0) {
    const newMessages = result.data.messages;
    
    // 標記新訊息為已讀
    for (const message of newMessages) {
      if (message.sender_story_id !== feedState.currentStory.id) {
        await fetchClient.markMessageAsRead(chatState.chatRoomId, message.id);
      }
    }
    
    chatState.messages.push(...newMessages);
    renderer.renderMessages(chatState.messages);
    chatState.lastFetchedAt = newMessages[newMessages.length - 1].created_at;
  }
}
```

---

### 4. 新增多人聊天室

**目標**：支援多人配對與群組聊天

#### 資料庫修改

```sql
-- 新增 chat_room_members 表
CREATE TABLE chat_room_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_room_id INTEGER NOT NULL,
    story_id INTEGER NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id),
    FOREIGN KEY (story_id) REFERENCES stories(id),
    UNIQUE(chat_room_id, story_id)
);

-- 修改 chat_rooms 表（移除 story_id UNIQUE 約束）
CREATE TABLE chat_rooms_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 遷移資料
INSERT INTO chat_rooms_new (id, created_at)
SELECT id, created_at FROM chat_rooms;

-- 遷移成員資料
INSERT INTO chat_room_members (chat_room_id, story_id)
SELECT id, story_id FROM chat_rooms;

-- 刪除舊表
DROP TABLE chat_rooms;

-- 重新命名
ALTER TABLE chat_rooms_new RENAME TO chat_rooms;
```

#### 後端實作

```python
@app.route("/api/chat-rooms/<int:chat_room_id>/members", methods=["GET"])
def get_chat_room_members(chat_room_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT story_id, joined_at FROM chat_room_members WHERE chat_room_id = ?",
        (chat_room_id,)
    )
    members = cursor.fetchall()
    conn.close()
    
    return jsonify({
        "members": [
            {"story_id": m["story_id"], "joined_at": m["joined_at"]}
            for m in members
        ]
    }), 200

@app.route("/api/chat-rooms/<int:chat_room_id>/members", methods=["POST"])
def add_chat_room_member(chat_room_id):
    data = request.get_json(silent=True) or {}
    story_id = data.get("story_id")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "INSERT INTO chat_room_members (chat_room_id, story_id) VALUES (?, ?)",
            (chat_room_id, story_id)
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "成員已加入"}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"message": "成員已存在"}), 200
```

---

### 5. 新增使用者認證系統

**目標**：支援可選的使用者認證，保留匿名模式

#### 資料庫修改

```sql
-- 新增 users 表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password_hash TEXT,
    display_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 修改 stories 表，新增 user_id 欄位（可為 NULL，支援匿名）
ALTER TABLE stories ADD COLUMN user_id INTEGER;
ALTER TABLE stories ADD FOREIGN KEY (user_id) REFERENCES users(id);
```

#### 後端實作

```python
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime

SECRET_KEY = "your-secret-key"

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")
    display_name = data.get("display_name")
    
    if not email or not password:
        return jsonify({"message": "Email 與密碼為必填"}), 400
    
    password_hash = generate_password_hash(password)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)",
            (email, password_hash, display_name)
        )
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        
        # 生成 JWT token
        token = jwt.encode({
            'user_id': user_id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            "token": token,
            "user_id": user_id
        }), 201
        
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"message": "Email 已被使用"}), 400

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, password_hash FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()
    
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"message": "Email 或密碼錯誤"}), 401
    
    # 生成 JWT token
    token = jwt.encode({
        'user_id': user["id"],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
    }, SECRET_KEY, algorithm='HS256')
    
    return jsonify({
        "token": token,
        "user_id": user["id"]
    }), 200
```

#### 前端實作

```javascript
// auth.js
const authState = {
  token: localStorage.getItem('token'),
  userId: localStorage.getItem('userId'),
  isAnonymous: !localStorage.getItem('token')
};

async function login(email, password) {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (response.ok) {
    const data = await response.json();
    authState.token = data.token;
    authState.userId = data.user_id;
    authState.isAnonymous = false;
    
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.user_id);
    
    return { ok: true };
  }
  
  return { ok: false, status: response.status };
}

// 修改 fetchClient.js，在請求中帶入 token
async function sendMessage(chatRoomId, senderStoryId, content) {
  const headers = { 'Content-Type': 'application/json' };
  
  if (authState.token) {
    headers['Authorization'] = `Bearer ${authState.token}`;
  }
  
  const response = await fetch(`${API_BASE}/api/chat-rooms/${chatRoomId}/messages`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      sender_story_id: senderStoryId,
      content: content
    })
  });
  
  // ...
}
```

---

## 最佳實踐

### 1. 錯誤處理

**前端**：
```javascript
async function sendMessage(content) {
  try {
    const result = await fetchClient.sendMessage(
      chatState.chatRoomId,
      feedState.currentStory.id,
      content
    );
    
    if (!result.ok) {
      renderer.renderError(getErrorMessage('send_message', result.status));
      return;
    }
    
    // 成功處理...
    
  } catch (error) {
    console.error('發送訊息失敗:', error);
    renderer.renderError('訊息送出失敗，你的話語迷失在虛空中');
  }
}
```

**後端**：
```python
@app.route("/api/chat-rooms/<int:chat_room_id>/messages", methods=["POST"])
def send_message(chat_room_id):
    try:
        # 業務邏輯...
        return jsonify({...}), 201
        
    except sqlite3.IntegrityError as e:
        app.logger.error(f"Database integrity error: {e}")
        return jsonify({"message": "資料驗證失敗"}), 400
        
    except Exception as e:
        app.logger.error(f"Unexpected error: {e}")
        return jsonify({"message": "訊息送出失敗，請稍後再試"}), 500
```

### 2. 輸入驗證

**前端**：
```javascript
function validateMessage(content) {
  const trimmed = content.trim();
  
  if (!trimmed) {
    return { valid: false, error: '訊息不可為空白' };
  }
  
  if (trimmed.length > 500) {
    return { valid: false, error: '訊息長度超過限制（最多 500 字）' };
  }
  
  return { valid: true, content: trimmed };
}
```

**後端**：
```python
def validate_message_content(content):
    if not content or not content.strip():
        return False, "訊息不可為空白"
    
    if len(content) > 500:
        return False, "訊息長度超過限制（最多 500 字）"
    
    return True, None
```

### 3. 效能優化

**前端**：
- 使用虛擬滾動（Virtual Scrolling）處理大量訊息
- 實作訊息分頁載入（Lazy Loading）
- 使用 debounce 限制輸入事件頻率

**後端**：
- 使用資料庫索引加速查詢
- 實作 Redis 快取減少資料庫查詢
- 使用連線池管理資料庫連線

### 4. 安全性

- 使用 HTTPS 加密傳輸
- 實作 CSRF 保護
- 實作速率限制（Rate Limiting）
- 驗證使用者輸入，防止 SQL Injection
- 實作內容審核，過濾不當內容

---

## 常見問題

### Q1: 如何調整輪詢間隔？

**A**: 修改 `chat.js` 中的 `POLLING_INTERVAL` 常數：

```javascript
const POLLING_INTERVAL = 3000; // 3 秒（單位：毫秒）
```

### Q2: 如何新增自訂錯誤訊息？

**A**: 修改 `fetchClient.js` 中的 `getErrorMessage` 函式：

```javascript
function getErrorMessage(context, status) {
  const messages = {
    'pat': '拍拍失敗，請稍後再試',
    'send_message': '訊息送出失敗，你的話語迷失在虛空中',
    'load_chat': '聊天室載入失敗，連系統都放棄你了',
    'custom_context': '你的自訂錯誤訊息', // 新增這行
  };
  return messages[context] || '操作失敗，請稍後再試';
}
```

### Q3: 如何新增訊息驗證規則？

**A**: 修改 `chat.js` 中的 `validateMessage` 函式：

```javascript
function validateMessage(content) {
  const trimmed = content.trim();
  
  // 新增自訂驗證規則
  if (trimmed.includes('禁止詞彙')) {
    return { valid: false, error: '訊息包含不當內容' };
  }
  
  // 現有驗證規則...
  if (!trimmed) {
    return { valid: false, error: '訊息不可為空白' };
  }
  
  return { valid: true, content: trimmed };
}
```

### Q4: 如何新增 API 端點？

**A**: 在 `backend/app.py` 新增路由：

```python
@app.route("/api/your-endpoint", methods=["GET", "POST"])
def your_endpoint():
    # 實作邏輯
    return jsonify({"message": "成功"}), 200
```

### Q5: 如何執行測試？

**A**: 執行以下命令：

```bash
# 後端單元測試
cd backend
pytest test_*.py

# 後端整合測試
pytest test_integration_*.py

# 前端測試（需安裝 Vitest）
cd frontend
npm test
```

---

## 參考資源

- [Flask 官方文件](https://flask.palletsprojects.com/)
- [Flask-SocketIO 文件](https://flask-socketio.readthedocs.io/)
- [SQLite 官方文件](https://www.sqlite.org/docs.html)
- [JavaScript ES6 模組](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Guide/Modules)
- [WebSocket 協定](https://developer.mozilla.org/zh-TW/docs/Web/API/WebSocket)

---

## 聯絡方式

如有問題或建議，歡迎提交 Issue 或 Pull Request。

**專案口號**：「大家都沒救了，不如就在一起吧。」 🗑️💘
