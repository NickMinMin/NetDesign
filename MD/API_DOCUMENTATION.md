# API 文件：魯蛇回收站（TrashMatch）

## 概述

本文件提供「魯蛇回收站」後端 API 的完整技術規格，包括所有端點的詳細說明、請求/回應格式、錯誤處理與使用範例。

### 基本資訊

- **Base URL**: `http://localhost:5000`
- **Protocol**: HTTP/1.1
- **Content-Type**: `application/json`
- **CORS**: 已啟用（允許所有來源）
- **認證**: 無（匿名系統）

### 通用規範

#### 請求格式

所有 POST/PUT 請求均使用 JSON 格式：

```http
Content-Type: application/json
```

#### 回應格式

所有成功回應均為 JSON 格式，包含相關資料欄位。

#### 錯誤回應

所有錯誤回應均包含 `message` 欄位，提供友善的錯誤訊息：

```json
{
  "message": "錯誤訊息描述"
}
```

#### HTTP 狀態碼

| 狀態碼 | 說明 |
|--------|------|
| 200 OK | 請求成功 |
| 201 Created | 資源建立成功 |
| 400 Bad Request | 請求格式錯誤或驗證失敗 |
| 403 Forbidden | 無權限執行操作 |
| 404 Not Found | 資源不存在 |
| 500 Internal Server Error | 伺服器內部錯誤 |

---

## 端點詳細說明

### 1. 健康檢查

檢查 API 伺服器是否正常運行。

#### 請求

```http
GET /
```

#### 回應

```json
{
  "message": "TrashMatch API is running"
}
```

#### 狀態碼

- `200 OK`: 伺服器正常運行

#### 使用範例

```bash
curl http://localhost:5000/
```

---

### 2. 建立慘事

建立一則新的慘事投稿。

#### 請求

```http
POST /api/stories
Content-Type: application/json

{
  "content": "今天被老闆罵了"
}
```

#### 請求參數

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| content | string | 是 | 慘事內容，不可為空或純空白 |

#### 回應

```json
{
  "id": 1,
  "content": "今天被老闆罵了",
  "pat_count": 0
}
```

#### 回應欄位

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | integer | 慘事 ID |
| content | string | 慘事內容 |
| pat_count | integer | 拍拍數，新建立時為 0 |

#### 狀態碼

- `201 Created`: 成功建立
- `400 Bad Request`: 內容為空或格式錯誤

#### 錯誤訊息

| 狀態碼 | 訊息 |
|--------|------|
| 400 | 「送出失敗，你的慘事暫時無人接收」 |

#### 使用範例

```bash
curl -X POST http://localhost:5000/api/stories \
  -H "Content-Type: application/json" \
  -d '{"content": "今天被老闆罵了"}'
```

```javascript
// JavaScript (fetch API)
const response = await fetch('http://localhost:5000/api/stories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: '今天被老闆罵了' })
});
const data = await response.json();
console.log(data);
```

---

### 3. 取得隨機慘事

隨機取得一則慘事，用於 Feed 頁的隨機推播功能。

#### 請求

```http
GET /api/stories/random
```

#### 回應

```json
{
  "id": 1,
  "content": "今天被老闆罵了",
  "pat_count": 2
}
```

#### 回應欄位

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | integer | 慘事 ID |
| content | string | 慘事內容 |
| pat_count | integer | 當前拍拍數 |

#### 狀態碼

- `200 OK`: 成功取得
- `404 Not Found`: 目前沒有慘事

#### 錯誤訊息

| 狀態碼 | 訊息 |
|--------|------|
| 404 | 「目前沒有慘事，快去投稿吧！」 |

#### 使用範例

```bash
curl http://localhost:5000/api/stories/random
```

```javascript
// JavaScript (fetch API)
const response = await fetch('http://localhost:5000/api/stories/random');
const data = await response.json();
console.log(data);
```

---

### 4. 拍拍慘事

對指定慘事給予「拍拍」，表達同情與支持。當慘事累積 3 個拍拍時，會自動解鎖聊天室。

#### 請求

```http
PUT /api/stories/{story_id}/pat
```

#### 路徑參數

| 參數 | 類型 | 說明 |
|------|------|------|
| story_id | integer | 慘事 ID |

#### 回應（未解鎖）

```json
{
  "pat_count": 2,
  "match_unlocked": false
}
```

#### 回應（已解鎖）

```json
{
  "pat_count": 3,
  "match_unlocked": true,
  "chat_room_id": 42
}
```

#### 回應欄位

| 欄位 | 類型 | 說明 |
|------|------|------|
| pat_count | integer | 更新後的拍拍數 |
| match_unlocked | boolean | 是否解鎖聊天室 |
| chat_room_id | integer | 聊天室 ID（僅在 match_unlocked 為 true 時出現） |

