# REST API 設計文件

## 概覽

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
| POST | `/api/vote-pairs/:id/vote` | 對決投票 | JWT |
| GET | `/api/vote-pairs/:id/results` | 取得對決票數結果 | 否 |
| POST | `/api/chat-rooms` | 建立聊天室 | 否 |
| GET | `/api/chat-rooms/:id/messages` | 取得聊天室訊息 | 否 |
| POST | `/api/chat-rooms/:id/messages` | 發送訊息 | story_token 或 JWT |
| GET | `/api/leaderboard` | 取得排行榜 | 否 |

---

## 帳號與認證 API

### `POST /api/register`

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

### `POST /api/login`

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

### `GET /api/me`

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

## 匿名 Session API

### `GET /api/session`

取得現有 session 或建立新的匿名 session。

**Query Parameters**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `token` | string | 否 | 現有的 session token，若有效則直接回傳 |

**Response 200 – token 有效，回傳現有 session**
```json
{
  "session_token": "abc123...",
  "nickname": "廢物 #7788"
}
```

**Response 201 – 建立新 session**
```json
{
  "session_token": "def456...",
  "nickname": "魯蛇 #1234"
}
```

---

## 慘事 API

### `POST /api/stories`

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
| `category` | string | 否 | 見合法值列表，預設「其他衰事」 |

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

### `GET /api/stories/random`

取得一則隨機慘事（可過濾分類）。

**Query Parameters**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `exclude_id` | integer | 否 | 排除特定慘事 ID（避免連續出現同一則） |
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

### `GET /api/stories/random-pair`

取得兩則隨機慘事，建立一組對決配對。

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

**備註：** 每次呼叫都會在 `vote_pairs` 表新增一筆配對記錄，並回傳 `pair_id`。

---

### `PUT /api/stories/:story_id/pat`

為指定慘事按拍拍（同理心按讚）。

**URL Parameters**
| 參數 | 類型 | 說明 |
|------|------|------|
| `story_id` | integer | 要拍拍的慘事 ID |

**Request Headers（選填）**
```
Authorization: Bearer <JWT>
```

**Request Body（未登入時必填）**
```json
{
  "session_token": "abc123..."
}
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
| `match_unlocked` | 是否已達解鎖聊天室門檻（pat_count >= 1） |
| `chat_room_id` | 若聊天室已解鎖則回傳，否則不包含此欄位 |

**錯誤回應**
| 狀態碼 | 說明 |
|--------|------|
| 400 | 未登入且未提供 session_token |
| 404 | 慘事不存在 |
| 409 | 已經拍過此則慘事 |

---

### `GET /api/stories/:story_id/owner`

取得慘事作者的公開代號。

**Response 200 – 成功**
```json
{
  "nickname": "垃圾桶 #4521"
}
```

若作者為匿名投稿，回傳 `"神秘衰鬼"`。

**錯誤回應**
| 狀態碼 | 說明 |
|--------|------|
| 404 | 慘事不存在 |

---

## 對決投票 API

### `POST /api/vote-pairs/:pair_id/vote`

對指定對決組進行投票，選出「更慘」的慘事。

> 需要登入（JWT）。

**URL Parameters**
| 參數 | 類型 | 說明 |
|------|------|------|
| `pair_id` | integer | 對決組 ID（由 random-pair 取得） |

**Request Headers**
```
Authorization: Bearer <JWT>
```

**Request Body**
```json
{
  "voted_story_id": 5
}
```

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `voted_story_id` | integer | ✅ | 投給「更慘」的那則慘事 ID（必須是此對決組的其中一則） |

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
| 400 | `voted_story_id` 缺失或格式錯誤 |
| 400 | `voted_story_id` 不屬於此對決組 |
| 401 | 未登入或 JWT 過期 |
| 404 | 對決組不存在 |
| 409 | 已對此對決組投過票 |

---

### `GET /api/vote-pairs/:pair_id/results`

取得指定對決組的即時票數結果。

**URL Parameters**
| 參數 | 類型 | 說明 |
|------|------|------|
| `pair_id` | integer | 對決組 ID |

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

## 留言 API

### `GET /api/stories/:story_id/comments`

取得指定慘事的公開留言列表。

**Response 200 – 成功**
```json
{
  "comments": [
    {
      "id": 1,
      "content": "也太慘了吧...",
      "author_name": "廢物 #5566",
      "created_at": "2025-06-01T10:30:00"
    },
    {
      "id": 2,
      "content": "這比我還慘",
      "author_name": "匿名衰鬼",
      "created_at": "2025-06-01T10:35:00"
    }
  ]
}
```

每次最多回傳 50 則留言，按 `created_at` 升冪排序。

**錯誤回應**
| 狀態碼 | 說明 |
|--------|------|
| 404 | 慘事不存在 |

---

### `POST /api/stories/:story_id/comments`

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
| `session_token` | string | 否 | 未登入時提供，用於匿名標記 |

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

## 聊天室 API

### `POST /api/chat-rooms`

手動建立或取得指定慘事的聊天室。

**Request Body**
```json
{
  "story_id": 42
}
```

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `story_id` | integer | ✅ | 要開啟聊天室的慘事 ID |

**Response 201 – 聊天室新建立**
```json
{
  "chat_room_id": 12,
  "created_at": "2025-06-01T10:00:00"
}
```

**Response 200 – 聊天室已存在**
```json
{
  "chat_room_id": 12,
  "created_at": "2025-06-01T10:00:00"
}
```

**錯誤回應**
| 狀態碼 | 說明 |
|--------|------|
| 400 | `story_id` 缺失 |
| 400 | 拍拍數不足，無法解鎖聊天室 |
| 404 | 慘事不存在 |

**備註：** `PUT /api/stories/:id/pat` 達到門檻時也會自動建立聊天室，通常不需手動呼叫此端點。

---

### `GET /api/chat-rooms/:chat_room_id/messages`

取得指定聊天室的歷史訊息。

**URL Parameters**
| 參數 | 類型 | 說明 |
|------|------|------|
| `chat_room_id` | integer | 聊天室 ID |

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

### `POST /api/chat-rooms/:chat_room_id/messages`

在指定聊天室發送訊息。

**URL Parameters**
| 參數 | 類型 | 說明 |
|------|------|------|
| `chat_room_id` | integer | 聊天室 ID |

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
Authorization header 的 Bearer token
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

## 排行榜 API

### `GET /api/leaderboard`

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
score = Σ pair_votes WHERE voted_story_id = story.id
      + stories.pat_count
```

---

## 其他

### `GET /`

健康檢查，確認 API 服務是否正常運作。

**Response 200**
```json
{
  "message": "TrashMatch API is running"
}
```
