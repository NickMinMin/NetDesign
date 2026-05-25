# 魯蛇回收站（TrashMatch）

> 「大家都沒救了，不如就在一起吧。」

一個零門檻的匿名「比慘」交友平台，透過幽默與自嘲取代傳統交友 App 的外貌焦慮。

## 專案簡介

「魯蛇回收站」讓使用者透過分享生活中的挫折與窘境，與有共鳴的人建立連結。當你的慘事累積 3 個「拍拍」時，系統會自動解鎖聊天室，讓你與同樣「沒救」的人開始對話。

### 核心功能

- **匿名投稿慘事**：無需註冊，直接分享你的挫折與窘境
- **隨機推播慘事**：瀏覽其他人的慘事，感受「原來不只我慘」的共鳴
- **拍拍互動**：對有共鳴的慘事給予「拍拍」，表達同情與支持
- **解鎖聊天室**：累積 3 個拍拍後自動解鎖，開啟即時對話
- **即時訊息交流**：透過輪詢機制與配對成功的人聊天

### 技術架構

- **前端**：HTML/CSS/JavaScript（Vanilla JS，ES6 模組）
- **後端**：Python Flask + SQLite
- **通訊機制**：RESTful API + 輪詢（3 秒間隔）

## 快速開始

### 環境需求

- Python 3.8+
- 現代瀏覽器（Chrome、Firefox、Safari）

### 安裝步驟

1. **Clone 專案**
   ```bash
   git clone <repository-url>
   cd NetDesign
   ```

2. **安裝後端依賴**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **初始化資料庫**
   ```bash
   python init_db.py
   ```

4. **啟動後端伺服器**
   ```bash
   python app.py
   ```
   伺服器將在 `http://localhost:5000` 啟動

5. **開啟前端**
   - 使用瀏覽器開啟 `frontend/index.html`
   - 或使用本地伺服器（推薦）：
     ```bash
     cd frontend
     python -m http.server 8000
     ```
     前端將在 `http://localhost:8000` 啟動

## 功能說明

### 1. 投稿慘事

使用者可以匿名投稿生活中的挫折與窘境，無需註冊或登入。

**使用方式**：
1. 點擊「📝 投稿」按鈕
2. 輸入你的慘事（1-500 字元）
3. 點擊「送出」
4. 系統顯示：「你的慘事已送達垃圾桶，等待有緣衰鬼」

### 2. 瀏覽慘事

系統會隨機推播其他使用者的慘事，讓你感受「原來不只我慘」的共鳴。

**使用方式**：
1. 在首頁點擊「再看一個慘的」
2. 系統隨機顯示一則慘事
3. 可以選擇「拍拍 TA」表達支持

### 3. 拍拍互動

對有共鳴的慘事給予「拍拍」，表達同情與支持。當慘事累積 3 個拍拍時，會自動解鎖聊天室。

**使用方式**：
1. 瀏覽慘事時，點擊「拍拍 TA」按鈕
2. 系統顯示：「拍拍成功！你的同情已送達」
3. 當慘事累積 3 個拍拍時，系統自動解鎖聊天室

### 4. 聊天室功能

當慘事累積 3 個拍拍後，系統會自動解鎖聊天室，讓你與配對成功的人開始對話。

**功能特色**：
- **自動解鎖**：第 3 個拍拍後，聊天室面板自動從右側滑入
- **即時更新**：每 3 秒自動輪詢新訊息，無需手動重新整理
- **訊息驗證**：訊息長度限制 1-500 字元，防止空白或過長訊息
- **持久化**：關閉聊天室後，訊息歷史會保留，可隨時重新開啟

**使用方式**：
1. 當慘事累積 3 個拍拍時，聊天室自動開啟
2. 系統顯示：「💘 配對成功！你們都沒救了」
3. 在輸入框輸入訊息，點擊「送出」
4. 訊息會即時顯示在聊天室中
5. 點擊右上角「✕」關閉聊天室

## API 文件

### 基本資訊

- **Base URL**: `http://localhost:5000`
- **Content-Type**: `application/json`
- **CORS**: 已啟用

### 端點列表

#### 1. 建立慘事

建立一則新的慘事投稿。

```http
POST /api/stories
Content-Type: application/json

{
  "content": "今天被老闆罵了"
}
```

**回應**：
```json
{
  "id": 1,
  "content": "今天被老闆罵了",
  "pat_count": 0
}
```

**狀態碼**：
- `201 Created`: 成功建立
- `400 Bad Request`: 內容為空或格式錯誤

---

#### 2. 取得隨機慘事

隨機取得一則慘事。

```http
GET /api/stories/random
```