#### 狀態碼

- `200 OK`: 成功拍拍
- `404 Not Found`: 慘事不存在

#### 錯誤訊息

| 狀態碼 | 訊息 |
|--------|------|
| 404 | 「拍拍失敗，請稍後再試」 |

#### 使用範例

```bash
curl -X PUT http://localhost:5000/api/stories/1/pat
```

```javascript
// JavaScript (fetch API)
const response = await fetch('http://localhost:5000/api/stories/1/pat', {
  method: 'PUT'
});
const data = await response.json();

if (data.match_unlocked) {
  console.log('聊天室已解鎖！ID:', data.chat_room_id);
}
```

#### 業務邏輯

1. 在 `pats` 表新增一筆記錄
2. 更新 `stories` 表的 `pat_count` 欄位（+1）
3. 若 `pat_count >= 3`：
   - 檢查是否已有 `chat_room` 記錄
   - 若無，建立新的 `chat_room` 記錄
   - 回傳 `match_unlocked: true` 與 `chat_room_id`
4. 若 `pat_count < 3`：
   - 回傳 `match_unlocked: false`

---

### 5. 建立聊天室

為指定慘事建立聊天室。此端點具有冪等性，若聊天室已存在則回傳現有 ID。

#### 請求

```http
POST /api/chat-rooms
Content-Type: application/json

{
  "story_id": 1
}
```

#### 請求參數

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| story_id | integer | 是 | 慘事 ID |

#### 回應（新建立）

```json
{
  "chat_room_id": 42,
  "created_at": "2025-01-15T10:30:00Z"
}
```

#### 回應（已存在）

```json
{
  "chat_room_id": 42,
  "created_at": "2025-01-15T10:30:00Z"
}
```

#### 回應欄位

| 欄位 | 類型 | 說明 |
|------|------|------|
| chat_room_id | integer | 聊天室 ID |
| created_at | string | 建立時間（ISO 8601 格式） |

#### 狀態碼

- `201 Created`: 成功建立新聊天室
- `200 OK`: 聊天室已存在（冪等性）
- `400 Bad Request`: 拍拍數不足或參數錯誤
- `404 Not Found`: 慘事不存在

#### 錯誤訊息

| 狀態碼 | 訊息 |
|--------|------|
| 400 | 「story_id 參數為必填」 |
| 400 | 「拍拍數不足，無法解鎖聊天室」 |
| 404 | 「慘事不存在」 |

#### 使用範例

```bash
curl -X POST http://localhost:5000/api/chat-rooms \
  -H "Content-Type: application/json" \
  -d '{"story_id": 1}'
```

```javascript
// JavaScript (fetch API)
const response = await fetch('http://localhost:5000/api/chat-rooms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ story_id: 1 })
});
const data = await response.json();
console.log('聊天室 ID:', data.chat_room_id);
```

#### 業務邏輯

1. 驗證 `story_id` 存在
2. 驗證 `pat_count >= 3`
3. 檢查是否已有 `chat_room` 記錄
4. 若無，建立新的 `chat_room` 記錄並回傳 `201 Created`
5. 若有，回傳現有 `chat_room_id` 並回傳 `200 OK`

---

### 6. 取得聊天室訊息

取得指定聊天室的所有訊息，可選擇性過濾時間。

#### 請求

```http
GET /api/chat-rooms/{chat_room_id}/messages?since=2025-01-15T10:30:00Z
```

#### 路徑參數

| 參數 | 類型 | 說明 |
|------|------|------|
| chat_room_id | integer | 聊天室 ID |

#### 查詢參數

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| since | string | 否 | ISO 8601 時間戳，只回傳此時間之後的訊息 |

#### 回應

```json
{
  "messages": [
    {
      "id": 1,
      "sender_story_id": 123,
      "content": "你也很慘嗎？",
      "created_at": "2025-01-15T10:31:00Z"
    },
    {
      "id": 2,
      "sender_story_id": 456,
      "content": "對啊，我們都沒救了",
      "created_at": "2025-01-15T10:31:30Z"
    }
  ]
}
```

#### 回應欄位

| 欄位 | 類型 | 說明 |
|------|------|------|
| messages | array | 訊息列表 |
| messages[].id | integer | 訊息 ID |
| messages[].sender_story_id | integer | 發送者的慘事 ID |
| messages[].content | string | 訊息內容 |
| messages[].created_at | string | 發送時間（ISO 8601 格式） |

#### 狀態碼

- `200 OK`: 成功取得
- `400 Bad Request`: since 參數格式錯誤
- `404 Not Found`: 聊天室不存在

#### 錯誤訊息

| 狀態碼 | 訊息 |
|--------|------|
| 400 | 「since 參數格式錯誤」 |
| 404 | 「聊天室不存在」 |

#### 使用範例

