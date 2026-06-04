# REST API 設計文件

## 概覽
後端 API 採用 REST 樣式，基於 Flask 實作。主要服務端點分為：
- 認證與帳號系統
- 慘事內容與拍拍
- 聊天室與訊息
- 匿名 session
- 排行榜與投票

所有 API 基本 URL 為 `http://localhost:5000`。

---

## 認證與帳號系統

### `POST /api/register`
註冊新帳號。

- Request Body
  - `nickname` (string, required)
  - `password` (string, required)
- Response 201
  - `{ token, nickname, code_name, message }`
- Error
  - 400：暱稱或密碼格式錯誤
  - 409：暱稱已存在

### `POST /api/login`
登入。

- Request Body
  - `nickname` (string, required)
  - `password` (string, required)
- Response 200
  - `{ token, nickname, code_name, message }`
- Error
  - 400：缺少暱稱或密碼
  - 401：使用者不存在或密碼錯誤

### `GET /api/me`
取得目前登入使用者資訊。

- Headers
  - `Authorization: Bearer <token>`
- Response 200
  - `{ user_id, nickname, code_name }`
- Error
  - 401：未登入或 token 過期

---

## 慘事內容與拍拍

### `POST /api/stories`
發布一則慘事。

- Request Body
  - `content` (string, required)
- Response 201
  - `{ id, content, pat_count, token }`
- Error
  - 400：內容為空

### `GET /api/stories/random`
取得一則隨機慘事。

- Response 200
  - `{ id, content, pat_count }`
- Error
  - 404：目前沒有慘事

### `GET /api/stories/random-pair`
取得兩則不重複的隨機慘事（投票專用）。

- Response 200
  - `{ stories: [{ id, content, vote_count }, { id, content, vote_count }] }`
- Error
  - 404：慘事數量不足

### `PUT /api/stories/<int:story_id>/pat`
為指定慘事按拍拍。

- URL Params
  - `story_id` (integer, required)
- Response 200
  - `{ pat_count, match_unlocked, chat_room_id? }`
- Error
  - 404：慘事不存在

#### 行為
- 每次成功呼叫會新增 `pats` 紀錄，並將 `stories.pat_count` +1。
- 若 `pat_count >= 3`，則自動建立或取得 `chat_rooms`。

---

## 聊天室與訊息

### `POST /api/chat-rooms`
建立聊天室（通常由前端在解鎖後呼叫）。

- Request Body
  - `story_id` (integer, required)
- Response 201
  - `{ chat_room_id, created_at }`
- Response 200
  - `{ chat_room_id, created_at }` 若聊天室已存在
- Error
  - 400：`story_id` 缺失或拍拍數不足
  - 404：慘事不存在

### `GET /api/chat-rooms/<int:chat_room_id>/messages`
取得指定聊天室訊息。

- URL Params
  - `chat_room_id` (integer, required)
- Query
  - `since` (timestamp string, optional)
- Response 200
  - `{ messages: [{ id, sender_story_id, content, created_at }, ...] }`
- Error
  - 404：聊天室不存在
  - 400：`since` 格式錯誤

### `POST /api/chat-rooms/<int:chat_room_id>/messages`
發送聊天室訊息。

- URL Params
  - `chat_room_id` (integer, required)
- Headers
  - `Authorization: Bearer <story_token>`
- Request Body
  - `sender_story_id` (integer, required)
  - `content` (string, required)
- Response 201
  - `{ id, sender_story_id, content, created_at }`
- Error
  - 400：訊息為空、長度超過、或 `sender_story_id` 缺失
  - 401：Authorization header 缺失或格式錯誤
  - 403：token 驗證失敗
  - 404：聊天室不存在
  - 500：訊息寫入失敗

#### 認證機制
- 以 `stories.token` 作為匿名發文者身份驗證。
- 送出訊息時，`sender_story_id` 必須對應該 token。

---

## 匿名 Session

### `GET /api/session`
取得或建立匿名 session。

- Query
  - `token` (string, optional)
- Response 200
  - `{ session_token, nickname }` 若 token 有效
- Response 201
  - `{ session_token, nickname }` 若產生新 session

#### 說明
- 系統會為未登入使用者建立一個 `sessions` 紀錄，並傳回匿名暱稱。

---

## 排行榜與投票

### `GET /api/leaderboard`
取得慘度排行榜前 10 名。

- Response 200
  - `{ stories: [{ id, content, vote_count }, ...] }`
- 行為：依 `vote_count` 由高到低排序，若無資料回傳空陣列。

### `POST /api/stories/<int:story_id>/vote`
對慘事投票。

- URL Params
  - `story_id` (integer, required)
- Query
  - `opponent_id` (integer, optional)
- Headers
  - `Authorization: Bearer <JWT token>`
- Response 200
  - `{ vote_counts: { '<story_id>': N, '<opponent_id>': M? } }`
- Error
  - 401：未登入或 token 過期
  - 404：慘事不存在
  - 409：已投過票

#### 行為
- 先驗證 JWT，再於 `votes` 表新增紀錄。
- 同時更新 `stories.vote_count`。
- 若有 `opponent_id`，會一併查詢對手最新票數並回傳。

---

## 其他輔助

### `GET /`
檢查 API 是否啟動。

- Response 200
  - `{ message: "TrashMatch API is running" }`

### `GET /api/stories/<int:story_id>/owner`
取得慘事作者的代號（目前回傳固定值）。

- Response 200
  - `{ nickname: "神秘衰鬼" }`
- Error
  - 404：慘事不存在
