# 資料庫設計文件

## 概覽
本系統後端使用 SQLite 儲存資料，主要資料表包含：`stories`、`pats`、`chat_rooms`、`messages`、`users`、`sessions`、`votes`。

## 資料表設計

### `stories`
儲存使用者投稿的慘事內容，以及該慘事的拍拍數、匿名 token、關聯使用者等。

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `content` TEXT NOT NULL
- `pat_count` INTEGER NOT NULL DEFAULT 0
- `token` TEXT NOT NULL DEFAULT ''
- `user_id` INTEGER
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

#### 說明
- `content`：慘事文字內容。
- `pat_count`：記錄此則慘事收到的拍拍數。
- `token`：對應於發文者的專屬匿名 token，用於聊天室訊息驗證。
- `user_id`：如果投稿者為註冊使用者，則可儲存其 `users.id`。
- `created_at`：建立時間。

### `pats`
儲存每一次拍拍操作的紀錄，用於分析或未來擴充。

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `story_id` INTEGER NOT NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

#### 外鍵
- `story_id` FOREIGN KEY REFERENCES `stories(id)`

### `chat_rooms`
儲存已解鎖聊天室的資料，與特定慘事一對一關聯。

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `story_id` INTEGER NOT NULL UNIQUE
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

#### 說明
- `story_id` 為該聊天室所對應的慘事。每則慘事只會建立一間聊天室。
- `UNIQUE` 限制防止同一則慘事重複建立多個聊天室。

### `messages`
聊天室內訊息紀錄。

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `chat_room_id` INTEGER NOT NULL
- `sender_story_id` INTEGER NOT NULL
- `content` TEXT NOT NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

#### 外鍵
- `chat_room_id` FOREIGN KEY REFERENCES `chat_rooms(id)`
- `sender_story_id` FOREIGN KEY REFERENCES `stories(id)`

### `users`
儲存註冊使用者帳號資訊。

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `nickname` TEXT NOT NULL UNIQUE
- `code_name` TEXT NOT NULL
- `password_hash` TEXT NOT NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

#### 說明
- `nickname`：使用者輸入的帳號名稱，系統要求唯一。
- `code_name`：系統生成的搞笑代號，例如「垃圾桶 #4521」。
- `password_hash`：bcrypt 加密後的密碼。

### `sessions`
匿名訪客會話資料，支援未登入使用者的暱稱機制。

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `token` TEXT NOT NULL UNIQUE
- `nickname` TEXT NOT NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

#### 說明
- `token`：用於辨識訪客 session。
- `nickname`：系統生成的匿名暱稱。

### `votes`
記錄註冊使用者對慘事的投票行為，防止重複投票。

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `user_id` INTEGER NOT NULL
- `story_id` INTEGER NOT NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

#### 外鍵
- `user_id` FOREIGN KEY REFERENCES `users(id)`
- `story_id` FOREIGN KEY REFERENCES `stories(id)`

#### UNIQUE 約束
- `UNIQUE (user_id, story_id)`：同一使用者只能對同一則慘事投一次票。

## 索引
為提高讀取效能，目前建立的索引如下：

- `idx_messages_chat_room_created` on `messages(chat_room_id, created_at)`
- `idx_sessions_token` on `sessions(token)`
- `idx_users_nickname` on `users(nickname)`
- `idx_votes_story_id` on `votes(story_id)`

## 重要設計決策
- `stories.token` 與聊天室訊息驗證綁定，用來確認訊息發送者身份，而不是使用傳統帳戶密碼。
- `chat_rooms.story_id` 為唯一鍵，確保每則已解鎖的慘事只對應一間聊天室。
- `votes` 表與 `stories.vote_count` 共同存在，`vote_count` 為複製欄位，以便快速排序排行榜。
- `sessions` 表提供匿名訪客機制，避免未登入使用者每次都重新生成身份。