```bash
# 取得所有訊息
curl http://localhost:5000/api/chat-rooms/42/messages

# 取得指定時間之後的訊息
curl "http://localhost:5000/api/chat-rooms/42/messages?since=2025-01-15T10:30:00Z"
```

```javascript
// JavaScript (fetch API) - 取得所有訊息
const response = await fetch('http://localhost:5000/api/chat-rooms/42/messages');
const data = await response.json();
console.log('訊息列表:', data.messages);

// JavaScript (fetch API) - 輪詢新訊息
const lastFetchedAt = '2025-01-15T10:30:00Z';
const response = await fetch(
  `http://localhost:5000/api/chat-rooms/42/messages?since=${lastFetchedAt}`
);
const data = await response.json();
console.log('新訊息:', data.messages);
```

#### 業務邏輯

1. 驗證 `chat_room_id` 存在
2. 若有 `since` 參數：
   - 驗證 ISO 8601 格式
   - 查詢 `created_at > since` 的訊息
3. 若無 `since` 參數：
   - 查詢所有訊息
4. 按 `created_at` 升序排序
5. 回傳訊息列表

---

### 7. 發送訊息

在指定聊天室發送訊息。

#### 請求

```http
POST /api/chat-rooms/{chat_room_id}/messages
Content-Type: application/json

{
  "sender_story_id": 123,
  "content": "我們一起加油吧"
}
```

#### 路徑參數

| 參數 | 類型 | 說明 |
|------|------|------|
| chat_room_id | integer | 聊天室 ID |

#### 請求參數

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| sender_story_id | integer | 是 | 發送者的慘事 ID |
| content | string | 是 | 訊息內容，長度 1-500 字元 |

#### 回應

```json
{
  "id": 3,
  "sender_story_id": 123,
  "content": "我們一起加油吧",
  "created_at": "2025-01-15T10:32:00Z"
}
```

#### 回應欄位

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | integer | 訊息 ID |
| sender_story_id | integer | 發送者的慘事 ID |
| content | string | 訊息內容 |
| created_at | string | 發送時間（ISO 8601 格式） |

#### 狀態碼

- `201 Created`: 成功發送
- `400 Bad Request`: 內容為空、超過 500 字元或參數錯誤
- `403 Forbidden`: 發送者不存在
- `404 Not Found`: 聊天室不存在
- `500 Internal Server Error`: 伺服器內部錯誤

#### 錯誤訊息

| 狀態碼 | 訊息 |
|--------|------|
| 400 | 「訊息不可為空白」 |
| 400 | 「訊息長度超過限制（最多 500 字）」 |
| 400 | 「sender_story_id 參數為必填」 |
| 403 | 「發送者慘事不存在」 |
| 404 | 「聊天室不存在」 |
| 500 | 「訊息送出失敗，請稍後再試」 |

#### 使用範例

```bash
curl -X POST http://localhost:5000/api/chat-rooms/42/messages \
  -H "Content-Type: application/json" \
  -d '{"sender_story_id": 123, "content": "我們一起加油吧"}'
```

```javascript
// JavaScript (fetch API)
const response = await fetch('http://localhost:5000/api/chat-rooms/42/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sender_story_id: 123,
    content: '我們一起加油吧'
  })
});
const data = await response.json();
console.log('訊息已發送:', data);
```

#### 業務邏輯

1. 驗證 `chat_room_id` 存在
2. 驗證 `sender_story_id` 存在
3. 驗證 `content` 不為空或純空白
4. 驗證 `content` 長度 1-500 字元
5. 插入訊息到 `messages` 表
6. 回傳新建立的訊息

---

## 資料模型

### stories 表

儲存使用者投稿的慘事。

```sql
CREATE TABLE stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    pat_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### pats 表

記錄拍拍互動歷史。

```sql
CREATE TABLE pats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id)
);
```

### chat_rooms 表

儲存解鎖的聊天室。

```sql
CREATE TABLE chat_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id)
);
```

### messages 表

儲存聊天室訊息。

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

## 使用流程範例

### 完整配對流程

以下是一個完整的使用者互動流程，從投稿慘事到聊天室對話。

#### 1. 使用者 A 投稿慘事

```bash
curl -X POST http://localhost:5000/api/stories \
  -H "Content-Type: application/json" \
  -d '{"content": "今天被老闆罵了"}'
```

回應：
```json
{
  "id": 1,
  "content": "今天被老闆罵了",
  "pat_count": 0
}
```

#### 2. 使用者 B 瀏覽慘事

```bash
curl http://localhost:5000/api/stories/random
```

回應：
```json
{
  "id": 1,
  "content": "今天被老闆罵了",
  "pat_count": 0
}
```

#### 3. 使用者 B 拍拍慘事（第 1 次）