**回應**：
```json
{
  "id": 1,
  "content": "今天被老闆罵了",
  "pat_count": 2
}
```

**狀態碼**：
- `200 OK`: 成功取得
- `404 Not Found`: 目前沒有慘事

---

#### 3. 拍拍慘事

對指定慘事給予「拍拍」，當累積 3 個拍拍時會自動解鎖聊天室。

```http
PUT /api/stories/{story_id}/pat
```

**回應**（未解鎖）：
```json
{
  "pat_count": 2,
  "match_unlocked": false
}
```

**回應**（已解鎖）：
```json
{
  "pat_count": 3,
  "match_unlocked": true,
  "chat_room_id": 42
}
```

**狀態碼**：
- `200 OK`: 成功拍拍
- `404 Not Found`: 慘事不存在

---

#### 4. 建立聊天室

為指定慘事建立聊天室（需 pat_count >= 3）。

```http
POST /api/chat-rooms
Content-Type: application/json

{
  "story_id": 1
}
```

**回應**：
```json
{
  "chat_room_id": 42,
  "created_at": "2025-01-15T10:30:00Z"
}
```

**狀態碼**：
- `201 Created`: 成功建立
- `200 OK`: 聊天室已存在（冪等性）
- `400 Bad Request`: 拍拍數不足
- `404 Not Found`: 慘事不存在

---

#### 5. 取得聊天室訊息

取得指定聊天室的所有訊息，可選擇性過濾時間。

```http
GET /api/chat-rooms/{chat_room_id}/messages?since=2025-01-15T10:30:00Z
```

**查詢參數**：
- `since` (可選): ISO 8601 時間戳，只回傳此時間之後的訊息

**回應**：
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

**狀態碼**：
- `200 OK`: 成功取得
- `400 Bad Request`: since 參數格式錯誤
- `404 Not Found`: 聊天室不存在

---

#### 6. 發送訊息

在指定聊天室發送訊息。

```http
POST /api/chat-rooms/{chat_room_id}/messages
Content-Type: application/json

{
  "sender_story_id": 123,
  "content": "我們一起加油吧"
}
```

**回應**：
```json
{
  "id": 3,
  "sender_story_id": 123,
  "content": "我們一起加油吧",
  "created_at": "2025-01-15T10:32:00Z"
}
```

**狀態碼**：
- `201 Created`: 成功發送
- `400 Bad Request`: 內容為空或超過 500 字元
- `403 Forbidden`: 發送者不存在
- `404 Not Found`: 聊天室不存在
- `500 Internal Server Error`: 伺服器錯誤

---

### 錯誤處理

所有錯誤回應均包含 `message` 欄位，提供友善的錯誤訊息：

```json
{
  "message": "訊息不可為空白"
}
```

## 資料庫結構

### stories 表

儲存使用者投稿的慘事。

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER | 主鍵，自動遞增 |
| content | TEXT | 慘事內容 |
| pat_count | INTEGER | 拍拍數，預設 0 |
| created_at | TIMESTAMP | 建立時間 |

### pats 表

記錄拍拍互動歷史。

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER | 主鍵，自動遞增 |
| story_id | INTEGER | 外鍵，關聯 stories.id |
| created_at | TIMESTAMP | 拍拍時間 |

### chat_rooms 表

儲存解鎖的聊天室。

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER | 主鍵，自動遞增 |
| story_id | INTEGER | 外鍵，關聯 stories.id（UNIQUE） |
| created_at | TIMESTAMP | 建立時間 |

### messages 表

儲存聊天室訊息。

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER | 主鍵，自動遞增 |
| chat_room_id | INTEGER | 外鍵，關聯 chat_rooms.id |
| sender_story_id | INTEGER | 外鍵，關聯 stories.id |
| content | TEXT | 訊息內容 |
| created_at | TIMESTAMP | 發送時間 |

**索引**：
- `idx_messages_chat_room_created` (chat_room_id, created_at)：加速訊息查詢

## 開發指南

### 專案結構

```
NetDesign/
├── backend/
│   ├── app.py                 # Flask 應用程式主檔案
│   ├── init_db.py             # 資料庫初始化腳本
│   ├── requirements.txt       # Python 依賴套件
│   ├── loser.db               # SQLite 資料庫檔案
│   └── test_*.py              # 單元測試與整合測試
├── frontend/
│   ├── index.html             # 主頁面
│   ├── css/
│   │   ├── base.css           # 基礎樣式
│   │   ├── components.css     # 組件樣式
│   │   ├── pages.css          # 頁面樣式
│   │   └── chat.css           # 聊天室樣式
│   └── js/
│       ├── main.js            # 應用程式入口
│       ├── router.js          # 路由管理
│       ├── feed.js            # Feed 頁邏輯
│       ├── post.js            # 投稿頁邏輯
│       ├── chat.js            # 聊天室邏輯
│       ├── renderer.js        # UI 渲染
│       └── fetchClient.js     # API 呼叫封裝
├── README.md                  # 專案說明文件
└── EXPECTED_OUTCOMES.md       # 預期成果文件
```

