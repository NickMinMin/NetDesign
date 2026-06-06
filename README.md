# 魯蛇回收站（TrashMatch）

> 「大家都沒救了，不如就在一起吧。」

一個零門檻的匿名「比慘」交友平台，透過幽默與自嘲取代傳統交友 App 的外貌焦慮。

---

## 目錄

- [專案簡介](#專案簡介)
- [核心功能](#核心功能)
- [技術架構](#技術架構)
- [快速開始](#快速開始)
- [功能說明](#功能說明)
- [REST API 設計文件](#rest-api-設計文件)
- [資料庫設計文件](#資料庫設計文件)
- [資料庫正規化分析](#資料庫正規化分析)
- [專案結構](#專案結構)
- [測試](#測試)
- [搞笑文案列表](#搞笑文案列表)
- [未來規劃](#未來規劃)

---

## 專案簡介

「魯蛇回收站」讓使用者透過分享生活中的挫折與窘境，與有共鳴的人建立連結。當你的慘事累積拍拍後，系統會自動解鎖聊天室，讓你與同樣「沒救」的人開始對話。支援帳號系統與完全匿名模式並行，讓使用者自由選擇身份。

---

## 核心功能

| 功能 | 說明 |
|------|------|
| **匿名 / 帳號雙模式** | 無需註冊即可投稿，也可用帳號登入以保留投稿紀錄 |
| **投稿慘事** | 依分類（愛情慘劇 / 職場地獄 / 考試爆炸 / 家庭悲劇 / 其他衰事）投稿 |
| **隨機瀏覽** | 隨機推播慘事，可依分類過濾 |
| **拍拍互動** | 對慘事按拍拍，達門檻後自動解鎖聊天室 |
| **比慘對決** | 兩則慘事 PK，投票選出「更慘」的那則 |
| **聊天室** | 拍拍解鎖後開啟私人聊天，輪詢式即時更新 |
| **公開留言** | 任何人都可以對慘事發表公開留言 |
| **慘度排行榜** | 依拍拍數 + 對決得票數綜合排名，前 10 名公開展示 |
| **個人頁面** | 登入後查看自己的投稿紀錄 |

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | HTML / CSS / Vanilla JavaScript（ES6 模組） |
| 後端 | Python 3.8+ / Flask / Flask-CORS |
| 資料庫 | SQLite（`loser.db`） |
| 認證 | JWT（PyJWT，有效期 30 天）+ bcrypt 密碼雜湊 |
| 通訊 | RESTful API + 長輪詢（3 秒間隔） |
| 測試 | pytest（後端）/ Playwright（前端 E2E） |

---

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

   依賴套件：`Flask`、`flask-cors`、`bcrypt`、`PyJWT`

3. **初始化資料庫**
   ```bash
   python init_db.py
   ```
   > 若資料庫已存在，`app.py` 啟動時會自動執行 migration，補齊缺少的欄位。

4. **啟動後端伺服器**
   ```bash
   python app.py
   ```
   伺服器將在 `http://localhost:5000` 啟動

5. **開啟前端**

   直接用瀏覽器開啟根目錄的 `index.html`，或使用本地伺服器：
   ```bash
   python -m http.server 8000
   ```
   前端將在 `http://localhost:8000` 啟動

---

## 功能說明

### 1. 帳號系統

系統採**雙身份設計**：已登入使用者（JWT）與匿名訪客（session token）可並行使用所有功能。

- **註冊**：設定登入暱稱與密碼，系統隨機分配搞笑代號（如「垃圾桶 #4521」）
- **真實暱稱隱藏**：對其他人只顯示搞笑代號，保護真實身份
- **匿名模式**：未登入時系統自動建立 session，並分配臨時匿名代號

### 2. 投稿慘事

無需登入即可投稿，支援依分類整理：

- 點擊「📝 投稿」→ 輸入慘事（最多 500 字）→ 選擇分類 → 送出
- 投稿後系統回傳 `token`，作為後續聊天室發訊的身份憑證

### 3. 瀏覽 / 拍拍

- 系統隨機推播慘事，可過濾分類
- 對有共鳴的慘事按「拍拍 TA」，達到門檻後自動解鎖聊天室
- 每位使用者對同一則慘事只能拍一次（登入或 session 去重）

### 4. 比慘對決

- 進入「比慘對決」頁面，系統隨機配出兩則慘事 PK
- 登入後投票選出「更慘」的那則，投票結果即時顯示
- 對決得票數計入排行榜總分

### 5. 聊天室

- 拍拍達到門檻後聊天室自動解鎖，從右側滑入
- 每 3 秒輪詢新訊息，訊息長度限制 1–500 字元
- 聊天室與慘事一對一綁定

### 6. 公開留言

任何人（登入或匿名）都可以對慘事留下公開留言，每則最多 200 字。

### 7. 慘度排行榜

```
score = 對決總得票數（pair_votes）+ 拍拍數（pat_count）
```

前 10 名公開顯示，分別展示 `vote_count`、`pat_count`、`score`。

---

## REST API 設計文件

後端 API 採用 **REST 架構風格**，以 **Flask** 實作，資料格式統一為 **JSON**。  
基本 URL：`http://localhost:5000`

### 認證機制

| 身份類型 | 認證方式 | 說明 |
|----------|----------|------|
| 已登入使用者 | `Authorization: Bearer <JWT>` | 登入或註冊後取得，有效期 30 天 |
| 匿名投稿者 | `Authorization: Bearer <story_token>` | `stories.token`，投稿時回傳，用於聊天室發訊 |
| 匿名訪客 | Request Body `session_token` | 由 `GET /api/session` 取得 |

### 通用錯誤格式

所有錯誤回應均使用以下格式：
```json
{ "message": "錯誤描述文字" }
```

### 端點總覽

| 方法 | 路徑 | 說明 | 需要認證 |
|------|------|------|----------|
| GET | `/` | 健康檢查 | 否 |
| POST | `/api/register` | 註冊帳號 | 否 |
| POST | `/api/login` | 登入 | 否 |
| GET | `/api/me` | 取得目前使用者資訊 | JWT |
| GET | `/api/session` | 取得 / 建立匿名 session | 否 |
| POST | `/api/stories` | 投稿慘事 | 否（選填 JWT） |
| GET | `/api/stories/random` | 取得隨機一則慘事 | 否 |
| GET | `/api/stories/random-pair` | 取得隨機對決組 | 否 |
| PUT | `/api/stories/:id/pat` | 拍拍慘事 | 否（選填 JWT） |
| GET | `/api/stories/:id/owner` | 取得慘事作者代號 | 否 |
| GET | `/api/stories/:id/comments` | 取得慘事留言列表 | 否 |
| POST | `/api/stories/:id/comments` | 新增留言 | 否（選填 JWT） |
| POST | `/api/vote-pairs/:id/vote` | 對決投票 | **JWT 必填** |
| GET | `/api/vote-pairs/:id/results` | 取得對決票數結果 | 否 |
| POST | `/api/chat-rooms` | 建立聊天室 | 否 |
| GET | `/api/chat-rooms/:id/messages` | 取得聊天室訊息 | 否 |
| POST | `/api/chat-rooms/:id/messages` | 發送訊息 | story_token 或 JWT |
| GET | `/api/leaderboard` | 取得排行榜 | 否 |

---

### 帳號與認證 API

#### `POST /api/register`

註冊新帳號。

**Request Body**
```json
{
  "nickname": "my_nickname",
  "password": "mypassword"
}
```

| 欄位 | 類型 | 必填 | 限制 |
|------|------|------|------|
| `nickname` | string | ✅ | 最多 20 字，全系統唯一 |
| `password` | string | ✅ | 至少 4 個字元 |

**Response 201 – 成功**
```json
{
  "token": "<JWT>",
  "nickname": "my_nickname",
  "code_name": "垃圾桶 #4521",
  "message": "歡迎加入，垃圾桶 #4521！你的真實暱稱只有配對後才會揭露 👀"
}
```

**錯誤回應**

| 狀態碼 | 說明 |
|--------|------|
| 400 | 暱稱/密碼格式不符（空白、過長、過短） |
| 409 | 暱稱已被使用 |

---

#### `POST /api/login`

使用帳號密碼登入。

**Request Body**
```json
{
  "nickname": "my_nickname",
  "password": "mypassword"
}
```

**Response 200 – 成功**
```json
{
  "token": "<JWT>",
  "nickname": "my_nickname",
  "code_name": "垃圾桶 #4521",
  "message": "歡迎回來，垃圾桶 #4521！"
}
```

**錯誤回應**

| 狀態碼 | 說明 |
|--------|------|
| 400 | 缺少暱稱或密碼 |
| 401 | 使用者不存在或密碼錯誤 |

---

#### `GET /api/me`

取得目前登入使用者的基本資訊。

**Request Headers**
```
Authorization: Bearer <JWT>
```

**Response 200 – 成功**
```json
{
  "user_id": 1,
  "nickname": "my_nickname",
  "code_name": "垃圾桶 #4521"
}
```

**錯誤回應**

| 狀態碼 | 說明 |
|--------|------|
| 401 | 未登入或 JWT 已過期 |

---

### 匿名 Session API

#### `GET /api/session`

取得現有 session 或建立新的匿名 session。

**Query Parameters**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `token` | string | 否 | 現有的 session token，若有效則直接回傳 |

**Response 200 – token 有效**
```json
{ "session_token": "abc123...", "nickname": "廢物 #7788" }
```

**Response 201 – 建立新 session**
```json
{ "session_token": "def456...", "nickname": "魯蛇 #1234" }
```

---

### 慘事 API

#### `POST /api/stories`

投稿一則新慘事。

**Request Headers（選填）**
```
Authorization: Bearer <JWT>
```

**Request Body**
```json
{
  "content": "今天錢包掉進馬桶...",
  "category": "其他衰事"
}
```

| 欄位 | 類型 | 必填 | 限制 |
|------|------|------|------|
| `content` | string | ✅ | 不可空白，最多 500 字 |
| `category` | string | 否 | 預設「其他衰事」 |

合法 `category` 值：`愛情慘劇`、`職場地獄`、`考試爆炸`、`家庭悲劇`、`其他衰事`

**Response 201 – 成功**
```json
{
  "id": 42,
  "content": "今天錢包掉進馬桶...",
  "pat_count": 0,
  "vote_count": 0,
  "category": "其他衰事",
  "token": "a1b2c3d4..."
}
```

> ⚠️ `token` 請妥善保存，用於聊天室發訊身份驗證。

**錯誤回應**

| 狀態碼 | 說明 |
|--------|------|
| 400 | 內容為空或超過 500 字 |

---

#### `GET /api/stories/random`

取得一則隨機慘事，可依分類過濾。

**Query Parameters**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `exclude_id` | integer | 否 | 排除特定慘事 ID |
| `category` | string | 否 | 只回傳指定分類的慘事 |

**Response 200 – 成功**
```json
{
  "id": 7,
  "content": "面試被問到暈，出門才發現褲子穿反...",
  "pat_count": 13,
  "category": "職場地獄"
}
```

**錯誤回應**

| 狀態碼 | 說明 |
|--------|------|
| 404 | 目前沒有符合條件的慘事 |

---

#### `GET /api/stories/random-pair`

取得兩則隨機慘事，建立一組對決配對。每次呼叫會在 `vote_pairs` 表新增一筆記錄。

**Response 200 – 成功**
```json
{
  "pair_id": 101,
  "stories": [
    { "id": 5, "content": "被老闆當眾罵哭..." },
    { "id": 9, "content": "考試寫錯考場跑去隔壁系..." }
  ]
}
```

**錯誤回應**

| 狀態碼 | 說明 |
|--------|------|
| 404 | 系統慘事數量不足（少於 2 則） |

---

#### `PUT /api/stories/:story_id/pat`

為指定慘事按拍拍。

**Request Headers（選填）**
```
Authorization: Bearer <JWT>
```

**Request Body（未登入時必填）**
```json
{ "session_token": "abc123..." }
```

**Response 200 – 成功**
```json
{
  "pat_count": 3,
  "match_unlocked": true,
  "chat_room_id": 12
}
```

| 欄位 | 說明 |
|------|------|
| `pat_count` | 更新後的拍拍總數 |
| `match_unlocked` | 是否已達解鎖聊天室門檻（`pat_count >= 1`） |
| `chat_room_id` | 若聊天室已解鎖則回傳，否則不包含此欄位 |

**錯誤回應**

| 狀態碼 | 說明 |
|--------|------|
| 400 | 未登入且未提供 session_token |
| 404 | 慘事不存在 |
| 409 | 已經拍過此則慘事 |

---

#### `GET /api/stories/:story_id/owner`

取得慘事作者的公開代號。匿名投稿回傳 `"神秘衰鬼"`。

**Response 200 – 成功**
```json
{ "nickname": "垃圾桶 #4521" }
```

**錯誤回應**

| 狀態碼 | 說明 |
|--------|------|
| 404 | 慘事不存在 |

---

### 對決投票 API

#### `POST /api/vote-pairs/:pair_id/vote`

對指定對決組投票，選出「更慘」的慘事。需要登入（JWT）。

**Request Headers**
```
Authorization: Bearer <JWT>
```

**Request Body**
```json
{ "voted_story_id": 5 }
```

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `voted_story_id` | integer | ✅ | 投給「更慘」的慘事 ID（必須屬於此對決組） |

**Response 200 – 成功**
```json
{
  "pair_id": 101,
  "story_a_id": 5,
  "story_b_id": 9,
  "votes_a": 7,
  "votes_b": 3
}
```

**錯誤回應**

| 狀態碼 | 說明 |
|--------|------|
| 400 | `voted_story_id` 缺失、格式錯誤或不屬於此對決組 |
| 401 | 未登入或 JWT 過期 |
| 404 | 對決組不存在 |
| 409 | 已對此對決組投過票 |

---

#### `GET /api/vote-pairs/:pair_id/results`

取得指定對決組的即時票數。

**Response 200 – 成功**
```json
{
  "pair_id": 101,
  "story_a_id": 5,
  "story_b_id": 9,
  "votes_a": 7,
  "votes_b": 3
}
```

**錯誤回應**

| 狀態碼 | 說明 |
|--------|------|
| 404 | 對決組不存在 |

---

### 留言 API

#### `GET /api/stories/:story_id/comments`

取得指定慘事的公開留言列表（最多 50 則，按時間升冪）。

**Response 200 – 成功**
```json
{
  "comments": [
    {
      "id": 1,
      "content": "也太慘了吧...",
      "author_name": "廢物 #5566",
      "created_at": "2025-06-01T10:30:00"
    }
  ]
}
```

**錯誤回應**

| 狀態碼 | 說明 |
|--------|------|
| 404 | 慘事不存在 |

---

#### `POST /api/stories/:story_id/comments`

新增留言到指定慘事。

**Request Headers（選填）**
```
Authorization: Bearer <JWT>
```

**Request Body**
```json
{
  "content": "這也太慘了吧...",
  "session_token": "abc123..."
}
```

| 欄位 | 類型 | 必填 | 限制 |
|------|------|------|------|
| `content` | string | ✅ | 不可空白，最多 200 字 |
| `session_token` | string | 否 | 未登入時提供 |

**Response 201 – 成功**
```json
{
  "id": 10,
  "content": "這也太慘了吧...",
  "author_name": "廢物 #5566",
  "created_at": "2025-06-06T15:00:00"
}
```

**錯誤回應**

| 狀態碼 | 說明 |
|--------|------|
| 400 | 留言為空或超過 200 字 |
| 404 | 慘事不存在 |

---

### 聊天室 API

#### `POST /api/chat-rooms`

建立或取得指定慘事的聊天室（冪等，已存在則回傳 200）。

**Request Body**
```json
{ "story_id": 42 }
```

**Response 201 / 200**
```json
{ "chat_room_id": 12, "created_at": "2025-06-01T10:00:00" }
```

**錯誤回應**

| 狀態碼 | 說明 |
|--------|------|
| 400 | `story_id` 缺失或拍拍數不足 |
| 404 | 慘事不存在 |

> `PUT /api/stories/:id/pat` 達到門檻時會自動建立聊天室，通常不需手動呼叫此端點。

---

#### `GET /api/chat-rooms/:chat_room_id/messages`

取得指定聊天室的歷史訊息。

**Query Parameters**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `since` | string | 否 | ISO 8601 時間戳，只回傳此時間之後的訊息（輪詢用） |

**Response 200 – 成功**
```json
{
  "messages": [
    {
      "id": 1,
      "sender_story_id": 42,
      "content": "你這比我慘多了...",
      "created_at": "2025-06-01T10:05:00"
    }
  ]
}
```

**錯誤回應**

| 狀態碼 | 說明 |
|--------|------|
| 400 | `since` 格式錯誤（須為 ISO 8601） |
| 404 | 聊天室不存在 |

---

#### `POST /api/chat-rooms/:chat_room_id/messages`

在指定聊天室發送訊息。

**Request Headers**
```
Authorization: Bearer <story_token 或 JWT>
```

**Request Body**
```json
{
  "sender_story_id": 42,
  "content": "這段話只有我們知道..."
}
```

| 欄位 | 類型 | 必填 | 限制 |
|------|------|------|------|
| `sender_story_id` | integer | ✅ | 發送者對應的慘事 ID |
| `content` | string | ✅ | 不可空白，最多 500 字 |

**Response 201 – 成功**
```json
{
  "id": 55,
  "sender_story_id": 42,
  "content": "這段話只有我們知道...",
  "created_at": "2025-06-06T15:30:00"
}
```

**認證流程：**
```
Authorization: Bearer token
       │
       ├── 嘗試解析為 JWT
       │      ├── 成功 → 確認使用者是該聊天室的慘事作者 或 拍拍者
       │      └── 失敗 → 嘗試比對 stories.token（匿名 story token）
       │                   └── 符合 sender_story_id → 允許發訊
       │
       └── 全部失敗 → 403
```

**錯誤回應**

| 狀態碼 | 說明 |
|--------|------|
| 400 | 訊息為空、超過 500 字、或缺少 `sender_story_id` |
| 401 | Authorization header 缺失或格式錯誤 |
| 403 | token 驗證失敗（無權在此聊天室發訊） |
| 404 | 聊天室或 `sender_story_id` 不存在 |
| 500 | 伺服器寫入錯誤 |

---

### 排行榜 API

#### `GET /api/leaderboard`

取得慘度排行榜前 10 名。

**Response 200 – 成功**
```json
{
  "stories": [
    {
      "id": 5,
      "content": "被老闆當眾罵哭...",
      "vote_count": 42,
      "pat_count": 18,
      "score": 60
    }
  ]
}
```

| 欄位 | 說明 |
|------|------|
| `vote_count` | 此慘事在所有對決中獲得的總票數（`pair_votes` 聚合） |
| `pat_count` | 此慘事收到的拍拍總數 |
| `score` | `vote_count + pat_count`，排名依此降冪排序 |

**計分公式：**
```
score = Σ pair_votes WHERE voted_story_id = story.id + stories.pat_count
```

---

### 其他

#### `GET /`

健康檢查。

**Response 200**
```json
{ "message": "TrashMatch API is running" }
```

---

## 資料庫設計文件

本系統後端使用 **SQLite** 儲存資料，資料庫檔案名稱為 `loser.db`。  
主要資料表共 10 張：`users`、`sessions`、`stories`、`pats`、`votes`、`vote_pairs`、`pair_votes`、`chat_rooms`、`messages`、`comments`。

### ER 關係圖

```
users ──< stories        (一個使用者可發多則慘事)
users ──< pats           (一個使用者可拍多則慘事)
users ──< votes          (一個使用者可對多則慘事投票)
users ──< pair_votes     (一個使用者可對多組對決投票)
users ──< comments       (一個使用者可發多則留言)

stories ──< pats         (一則慘事可收多個拍拍)
stories ──< votes        (一則慘事可收多票)
stories ──< comments     (一則慘事可有多則留言)
stories ──| chat_rooms   (一則慘事對應最多一間聊天室，1:1)
stories ──< messages     (一則慘事可作為多條訊息的發送者)

vote_pairs ──< pair_votes (一組對決可收多票)
vote_pairs >── stories    (story_a_id, story_b_id 各自指向 stories)
pair_votes >── stories    (voted_story_id 指向獲票的慘事)

chat_rooms ──< messages  (一間聊天室有多則訊息)
sessions                  (獨立表，匿名訪客 session)
```

---

### 資料表設計

#### 1. `users`

儲存已註冊的使用者帳號資訊。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 使用者唯一識別碼 |
| `nickname` | TEXT | NOT NULL UNIQUE | 使用者自訂登入暱稱（最多 20 字） |
| `code_name` | TEXT | NOT NULL | 系統自動產生的搞笑匿名代號（例：垃圾桶 #4521） |
| `password_hash` | TEXT | NOT NULL | bcrypt 加密後的密碼雜湊值 |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 帳號建立時間 |

```sql
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname      TEXT    NOT NULL UNIQUE,
    code_name     TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- `nickname` 作為登入識別，具有唯一性約束
- `code_name` 是對外顯示的身份，不直接揭露 `nickname`
- `password_hash` 採用 bcrypt 加鹽雜湊，不儲存明文密碼

---

#### 2. `sessions`

儲存匿名訪客的會話資料，支援未登入使用者擁有持久化匿名身份。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | session 唯一識別碼 |
| `token` | TEXT | NOT NULL UNIQUE | UUID 隨機 token，用於辨識訪客 |
| `nickname` | TEXT | NOT NULL | 系統生成的匿名暱稱 |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 建立時間 |

```sql
CREATE TABLE sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    token      TEXT    NOT NULL UNIQUE,
    nickname   TEXT    NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- `token` 使用 `uuid4().hex` 產生，確保全域唯一性
- 本表與 `users` 無外鍵關聯，代表兩種完全獨立的身份系統

---

#### 3. `stories`

儲存使用者投稿的慘事內容，是整個系統的核心實體。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 慘事唯一識別碼 |
| `content` | TEXT | NOT NULL | 慘事文字內容（最多 500 字） |
| `pat_count` | INTEGER | NOT NULL DEFAULT 0 | 累計拍拍次數（反正規化快取欄位） |
| `vote_count` | INTEGER | NOT NULL DEFAULT 0 | 舊版累計票數（保留相容性） |
| `token` | TEXT | NOT NULL DEFAULT '' | 投稿者專屬匿名 token，用於聊天室身份驗證 |
| `user_id` | INTEGER | FK → users(id) | 投稿者的使用者 ID（NULL 表示匿名） |
| `category` | TEXT | NOT NULL DEFAULT '其他衰事' | 慘事分類 |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 投稿時間 |

```sql
CREATE TABLE stories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    content    TEXT    NOT NULL,
    pat_count  INTEGER NOT NULL DEFAULT 0,
    vote_count INTEGER NOT NULL DEFAULT 0,
    token      TEXT    NOT NULL DEFAULT '',
    user_id    INTEGER,
    category   TEXT    NOT NULL DEFAULT '其他衰事',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

- `token` 在新增時由 `uuid4().hex` 自動產生，作為匿名發訊憑證
- `pat_count` 為反正規化設計，以加速排行榜查詢
- `vote_count` 為舊版保留欄位，現行改以 `pair_votes` 聚合統計

---

#### 4. `pats`

記錄每一筆拍拍行為，支援登入使用者與匿名訪客，防止重複拍拍。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 記錄唯一識別碼 |
| `story_id` | INTEGER | NOT NULL, FK → stories(id) | 被拍拍的慘事 |
| `user_id` | INTEGER | FK → users(id) | 登入使用者（與 session_token 二擇一） |
| `session_token` | TEXT | — | 匿名訪客的 session token（與 user_id 二擇一） |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 拍拍時間 |

```sql
CREATE TABLE pats (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id      INTEGER NOT NULL,
    user_id       INTEGER,
    session_token TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id),
    FOREIGN KEY (user_id)  REFERENCES users(id)
);
```

---

#### 5. `votes`（舊版，保留相容）

舊版投票機制，現行對決改用 `vote_pairs` + `pair_votes`。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 記錄唯一識別碼 |
| `user_id` | INTEGER | NOT NULL, FK → users(id) | 投票的使用者 |
| `story_id` | INTEGER | NOT NULL, FK → stories(id) | 被投票的慘事 |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 投票時間 |

```sql
CREATE TABLE votes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    story_id   INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES users(id),
    FOREIGN KEY (story_id) REFERENCES stories(id),
    UNIQUE (user_id, story_id)
);
```

---

#### 6. `vote_pairs`

比慘對決配對表，每次 `GET /api/stories/random-pair` 產生一筆。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 對決組唯一識別碼 |
| `story_a_id` | INTEGER | NOT NULL, FK → stories(id) | 對決第一則慘事 |
| `story_b_id` | INTEGER | NOT NULL, FK → stories(id) | 對決第二則慘事 |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 對決建立時間 |
| `is_active` | INTEGER | NOT NULL DEFAULT 1 | 對決是否進行中（1=是，0=已結束） |

```sql
CREATE TABLE vote_pairs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    story_a_id  INTEGER NOT NULL,
    story_b_id  INTEGER NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active   INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (story_a_id) REFERENCES stories(id),
    FOREIGN KEY (story_b_id) REFERENCES stories(id)
);
```

---

#### 7. `pair_votes`

比慘對決投票表，記錄每位使用者對某組對決的投票結果。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 記錄唯一識別碼 |
| `pair_id` | INTEGER | NOT NULL, FK → vote_pairs(id) | 所屬對決組 |
| `user_id` | INTEGER | NOT NULL, FK → users(id) | 投票的使用者（僅限登入） |
| `voted_story_id` | INTEGER | NOT NULL, FK → stories(id) | 被選為「更慘」的慘事 |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 投票時間 |

```sql
CREATE TABLE pair_votes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    pair_id         INTEGER NOT NULL,
    user_id         INTEGER NOT NULL,
    voted_story_id  INTEGER NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pair_id)        REFERENCES vote_pairs(id),
    FOREIGN KEY (user_id)        REFERENCES users(id),
    FOREIGN KEY (voted_story_id) REFERENCES stories(id),
    UNIQUE (pair_id, user_id)
);
```

- `UNIQUE (pair_id, user_id)` 確保每位使用者對同一組對決只能投一票
- `voted_story_id` 必須是該對決組的 `story_a_id` 或 `story_b_id`，由應用層驗證

---

#### 8. `chat_rooms`

儲存已解鎖的聊天室，每則慘事最多對應一間（1:1）。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 聊天室唯一識別碼 |
| `story_id` | INTEGER | NOT NULL UNIQUE, FK → stories(id) | 對應的慘事 |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 建立時間 |

```sql
CREATE TABLE chat_rooms (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id   INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id)
);
```

- `story_id UNIQUE` 確保每則慘事最多一間聊天室
- 解鎖條件：`stories.pat_count >= 1`

---

#### 9. `messages`

聊天室訊息記錄。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 訊息唯一識別碼 |
| `chat_room_id` | INTEGER | NOT NULL, FK → chat_rooms(id) | 所屬聊天室 |
| `sender_story_id` | INTEGER | NOT NULL, FK → stories(id) | 發送者對應的慘事 ID |
| `content` | TEXT | NOT NULL | 訊息內容（最多 500 字） |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 發送時間 |

```sql
CREATE TABLE messages (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_room_id     INTEGER NOT NULL,
    sender_story_id  INTEGER NOT NULL,
    content          TEXT    NOT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id)    REFERENCES chat_rooms(id),
    FOREIGN KEY (sender_story_id) REFERENCES stories(id)
);
```

- 發送者以 `sender_story_id` 表示，支援匿名與登入兩種身份

---

#### 10. `comments`

公開留言系統，任何人都可對慘事留言。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 留言唯一識別碼 |
| `story_id` | INTEGER | NOT NULL, FK → stories(id) | 被留言的慘事 |
| `user_id` | INTEGER | FK → users(id) | 留言使用者（NULL 表示匿名） |
| `session_token` | TEXT | — | 匿名訪客的 session token |
| `content` | TEXT | NOT NULL | 留言文字（最多 200 字） |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 留言時間 |

```sql
CREATE TABLE comments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id      INTEGER NOT NULL,
    user_id       INTEGER,
    session_token TEXT,
    content       TEXT    NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id),
    FOREIGN KEY (user_id)  REFERENCES users(id)
);
```

---

### 索引設計

| 索引名稱 | 所在表格 | 索引欄位 | 目的 |
|----------|----------|----------|------|
| `idx_messages_chat_room_created` | `messages` | `(chat_room_id, created_at)` | 加速聊天室訊息時序查詢 |
| `idx_sessions_token` | `sessions` | `(token)` | 加速匿名 session 查找 |
| `idx_users_nickname` | `users` | `(nickname)` | 加速登入時使用者查找 |
| `idx_votes_story_id` | `votes` | `(story_id)` | 加速舊版票數統計 |
| `idx_comments_story_id` | `comments` | `(story_id)` | 加速留言列表查詢 |
| `idx_vote_pairs_created_at` | `vote_pairs` | `(created_at)` | 加速按時間排序的對決查詢 |
| `idx_pair_votes_pair_id` | `pair_votes` | `(pair_id)` | 加速對決票數統計 |

---

## 資料庫正規化分析

### 第一正規化（1NF）

所有資料表均符合 1NF：

- 每個欄位都是不可分割的**原子值**（無重複欄位群、無多值欄位）
- 每個資料表都有明確的**主鍵**（Primary Key）
- 同一欄位不儲存多個值（例如：分類使用單一 `category` 欄位，而非 `category1`、`category2`）

---

### 第二正規化（2NF）

所有資料表均符合 2NF：

- 所有非主鍵欄位**完全依賴**於主鍵（無部分函數相依）
- 本系統所有表均使用單欄位整數代理主鍵（`id AUTOINCREMENT`），因此不存在複合主鍵造成的部分相依問題
- `pair_votes` 雖有 `UNIQUE (pair_id, user_id)` 的複合唯一約束，但主鍵仍為單欄 `id`，所有欄位完全依賴 `id`

---

### 第三正規化（3NF）

**符合 3NF 的資料表：**

| 資料表 | 說明 |
|--------|------|
| `users` | `code_name` 由系統隨機產生後儲存，與 `nickname` 無函數相依關係，無傳遞相依 |
| `sessions` | `nickname` 是獨立產生的匿名代號，無傳遞相依 |
| `chat_rooms` | `story_id` 直接決定聊天室，無間接相依 |
| `vote_pairs` | `story_a_id`、`story_b_id` 僅依賴主鍵 `id` |
| `pair_votes` | 所有欄位完全依賴 `id`，`voted_story_id` 是獨立的業務事實 |
| `messages` | `content`、`created_at` 僅依賴訊息 `id` |
| `comments` | 所有欄位完全依賴留言 `id` |
| `pats` | 所有欄位完全依賴 `id` |

**已知的反正規化（Denormalization）設計：**

| 欄位 | 所在表格 | 說明 |
|------|----------|------|
| `pat_count` | `stories` | 可由 `SELECT COUNT(*) FROM pats WHERE story_id = ?` 即時計算，但為加速排行榜排序，選擇直接維護快取欄位 |
| `vote_count` | `stories` | 舊版保留欄位，現行排行榜改用 `pair_votes` 聚合，此欄已不再主動更新 |

**反正規化的取捨：**
- `pat_count` 犧牲了少量寫入一致性（每次拍拍需同時更新兩處），換取排行榜讀取效能
- 若未來讀取量降低，可移除 `pat_count` 改用 `JOIN` 聚合查詢

---

### BCNF（Boyce-Codd Normal Form）

| 資料表 | 候選鍵 | 結論 |
|--------|--------|------|
| `votes` | `UNIQUE (user_id, story_id)` | ✅ 符合 BCNF |
| `pair_votes` | `UNIQUE (pair_id, user_id)` | ✅ 符合 BCNF |
| `chat_rooms` | `story_id UNIQUE` | ✅ 符合 BCNF |
| 其餘資料表 | `id`（單一主鍵） | ✅ 均符合 BCNF |

---

### 重要設計決策總結

| 決策 | 說明 |
|------|------|
| 雙身份系統 | `users`（已登入）與 `sessions`（匿名訪客）並行，透過 `user_id` vs `session_token` 二擇一使用 |
| 身份隱藏 | `code_name` 是公開顯示的搞笑代號，`nickname` 只在登入後透過 JWT 揭露 |
| JWT 無狀態認證 | JWT 有效期 30 天，不需要伺服器端 session 表 |
| 匿名投稿 token | `stories.token` 作為輕量級投稿者憑證，讓匿名使用者也能在聊天室驗證身份 |
| 聊天室 1:1 限制 | `chat_rooms.story_id UNIQUE` 確保每則慘事最多一間聊天室 |
| 對決模式分離 | 新版對決使用獨立的 `vote_pairs` + `pair_votes` 表，與舊版 `votes` 解耦 |
| 反正規化快取 | `stories.pat_count` 保留快取欄位以優化高頻讀取的排行榜查詢 |

---

## 專案結構

```
NetDesign/
├── backend/
│   ├── app.py                 # Flask 主應用程式（API 路由、JWT、migration）
│   ├── init_db.py             # 資料庫初始化腳本（建表、索引）
│   ├── requirements.txt       # Python 依賴（Flask, flask-cors, bcrypt, PyJWT）
│   ├── loser.db               # SQLite 資料庫檔案
│   └── test_*.py              # 單元測試與整合測試（pytest）
├── css/
│   ├── base.css               # 全域基礎樣式、CSS 變數
│   ├── components.css         # 可複用元件樣式
│   ├── pages.css              # 各頁面專屬樣式
│   └── chat.css               # 聊天室面板樣式
├── js/
│   ├── main.js                # 應用程式進入點，初始化所有模組
│   ├── router.js              # Hash 路由（#cover/#feed/#post/#vote/#leaderboard/#profile）
│   ├── auth.js                # 帳號登入 / 註冊 / 登出
│   ├── session.js             # 匿名 session 管理
│   ├── feed.js                # 慘事瀏覽頁邏輯
│   ├── post.js                # 慘事投稿頁邏輯
│   ├── vote.js                # 比慘對決頁邏輯
│   ├── leaderboard.js         # 慘度排行榜邏輯
│   ├── chat.js                # 聊天室面板邏輯（輪詢）
│   ├── comments.js            # 公開留言邏輯
│   ├── profile.js             # 個人頁面邏輯
│   ├── renderer.js            # UI 渲染工具函式
│   ├── fetchClient.js         # API 請求封裝（含 JWT header）
│   └── *.test.js              # 各模組單元測試（Playwright）
├── MD/
│   ├── DATABASE_DESIGN.md     # 詳細資料庫設計文件
│   ├── API_DESIGN.md          # 詳細 REST API 設計文件
│   └── ...                    # 測試報告與實作摘要
├── index.html                 # 單頁應用程式主檔案（SPA）
└── README.md                  # 本文件
```

---

## 測試

### 後端（pytest）

```bash
cd backend
pytest test_*.py -v
```

### 前端 E2E（Playwright）

```bash
cd frontend
npx playwright test
```

### 手動測試流程

1. 啟動後端 `python app.py`
2. 用兩個瀏覽器分頁開啟前端
3. 分頁 A 投稿慘事，記下回傳的 `token`
4. 分頁 B 對該慘事拍拍，確認聊天室自動解鎖
5. 兩個分頁互相發訊，確認 3 秒輪詢正常接收
6. 進入 `#vote` 頁面登入後投票，確認票數即時更新
7. 進入 `#leaderboard` 確認排行榜分數計算正確

---

## 搞笑文案列表

| 場景 | 文案 |
|------|------|
| 配對成功 | 「💘 配對成功！你們都沒救了」 |
| 聊天室空狀態 | 「你們都沒救了，不如聊聊吧 💬✨」 |
| 投稿成功 | 「你的慘事已送達垃圾桶，等待有緣衰鬼」 |
| 拍拍失敗 | 「拍拍失敗，請稍後再試」 |
| 無慘事 | 「目前沒有慘事，快去投稿吧！」 |
| 404 頁面 | 「你的運氣跟這個網頁一樣，都不存在」 |
| 訊息失敗 | 「訊息送出失敗，你的話語迷失在虛空中」 |
| 聊天室載入失敗 | 「聊天室載入失敗，連系統都放棄你了」 |
| 搞笑代號格式 | 從「垃圾桶、廢物、魯蛇、衰鬼、倒楣鬼、沒救了、躺平王、失業中、被貓嫌、欠債中」隨機搭配四位數字 |

---

## 未來規劃

- [ ] 引入 WebSocket 取代輪詢，實現真正即時通訊
- [ ] 新增智慧配對演算法（基於 NLP 分析慘事內容相似度）
- [ ] 主題標籤系統（`#職場` `#感情` `#生活`）
- [ ] 慘事分享功能（複製連結 / 社群平台）
- [ ] 前端框架重構（React 或 Vue.js）
- [ ] 資料庫升級至 PostgreSQL
- [ ] 雲端部署（AWS / GCP / Azure）

---

**專案口號**：「大家都沒救了，不如就在一起吧。」 🗑️💘
