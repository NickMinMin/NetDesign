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
        vote_count INTEGER NOT NULL DEFAULT 0,
        token TEXT NOT NULL DEFAULT '',
        user_id INTEGER,
        category TEXT NOT NULL DEFAULT '其他衰事',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # 拍拍紀錄資料表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL,
        user_id INTEGER,
        session_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_id) REFERENCES stories(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
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
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT NOT NULL UNIQUE,
        code_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 匿名 session 資料表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        nickname TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 舊投票表先保留，不刪，避免舊功能炸掉
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

    # 公開留言資料表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL,
        user_id INTEGER,
        session_token TEXT,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_id) REFERENCES stories(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # ===== 新增：對決配對表 =====
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vote_pairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_a_id INTEGER NOT NULL,
        story_b_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (story_a_id) REFERENCES stories(id),
        FOREIGN KEY (story_b_id) REFERENCES stories(id)
    )
    """)

    # ===== 新增：對決投票表 =====
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pair_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pair_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        voted_story_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pair_id) REFERENCES vote_pairs(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (voted_story_id) REFERENCES stories(id),
        UNIQUE (pair_id, user_id)
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

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_comments_story_id
    ON comments(story_id)
    """)

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_vote_pairs_created_at
    ON vote_pairs(created_at)
    """)

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_pair_votes_pair_id
    ON pair_votes(pair_id)
    """)

    conn.commit()
    conn.close()
    print("Database initialized successfully.")

if __name__ == "__main__":
    init_db()