### 擴展聊天室功能

如果你想擴展聊天室功能，以下是一些建議：

#### 1. 新增訊息類型

目前只支援純文字訊息，你可以擴展為支援圖片、貼圖、表情符號等。

**步驟**：
1. 修改 `messages` 表，新增 `message_type` 欄位（如 'text', 'image', 'sticker'）
2. 修改 `POST /api/chat-rooms/{id}/messages` 端點，支援不同類型的訊息
3. 修改前端 `renderer.js`，根據訊息類型渲染不同的 UI

#### 2. 新增已讀/未讀狀態

讓使用者知道對方是否已讀訊息。

**步驟**：
1. 修改 `messages` 表，新增 `is_read` 欄位（預設 false）
2. 新增 `PUT /api/chat-rooms/{id}/messages/{message_id}/read` 端點，標記訊息為已讀
3. 修改前端輪詢邏輯，自動標記已讀
4. 修改前端 UI，顯示已讀/未讀狀態

#### 3. 升級為 WebSocket

目前使用輪詢機制（每 3 秒更新），可升級為 WebSocket 實現真正的即時通訊。

**步驟**：
1. 安裝 Flask-SocketIO：`pip install flask-socketio`
2. 修改 `app.py`，引入 SocketIO
3. 修改前端 `chat.js`，使用 WebSocket 連線取代輪詢
4. 實作「對方正在輸入…」提示

#### 4. 新增多人聊天室

目前一個慘事對應一個聊天室，可擴展為多對多關係。

**步驟**：
1. 新增 `chat_room_members` 表，記錄聊天室成員
2. 修改 `chat_rooms` 表，移除 `story_id` 的 UNIQUE 約束
3. 修改配對邏輯，支援多人配對
4. 修改前端 UI，顯示聊天室成員列表

### 測試

#### 執行單元測試

```bash
cd backend
pytest test_*.py
```

#### 執行整合測試

```bash
cd backend
pytest test_integration_*.py
```

#### 手動測試

1. 啟動後端伺服器
2. 開啟兩個瀏覽器視窗
3. 在第一個視窗投稿慘事
4. 在第二個視窗拍拍該慘事 3 次
5. 驗證聊天室是否自動開啟
6. 在兩個視窗互相發送訊息，驗證輪詢機制

## 搞笑文案列表

「魯蛇回收站」的核心特色之一是幽默與自嘲的文案風格。以下是系統中使用的搞笑文案：

| 場景 | 文案 |
|------|------|
| 404 頁面 | 「你的運氣跟這個網頁一樣，都不存在」 |
| 配對成功 | 「💘 配對成功！你們都沒救了」 |
| 聊天室空狀態 | 「你們都沒救了，不如聊聊吧 💬✨」 |
| 投稿成功 | 「你的慘事已送達垃圾桶，等待有緣衰鬼」 |
| 載入中 | 「載入中… 🗑️」 |
| 無慘事 | 「目前沒有慘事，快去投稿吧！」 |
| 拍拍失敗 | 「拍拍失敗，請稍後再試」 |
| 訊息失敗 | 「訊息送出失敗，你的話語迷失在虛空中」 |
| 聊天室載入失敗 | 「聊天室載入失敗，連系統都放棄你了」 |

## 未來規劃

- [ ] 引入 WebSocket 實現真正的即時通訊
- [ ] 新增智慧配對演算法（基於 NLP 分析慨事內容）
- [ ] 新增使用者認證系統（可選的 Email/Google 登入）
- [ ] 新增慘事排行榜（最慘、最搞笑、最多拍拍）
- [ ] 新增主題標籤系統（#職場 #感情 #生活）
- [ ] 新增評論功能
- [ ] 新增分享功能（分享到社群平台）
- [ ] 引入 React 或 Vue.js 重構前端
- [ ] 資料庫升級至 PostgreSQL
- [ ] 雲端部署（AWS/GCP/Azure）

## 授權

本專案為教育用途，未指定授權。

## 聯絡方式

如有問題或建議，歡迎提交 Issue 或 Pull Request。

---

**專案口號**：「大家都沒救了，不如就在一起吧。」 🗑️💘
