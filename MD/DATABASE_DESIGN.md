# 資料庫設計文件

## 概覽

本系統後端使用 **SQLite** 儲存資料，資料庫檔案名稱為 `loser.db`。  
整體設計遵循 **第三正規化（3NF）** 原則，確保資料一致性並避免冗餘。  
主要資料表共 10 張：`users`、`sessions`、`stories`、`pats`、`votes`、`vote_pairs`、`pair_votes`、`chat_rooms`、`messages`、`comments`。

---

## ER 關係圖（Entity-Relationship）

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

## 資料表設計

### 1. `users`

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

**設計說明：**
- `nickname` 作為登入識別，具有唯一性約束
- `code_name` 是對其他使用者顯示的身份，不直接揭露 `nickname`，實現身份隔離
- `password_hash` 採用 bcrypt 加鹽雜湊，不儲存明文密碼

---

### 2. `sessions`

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

**設計說明：**
- `token` 使用 `uuid4().hex` 產生，確保全域唯一性
- 匿名訪客透過此 token 在跨頁操作中保持同一身份
- 本表與 `users` 無外鍵關聯，代表兩種獨立的身份系統

---

### 3. `stories`

儲存使用者投稿的慘事內容，是整個系統的核心實體。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 慘事唯一識別碼 |
| `content` | TEXT | NOT NULL | 慘事文字內容（最多 500 字） |
| `pat_count` | INTEGER | NOT NULL DEFAULT 0 | 累計拍拍次數（反正規化快取欄位） |
| `vote_count` | INTEGER | NOT NULL DEFAULT 0 | 舊版累計票數（保留相容性） |
| `token` | TEXT | NOT NULL DEFAULT '' | 投稿者專屬匿名 token，用於聊天室身份驗證 |
| `user_id` | INTEGER | FOREIGN KEY → users(id) | 投稿者的使用者 ID（可為 NULL 表示匿名） |
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

**合法 category 值：**
- `愛情慘劇`
- `職場地獄`
- `考試爆炸`
- `家庭悲劇`
- `其他衰事`

**設計說明：**
- `token` 在新增慘事時由 `uuid4().hex` 自動產生，作為匿名聊天室訊息的發送憑證
- `pat_count` 為反正規化設計，直接存在 `stories` 表中以加速排行榜查詢，避免每次都聚合 `pats` 表
- `vote_count` 保留為舊版相容欄位，現行排行榜以 `pair_votes` 聚合取代

---

### 4. `pats`

記錄每一筆拍拍行為，支援登入使用者與匿名訪客，並防止重複拍拍。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 記錄唯一識別碼 |
| `story_id` | INTEGER | NOT NULL, FK → stories(id) | 被拍拍的慘事 |
| `user_id` | INTEGER | FK → users(id) | 登入使用者的 ID（與 session_token 二擇一） |
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

**設計說明：**
- `user_id` 與 `session_token` 互斥：登入使用者填 `user_id`，匿名訪客填 `session_token`
- 防止重複拍拍的邏輯在應用層實作（查詢相同 story_id + user_id 或 session_token 是否存在）
- 每次成功拍拍同時更新 `stories.pat_count + 1`

---

### 5. `votes`（舊版，保留相容）

舊版投票機制，記錄登入使用者對慘事的投票行為。

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

**設計說明：**
- `UNIQUE (user_id, story_id)` 防止同一使用者重複投票
- 此表為舊版功能保留，現行對決投票改用 `vote_pairs` + `pair_votes`

---

### 6. `vote_pairs`

比慘對決配對表，記錄每一組「兩則慘事對決」的配對。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 對決組唯一識別碼 |
| `story_a_id` | INTEGER | NOT NULL, FK → stories(id) | 對決的第一則慘事 |
| `story_b_id` | INTEGER | NOT NULL, FK → stories(id) | 對決的第二則慘事 |
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