```bash
curl -X PUT http://localhost:5000/api/stories/1/pat
```

回應：
```json
{
  "pat_count": 1,
  "match_unlocked": false
}
```

#### 4. 使用者 C 拍拍慘事（第 2 次）

```bash
curl -X PUT http://localhost:5000/api/stories/1/pat
```

回應：
```json
{
  "pat_count": 2,
  "match_unlocked": false
}
```

#### 5. 使用者 D 拍拍慘事（第 3 次，解鎖）

```bash
curl -X PUT http://localhost:5000/api/stories/1/pat
```

回應：
```json
{
  "pat_count": 3,
  "match_unlocked": true,
  "chat_room_id": 1
}
```

#### 6. 使用者 A 開啟聊天室

```bash
curl http://localhost:5000/api/chat-rooms/1/messages
```

回應：
```json
{
  "messages": []
}
```

#### 7. 使用者 A 發送訊息

```bash
curl -X POST http://localhost:5000/api/chat-rooms/1/messages \
  -H "Content-Type: application/json" \
  -d '{"sender_story_id": 1, "content": "謝謝大家的拍拍"}'
```

回應：
```json
{
  "id": 1,
  "sender_story_id": 1,
  "content": "謝謝大家的拍拍",
  "created_at": "2025-01-15T10:32:00Z"
}
```

#### 8. 使用者 D 輪詢新訊息

```bash
curl "http://localhost:5000/api/chat-rooms/1/messages?since=2025-01-15T10:31:00Z"
```

回應：
```json
{
  "messages": [
    {
      "id": 1,
      "sender_story_id": 1,
      "content": "謝謝大家的拍拍",
      "created_at": "2025-01-15T10:32:00Z"
    }
  ]
}
```

---

## 錯誤處理最佳實踐

### 前端錯誤處理

```javascript
async function patStory(storyId) {
  try {
    const response = await fetch(`http://localhost:5000/api/stories/${storyId}/pat`, {
      method: 'PUT'
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('拍拍失敗:', error.message);
      // 顯示錯誤訊息給使用者
      showErrorMessage(error.message);
      return { ok: false, status: response.status };
    }
    
    const data = await response.json();
    return { ok: true, data };
    
  } catch (error) {
    console.error('網路錯誤:', error);
    showErrorMessage('拍拍失敗，請稍後再試');
    return { ok: false, status: 0 };
  }
}
```

### 後端錯誤處理

```python
@app.route("/api/chat-rooms/<int:chat_room_id>/messages", methods=["POST"])
def send_message(chat_room_id):
    try:
        data = request.get_json(silent=True) or {}
        content = (data.get("content") or "").strip()
        
        # 驗證邏輯...
        
        # 資料庫操作...
        
        return jsonify({...}), 201
        
    except Exception as e:
        app.logger.error(f"Error sending message: {e}")
        return jsonify({
            "message": "訊息送出失敗，請稍後再試"
        }), 500
```

---

## 效能考量

### 輪詢機制

目前使用輪詢機制（每 3 秒更新），適合 MVP 階段，但有以下限制：

- **延遲**：最多 3 秒的訊息延遲
- **伺服器負載**：每個開啟的聊天室每秒產生 0.33 個請求
- **頻寬消耗**：即使沒有新訊息也會發送請求

**建議**：
- 當使用者量增長時，考慮升級為 WebSocket
- 使用 Redis 快取訊息，減少資料庫查詢
- 實作連線池管理，提升資料庫效能

### 資料庫索引

已建立以下索引以提升查詢效能：

```sql
CREATE INDEX idx_messages_chat_room_created 
ON messages(chat_room_id, created_at);
```

此索引加速以下查詢：
- 取得聊天室所有訊息
- 使用 `since` 參數過濾訊息

---

## 安全性考量

### 目前限制

- **無認證系統**：任何人都可以發送訊息
- **無授權檢查**：無法驗證發送者是否為聊天室成員
- **無內容審核**：無法過濾不當內容
- **無速率限制**：可能遭受 DDoS 攻擊

### 未來改進

1. **引入使用者認證**：使用 JWT 或 OAuth 2.0
2. **實作授權檢查**：驗證發送者是否為聊天室成員
3. **新增內容審核**：過濾不當內容（如髒話、廣告）
4. **實作速率限制**：使用 Flask-Limiter 限制請求頻率
5. **加密敏感資料**：使用 HTTPS 加密傳輸

---

## 版本歷史

### v1.0.0 (2025-01-15)

- 初始版本
- 實作基本 CRUD 功能
- 實作拍拍解鎖機制
- 實作聊天室功能
- 實作輪詢機制

---

## 聯絡方式

如有問題或建議，歡迎提交 Issue 或 Pull Request。

**專案口號**：「大家都沒救了，不如就在一起吧。」 🗑️💘
