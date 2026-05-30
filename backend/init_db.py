import sqlite3

DB_NAME = "loser.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # 慘事資料表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS stories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        pat_count INTEGER NOT NULL DEFAULT 0,
        token TEXT NOT NULL DEFAULT '',
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # 拍拍紀錄資料表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_id) REFERENCES stories(id)
    )
    """)

    # 聊天室資料表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_id) REFERENCES stories(id)
    )
    """)

    # 訊息資料表
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

    # 使用者帳號資料表
    # nickname: 真實暱稱（拍拍解鎖後才顯示）
    # code_name: 隨機搞笑代號（垃圾桶 #XXXX，平時顯示）
    # password_hash: bcrypt 加密後的密碼
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT NOT NULL UNIQUE,
        code_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 匿名 session 資料表（未登入用戶）
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        nickname TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 投票紀錄資料表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS votes (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL,
        story_id   INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id)  REFERENCES users(id),
        FOREIGN KEY (story_id) REFERENCES stories(id),
        UNIQUE (user_id, story_id)
    )
    """)

    # 索引
    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_messages_chat_room_created
    ON messages(chat_room_id, created_at)
    """)

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_sessions_token
    ON sessions(token)
    """)

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_users_nickname
    ON users(nickname)
    """)

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_votes_story_id
    ON votes(story_id)
    """)

    conn.commit()
    conn.close()
    print("Database initialized successfully.")

if __name__ == "__main__":
    init_db()