**設計說明：**
- 每次呼叫 `GET /api/stories/random-pair` 都會產生一筆新的配對記錄
- `story_a_id` 與 `story_b_id` 皆指向 `stories`，是同一表的兩個外鍵（自我參照關係）
- `is_active` 預留給未來的對決結束/封存機制

---

### 7. `pair_votes`

比慘對決投票表，記錄每位使用者對某組對決的投票結果。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 記錄唯一識別碼 |
| `pair_id` | INTEGER | NOT NULL, FK → vote_pairs(id) | 所屬對決組 |
| `user_id` | INTEGER | NOT NULL, FK → users(id) | 投票的使用者（僅限登入使用者） |
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

**設計說明：**
- `UNIQUE (pair_id, user_id)` 確保每位使用者對同一組對決只能投一票
- `voted_story_id` 必須是該 `pair_id` 的 `story_a_id` 或 `story_b_id`，由應用層驗證
- 對決投票僅限已登入使用者，匿名訪客無法參與

---

### 8. `chat_rooms`

儲存已解鎖的聊天室，每則慘事最多對應一間聊天室。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 聊天室唯一識別碼 |
| `story_id` | INTEGER | NOT NULL UNIQUE, FK → stories(id) | 對應的慘事（1:1 關聯） |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 聊天室建立時間 |

```sql
CREATE TABLE chat_rooms (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id   INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id)
);
```

**設計說明：**
- `story_id` 的 `UNIQUE` 約束確保一則慘事最多建立一間聊天室
- 解鎖條件由應用層控制：`stories.pat_count >= 1` 才允許建立

---

### 9. `messages`

聊天室訊息記錄。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 訊息唯一識別碼 |
| `chat_room_id` | INTEGER | NOT NULL, FK → chat_rooms(id) | 所屬聊天室 |
| `sender_story_id` | INTEGER | NOT NULL, FK → stories(id) | 發送者所對應的慘事 ID |
| `content` | TEXT | NOT NULL | 訊息文字內容（最多 500 字） |
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

**設計說明：**
- 發送者身份以 `sender_story_id` 表示，而非直接綁定 `user_id`，支援匿名與登入兩種身份
- 發訊驗證邏輯：提供 `stories.token` 作為憑證，或 JWT 驗證為慘事作者 / 拍拍者
- 訊息長度上限 500 字，由應用層驗證

---

### 10. `comments`

公開留言系統，任何人都可以對慘事留言。

| 欄位 | 類型 | 限制 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 留言唯一識別碼 |
| `story_id` | INTEGER | NOT NULL, FK → stories(id) | 被留言的慘事 |
| `user_id` | INTEGER | FK → users(id) | 留言的使用者（可為 NULL 表示匿名） |
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

**設計說明：**
- 與 `pats` 相同的雙身份設計：`user_id`（登入）或 `session_token`（匿名）二擇一
- 留言為公開內容，不需驗證才能讀取，但每則限 200 字

---

## 索引設計

| 索引名稱 | 所在表格 | 索引欄位 | 目的 |
|----------|----------|----------|------|
| `idx_messages_chat_room_created` | `messages` | `(chat_room_id, created_at)` | 加速聊天室訊息的時序查詢 |
| `idx_sessions_token` | `sessions` | `(token)` | 加速匿名 session 查找 |
| `idx_users_nickname` | `users` | `(nickname)` | 加速登入時的使用者查找 |
| `idx_votes_story_id` | `votes` | `(story_id)` | 加速舊版票數統計 |
| `idx_comments_story_id` | `comments` | `(story_id)` | 加速留言列表查詢 |
| `idx_vote_pairs_created_at` | `vote_pairs` | `(created_at)` | 加速按時間排序的對決查詢 |
| `idx_pair_votes_pair_id` | `pair_votes` | `(pair_id)` | 加速對決票數統計 |

---

## 資料庫正規化分析

### 第一正規化（1NF）

所有資料表均符合 1NF：

- 每個欄位都是不可分割的原子值（無重複欄位群、無多值欄位）
- 每個資料表都有明確的主鍵（Primary Key）
- 同一欄位不儲存多個值（例如：分類使用單一 `category` 欄位，而非 `category1`, `category2`）

### 第二正規化（2NF）

所有資料表均符合 2NF：

- 所有非主鍵欄位完全依賴於主鍵（無部分函數相依）
- 本系統均使用單欄位整數代理主鍵（`id` AUTOINCREMENT），因此不存在複合主鍵造成的部分相依問題
- 例外說明：`pair_votes` 有 `UNIQUE (pair_id, user_id)` 的複合唯一約束，但主鍵仍為單欄 `id`，所有欄位完全依賴 `id`

### 第三正規化（3NF）

多數設計符合 3NF，以下逐一說明：

**符合 3NF 的設計：**

| 資料表 | 說明 |
|--------|------|
| `users` | `code_name` 由系統隨機產生後儲存，與 `nickname` 無函數相依關係 |
| `sessions` | `nickname` 是獨立產生的匿名代號，無傳遞相依 |
| `chat_rooms` | `story_id` 直接決定聊天室，無間接相依 |
| `vote_pairs` | `story_a_id`, `story_b_id` 僅依賴主鍵 `id` |
| `pair_votes` | 所有欄位完全依賴 `id`，`voted_story_id` 是獨立的事實 |
| `messages` | `content`, `created_at` 僅依賴訊息 `id` |
| `comments` | 所有欄位完全依賴留言 `id` |
| `pats` | 所有欄位完全依賴 `id` |

**已知的反正規化（Denormalization）設計：**

| 欄位 | 所在表格 | 說明 |
|------|----------|------|
| `stories.pat_count` | `stories` | 此欄位可由 `SELECT COUNT(*) FROM pats WHERE story_id = ?` 即時計算，但為加速排行榜排序，選擇直接維護快取欄位 |
| `stories.vote_count` | `stories` | 舊版保留欄位，現行系統排行榜改用 `pair_votes` 聚合，此欄已不再主動更新 |

**反正規化的取捨：**
- `pat_count` 的反正規化設計犧牲了少量寫入一致性保證（需同時更新兩處），換取排行榜讀取效能
- 若未來改為讀取量較低的場景，可移除 `pat_count` 改用 `JOIN` 聚合查詢

### BCNF（Boyce-Codd Normal Form）

- `votes` 表：`UNIQUE (user_id, story_id)` 形成候選鍵，符合 BCNF
- `pair_votes` 表：`UNIQUE (pair_id, user_id)` 形成候選鍵，符合 BCNF
- `chat_rooms` 表：`story_id UNIQUE` 形成候選鍵，符合 BCNF
- 其餘資料表主鍵為唯一決定因素，均符合 BCNF

---

## 重要設計決策總結

| 決策 | 說明 |
|------|------|
| 雙身份系統 | `users` 表（已登入）與 `sessions` 表（匿名訪客）並行，透過 `user_id` vs `session_token` 欄位二擇一使用 |
| 身份隱藏 | `users.code_name` 是公開顯示的搞笑代號，`nickname` 只在登入成功後透過 JWT 揭露，保護使用者真實身份 |
| JWT 認證 | 使用 JWT（有效期 30 天）作為登入狀態憑證，不需要伺服器端 session |
| 匿名投稿 token | `stories.token` 作為投稿者的輕量級身份憑證，讓匿名使用者也能在聊天室中驗證身份 |
| 聊天室 1:1 限制 | `chat_rooms.story_id UNIQUE` 確保業務邏輯的完整性：每則慘事最多一間聊天室 |
| 對決模式分離 | 新版對決投票使用獨立的 `vote_pairs` + `pair_votes` 表，與舊版 `votes` 表解耦 |
| 反正規化快取 | `stories.pat_count` 保留快取欄位以優化高頻讀取的排行榜查詢 |
