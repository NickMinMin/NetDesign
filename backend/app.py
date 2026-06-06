from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import random
import os
import uuid
import bcrypt
import jwt
import datetime

app = Flask(__name__)
CORS(app)

DB_NAME = "loser.db"

# JWT 密鑰（正式環境應從環境變數讀取）
JWT_SECRET = os.environ.get("JWT_SECRET", "trashmatch_secret_key_change_in_prod")
JWT_EXPIRE_DAYS = 30

# 搞笑代號前綴清單
CODE_NAME_PREFIXES = [
    "垃圾桶", "廢物", "魯蛇", "衰鬼", "倒楣鬼",
    "沒救了", "躺平王", "失業中", "被貓嫌", "欠債中"
]


def generate_code_name():
    prefix = random.choice(CODE_NAME_PREFIXES)
    number = random.randint(1000, 9999)
    return f"{prefix} #{number}"


def generate_jwt(user_id, nickname, code_name):
    payload = {
        "user_id": user_id,
        "nickname": nickname,
        "code_name": code_name,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=JWT_EXPIRE_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_jwt(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None


def get_current_user():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    return verify_jwt(token)


def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def migrate_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    try:
        # stories 表補欄位
        cursor.execute("PRAGMA table_info(stories)")
        columns = [column[1] for column in cursor.fetchall()]

        if 'token' not in columns:
            print("Migration: Adding token column to stories table...")
            cursor.execute("ALTER TABLE stories ADD COLUMN token TEXT NOT NULL DEFAULT ''")
            conn.commit()

        if 'vote_count' not in columns:
            print("Migration: Adding vote_count column to stories table...")
            cursor.execute("ALTER TABLE stories ADD COLUMN vote_count INTEGER NOT NULL DEFAULT 0")
            conn.commit()

        if 'user_id' not in columns:
            print("Migration: Adding user_id column to stories table...")
            cursor.execute("ALTER TABLE stories ADD COLUMN user_id INTEGER")
            conn.commit()

        if 'category' not in columns:
            print("Migration: Adding category column to stories table...")
            cursor.execute("ALTER TABLE stories ADD COLUMN category TEXT NOT NULL DEFAULT '其他衰事'")
            conn.commit()

        # votes 表（舊版保留）
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
        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_votes_story_id
        ON votes(story_id)
        """)
        conn.commit()

        # 補 stories.token
        cursor.execute("SELECT id FROM stories WHERE token IS NULL OR token = ''")
        rows = cursor.fetchall()
        if rows:
            for row in rows:
                new_token = uuid.uuid4().hex
                cursor.execute("UPDATE stories SET token = ? WHERE id = ?", (new_token, row[0]))
            conn.commit()

        # pats 表補欄位
        cursor.execute("PRAGMA table_info(pats)")
        pat_columns = [column[1] for column in cursor.fetchall()]
        if 'user_id' not in pat_columns:
            cursor.execute("ALTER TABLE pats ADD COLUMN user_id INTEGER")
            conn.commit()
        if 'session_token' not in pat_columns:
            cursor.execute("ALTER TABLE pats ADD COLUMN session_token TEXT")
            conn.commit()

        # comments 表
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            story_id   INTEGER NOT NULL,
            user_id    INTEGER,
            session_token TEXT,
            content    TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (story_id) REFERENCES stories(id),
            FOREIGN KEY (user_id)  REFERENCES users(id)
        )
        """)
        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_comments_story_id
        ON comments(story_id)
        """)
        conn.commit()

        # ===== 方案 B：新增 vote_pairs 表 =====
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
        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_vote_pairs_created_at
        ON vote_pairs(created_at)
        """)
        conn.commit()

        # ===== 方案 B：新增 pair_votes 表 =====
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
        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_pair_votes_pair_id
        ON pair_votes(pair_id)
        """)
        conn.commit()

        print("Migration completed successfully.")

    except Exception as e:
        print(f"Migration error: {e}")
    finally:
        conn.close()


def get_story_total_pair_votes(cursor, story_id):
    cursor.execute("""
        SELECT COUNT(*) AS cnt
        FROM pair_votes
        WHERE voted_story_id = ?
    """, (story_id,))
    row = cursor.fetchone()
    return row["cnt"] if row else 0


# 啟動前自動 migration
migrate_db()


@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "TrashMatch API is running"})


# ===== 帳號系統 API =====

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    nickname = (data.get("nickname") or "").strip()
    password = (data.get("password") or "").strip()

    if not nickname:
        return jsonify({"message": "暱稱不可為空白"}), 400
    if len(nickname) > 20:
        return jsonify({"message": "暱稱最多 20 個字"}), 400
    if not password:
        return jsonify({"message": "密碼不可為空白"}), 400
    if len(password) < 4:
        return jsonify({"message": "密碼至少 4 個字元"}), 400

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    code_name = generate_code_name()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE nickname = ?", (nickname,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"message": "這個暱稱已被其他衰鬼搶走了，換一個吧"}), 409

    while True:
        cursor.execute("SELECT id FROM users WHERE code_name = ?", (code_name,))
        if not cursor.fetchone():
            break
        code_name = generate_code_name()

    cursor.execute(
        "INSERT INTO users (nickname, code_name, password_hash) VALUES (?, ?, ?)",
        (nickname, code_name, password_hash)
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()

    token = generate_jwt(user_id, nickname, code_name)

    return jsonify({
        "token": token,
        "nickname": nickname,
        "code_name": code_name,
        "message": f"歡迎加入，{code_name}！你的真實暱稱只有配對後才會揭露 👀"
    }), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    nickname = (data.get("nickname") or "").strip()
    password = (data.get("password") or "").strip()

    if not nickname or not password:
        return jsonify({"message": "暱稱和密碼都要填"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, nickname, code_name, password_hash FROM users WHERE nickname = ?",
        (nickname,)
    )
    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({"message": "找不到這個衰鬼，確認暱稱是否正確"}), 401

    if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return jsonify({"message": "密碼錯誤，你連自己的密碼都記不住嗎 😂"}), 401

    token = generate_jwt(user["id"], user["nickname"], user["code_name"])

    return jsonify({
        "token": token,
        "nickname": user["nickname"],
        "code_name": user["code_name"],
        "message": f"歡迎回來，{user['code_name']}！"
    }), 200


@app.route("/api/me", methods=["GET"])
def get_me():
    user = get_current_user()
    if not user:
        return jsonify({"message": "未登入或 token 已過期"}), 401

    return jsonify({
        "user_id": user["user_id"],
        "nickname": user["nickname"],
        "code_name": user["code_name"]
    }), 200


# ===== 慘事 API =====

@app.route("/api/stories", methods=["POST"])
def create_story():
    data = request.get_json(silent=True) or {}
    content = (data.get("content") or "").strip()
    category = (data.get("category") or "其他衰事").strip()

    VALID_CATEGORIES = ["愛情慘劇", "職場地獄", "考試爆炸", "家庭悲劇", "其他衰事"]
    if category not in VALID_CATEGORIES:
        category = "其他衰事"

    if not content:
        return jsonify({"message": "送出失敗，你的慘事暫時無人接收"}), 400

    if len(content) > 500:
        return jsonify({"message": "慘事最多 500 個字"}), 400

    story_token = uuid.uuid4().hex
    user = get_current_user()
    user_id = user["user_id"] if user else None

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO stories (content, token, user_id, category) VALUES (?, ?, ?, ?)",
        (content, story_token, user_id, category)
    )
    conn.commit()
    story_id = cursor.lastrowid
    conn.close()

    return jsonify({
        "id": story_id,
        "content": content,
        "pat_count": 0,
        "vote_count": 0,
        "category": category,
        "token": story_token
    }), 201


@app.route("/api/stories/random", methods=["GET"])
def get_random_story():
    exclude_id = request.args.get("exclude_id")
    category = request.args.get("category", "").strip()

    VALID_CATEGORIES = ["愛情慘劇", "職場地獄", "考試爆炸", "家庭悲劇", "其他衰事"]

    conn = get_db_connection()
    cursor = conn.cursor()

    conditions = []
    params = []

    if exclude_id is not None:
        try:
            conditions.append("id != ?")
            params.append(int(exclude_id))
        except (ValueError, TypeError):
            pass

    if category and category in VALID_CATEGORIES:
        conditions.append("category = ?")
        params.append(category)

    where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    cursor.execute(
        f"SELECT id, content, pat_count, category FROM stories {where_clause} ORDER BY RANDOM() LIMIT 1",
        params
    )
    story = cursor.fetchone()
    conn.close()

    if not story:
        return jsonify({"message": "目前沒有慘事，快去投稿吧！"}), 404

    return jsonify({
        "id": story["id"],
        "content": story["content"],
        "pat_count": story["pat_count"],
        "category": story["category"]
    }), 200


# ===== 方案 B：比慘 Pair API =====

@app.route("/api/stories/random-pair", methods=["GET"])
def get_random_pair():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, content
        FROM stories
        ORDER BY RANDOM()
        LIMIT 2
    """)
    stories = cursor.fetchall()

    if len(stories) < 2:
        conn.close()
        return jsonify({"message": "慘事數量不足，快去投稿吧！"}), 404

    story_a = stories[0]
    story_b = stories[1]

    cursor.execute("""
        INSERT INTO vote_pairs (story_a_id, story_b_id)
        VALUES (?, ?)
    """, (story_a["id"], story_b["id"]))
    conn.commit()
    pair_id = cursor.lastrowid

    conn.close()

    return jsonify({
        "pair_id": pair_id,
        "stories": [
            {
                "id": story_a["id"],
                "content": story_a["content"]
            },
            {
                "id": story_b["id"],
                "content": story_b["content"]
            }
        ]
    }), 200


@app.route("/api/vote-pairs/<int:pair_id>/vote", methods=["POST"])
def vote_pair(pair_id):
    user = get_current_user()
    if user is None:
        return jsonify({"message": "未登入或 token 已過期"}), 401

    data = request.get_json(silent=True) or {}
    voted_story_id = data.get("voted_story_id")

    if not voted_story_id:
        return jsonify({"message": "voted_story_id 為必填"}), 400

    try:
        voted_story_id = int(voted_story_id)
    except (ValueError, TypeError):
        return jsonify({"message": "voted_story_id 必須為整數"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, story_a_id, story_b_id
        FROM vote_pairs
        WHERE id = ?
    """, (pair_id,))
    pair = cursor.fetchone()

    if not pair:
        conn.close()
        return jsonify({"message": "對決組不存在"}), 404

    story_a_id = pair["story_a_id"]
    story_b_id = pair["story_b_id"]

    if voted_story_id not in (story_a_id, story_b_id):
        conn.close()
        return jsonify({"message": "投票目標不屬於此對決組"}), 400

    try:
        cursor.execute("""
            INSERT INTO pair_votes (pair_id, user_id, voted_story_id)
            VALUES (?, ?, ?)
        """, (pair_id, user["user_id"], voted_story_id))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"message": "你已經對這組對決投過票了"}), 409

    cursor.execute("""
        SELECT COUNT(*) AS cnt
        FROM pair_votes
        WHERE pair_id = ? AND voted_story_id = ?
    """, (pair_id, story_a_id))
    votes_a = cursor.fetchone()["cnt"]

    cursor.execute("""
        SELECT COUNT(*) AS cnt
        FROM pair_votes
        WHERE pair_id = ? AND voted_story_id = ?
    """, (pair_id, story_b_id))
    votes_b = cursor.fetchone()["cnt"]

    conn.close()

    return jsonify({
        "pair_id": pair_id,
        "story_a_id": story_a_id,
        "story_b_id": story_b_id,
        "votes_a": votes_a,
        "votes_b": votes_b
    }), 200


@app.route("/api/vote-pairs/<int:pair_id>/results", methods=["GET"])
def get_pair_results(pair_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, story_a_id, story_b_id
        FROM vote_pairs
        WHERE id = ?
    """, (pair_id,))
    pair = cursor.fetchone()

    if not pair:
        conn.close()
        return jsonify({"message": "對決組不存在"}), 404

    story_a_id = pair["story_a_id"]
    story_b_id = pair["story_b_id"]

    cursor.execute("""
        SELECT COUNT(*) AS cnt
        FROM pair_votes
        WHERE pair_id = ? AND voted_story_id = ?
    """, (pair_id, story_a_id))
    votes_a = cursor.fetchone()["cnt"]

    cursor.execute("""
        SELECT COUNT(*) AS cnt
        FROM pair_votes
        WHERE pair_id = ? AND voted_story_id = ?
    """, (pair_id, story_b_id))
    votes_b = cursor.fetchone()["cnt"]

    conn.close()

    return jsonify({
        "pair_id": pair_id,
        "story_a_id": story_a_id,
        "story_b_id": story_b_id,
        "votes_a": votes_a,
        "votes_b": votes_b
    }), 200


@app.route("/api/stories/<int:story_id>/pat", methods=["PUT"])
def pat_story(story_id):
    user = get_current_user()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, pat_count FROM stories WHERE id = ?",
        (story_id,)
    )
    story = cursor.fetchone()

    if not story:
        conn.close()
        return jsonify({"message": "拍拍失敗，請稍後再試"}), 404

    if user:
        cursor.execute(
            "SELECT id FROM pats WHERE story_id = ? AND user_id = ?",
            (story_id, user["user_id"])
        )
        if cursor.fetchone():
            conn.close()
            return jsonify({"message": "你已經拍過這則慘事了"}), 409
        cursor.execute(
            "INSERT INTO pats (story_id, user_id) VALUES (?, ?)",
            (story_id, user["user_id"])
        )
    else:
        data = request.get_json(silent=True) or {}
        session_token = (data.get("session_token") or "").strip()
        if session_token:
            cursor.execute(
                "SELECT id FROM pats WHERE story_id = ? AND session_token = ?",
                (story_id, session_token)
            )
            if cursor.fetchone():
                conn.close()
                return jsonify({"message": "你已經拍過這則慘事了"}), 409
            cursor.execute(
                "INSERT INTO pats (story_id, session_token) VALUES (?, ?)",
                (story_id, session_token)
            )
        else:
            conn.close()
            return jsonify({"message": "未登入請提供 session_token 才能拍拍"}), 400

    cursor.execute(
        "UPDATE stories SET pat_count = pat_count + 1 WHERE id = ?",
        (story_id,)
    )
    conn.commit()

    cursor.execute(
        "SELECT pat_count FROM stories WHERE id = ?",
        (story_id,)
    )
    updated_story = cursor.fetchone()
    pat_count = updated_story["pat_count"]

    chat_room_id = None
    match_unlocked = False

    if pat_count >= 1:
        match_unlocked = True

        cursor.execute(
            "SELECT id FROM chat_rooms WHERE story_id = ?",
            (story_id,)
        )
        existing_chat_room = cursor.fetchone()

        if existing_chat_room:
            chat_room_id = existing_chat_room["id"]
        else:
            cursor.execute(
                "INSERT INTO chat_rooms (story_id) VALUES (?)",
                (story_id,)
            )
            conn.commit()
            chat_room_id = cursor.lastrowid

    conn.close()

    response = {
        "pat_count": pat_count,
        "match_unlocked": match_unlocked
    }

    if chat_room_id is not None:
        response["chat_room_id"] = chat_room_id

    return jsonify(response), 200


# ===== 聊天室 API =====

@app.route("/api/chat-rooms", methods=["POST"])
def create_chat_room():
    data = request.get_json(silent=True) or {}
    story_id = data.get("story_id")

    if not story_id:
        return jsonify({"message": "story_id 參數為必填"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, pat_count FROM stories WHERE id = ?",
        (story_id,)
    )
    story = cursor.fetchone()

    if not story:
        conn.close()
        return jsonify({"message": "慘事不存在"}), 404

    if story["pat_count"] < 1:
        conn.close()
        return jsonify({"message": "拍拍數不足，無法解鎖聊天室"}), 400

    cursor.execute(
        "SELECT id, created_at FROM chat_rooms WHERE story_id = ?",
        (story_id,)
    )
    existing_chat_room = cursor.fetchone()

    if existing_chat_room:
        conn.close()
        return jsonify({
            "chat_room_id": existing_chat_room["id"],
            "created_at": existing_chat_room["created_at"]
        }), 200

    cursor.execute(
        "INSERT INTO chat_rooms (story_id) VALUES (?)",
        (story_id,)
    )
    conn.commit()
    chat_room_id = cursor.lastrowid

    cursor.execute(
        "SELECT created_at FROM chat_rooms WHERE id = ?",
        (chat_room_id,)
    )
    chat_room = cursor.fetchone()
    conn.close()

    return jsonify({
        "chat_room_id": chat_room_id,
        "created_at": chat_room["created_at"]
    }), 201


@app.route("/api/chat-rooms/<int:chat_room_id>/messages", methods=["GET"])
def get_messages(chat_room_id):
    since = request.args.get("since")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id FROM chat_rooms WHERE id = ?",
        (chat_room_id,)
    )
    chat_room = cursor.fetchone()

    if not chat_room:
        conn.close()
        return jsonify({"message": "聊天室不存在"}), 404

    if since:
        try:
            datetime.datetime.fromisoformat(since)
        except ValueError:
            conn.close()
            return jsonify({"message": "since 參數格式錯誤，需為 ISO 8601 時間戳"}), 400

        cursor.execute(
            "SELECT id, sender_story_id, content, created_at FROM messages WHERE chat_room_id = ? AND created_at > ? ORDER BY created_at ASC",
            (chat_room_id, since)
        )
    else:
        cursor.execute(
            "SELECT id, sender_story_id, content, created_at FROM messages WHERE chat_room_id = ? ORDER BY created_at ASC",
            (chat_room_id,)
        )

    messages = cursor.fetchall()
    conn.close()

    messages_list = [
        {
            "id": msg["id"],
            "sender_story_id": msg["sender_story_id"],
            "content": msg["content"],
            "created_at": msg["created_at"]
        }
        for msg in messages
    ]

    return jsonify({"messages": messages_list}), 200


@app.route("/api/chat-rooms/<int:chat_room_id>/messages", methods=["POST"])
def send_message(chat_room_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"message": "未授權的操作"}), 401

    provided_token = auth_header.split(' ')[1]

    data = request.get_json(silent=True) or {}
    sender_story_id = data.get("sender_story_id")
    content = (data.get("content") or "").strip()

    if not content:
        return jsonify({"message": "訊息不可為空白"}), 400

    if len(content) > 500:
        return jsonify({"message": "訊息長度超過限制（最多 500 字）"}), 400

    if not sender_story_id:
        return jsonify({"message": "sender_story_id 參數為必填"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, story_id FROM chat_rooms WHERE id = ?",
        (chat_room_id,)
    )
    chat_room = cursor.fetchone()

    if not chat_room:
        conn.close()
        return jsonify({"message": "聊天室不存在"}), 404

    jwt_payload = verify_jwt(provided_token)
    if jwt_payload:
        uid = jwt_payload["user_id"]
        room_story_id = chat_room["story_id"]

        cursor.execute(
            "SELECT id FROM stories WHERE id = ? AND user_id = ?",
            (room_story_id, uid)
        )
        is_author = cursor.fetchone() is not None

        cursor.execute(
            "SELECT id FROM pats WHERE story_id = ? AND user_id = ?",
            (room_story_id, uid)
        )
        is_patter = cursor.fetchone() is not None

        if not is_author and not is_patter:
            conn.close()
            return jsonify({"message": "發送者身分驗證失敗，你與此聊天室無關"}), 403

        cursor.execute("SELECT id FROM stories WHERE id = ?", (sender_story_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"message": "sender_story_id 不存在"}), 404
    else:
        cursor.execute(
            "SELECT id FROM stories WHERE id = ? AND token = ?",
            (sender_story_id, provided_token)
        )
        sender_story = cursor.fetchone()

        if not sender_story:
            conn.close()
            return jsonify({"message": "發送者身分驗證失敗，無法發送訊息"}), 403

    try:
        cursor.execute(
            "INSERT INTO messages (chat_room_id, sender_story_id, content) VALUES (?, ?, ?)",
            (chat_room_id, sender_story_id, content)
        )
        conn.commit()
        message_id = cursor.lastrowid

        cursor.execute(
            "SELECT id, sender_story_id, content, created_at FROM messages WHERE id = ?",
            (message_id,)
        )
        message = cursor.fetchone()
        conn.close()

        return jsonify({
            "id": message["id"],
            "sender_story_id": message["sender_story_id"],
            "content": message["content"],
            "created_at": message["created_at"]
        }), 201

    except Exception:
        conn.close()
        return jsonify({"message": "訊息送出失敗，請稍後再試"}), 500


# ===== 匿名 session API =====

@app.route("/api/session", methods=["GET"])
def get_session():
    session_token = request.args.get("token")

    conn = get_db_connection()
    cursor = conn.cursor()

    if session_token:
        cursor.execute(
            "SELECT token, nickname FROM sessions WHERE token = ?",
            (session_token,)
        )
        session = cursor.fetchone()
        if session:
            conn.close()
            return jsonify({
                "session_token": session["token"],
                "nickname": session["nickname"]
            }), 200

    new_token = uuid.uuid4().hex
    nickname = generate_code_name()

    cursor.execute(
        "INSERT INTO sessions (token, nickname) VALUES (?, ?)",
        (new_token, nickname)
    )
    conn.commit()
    conn.close()

    return jsonify({
        "session_token": new_token,
        "nickname": nickname
    }), 201


@app.route("/api/stories/<int:story_id>/owner", methods=["GET"])
def get_story_owner(story_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT s.id, u.code_name
        FROM stories s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
    """, (story_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({"message": "慘事不存在"}), 404

    nickname = row["code_name"] if row["code_name"] else "神秘衰鬼"
    return jsonify({"nickname": nickname}), 200


# ===== 排行榜 API（改成統計 pair_votes + pat_count） =====

@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT s.id, s.content, s.pat_count
        FROM stories s
    """)
    stories = cursor.fetchall()

    result = []
    for s in stories:
        story_vote_count = get_story_total_pair_votes(cursor, s["id"])
        score = story_vote_count + s["pat_count"]
        result.append({
            "id": s["id"],
            "content": s["content"],
            "vote_count": story_vote_count,
            "pat_count": s["pat_count"],
            "score": score
        })

    result.sort(key=lambda x: x["score"], reverse=True)

    conn.close()

    return jsonify({
        "stories": result[:10]
    }), 200


# ===== 留言系統 API =====

@app.route("/api/stories/<int:story_id>/comments", methods=["GET"])
def get_comments(story_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM stories WHERE id = ?", (story_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"message": "慘事不存在"}), 404

    cursor.execute("""
        SELECT c.id, c.content, c.created_at,
               COALESCE(u.code_name, '匿名衰鬼') AS author_name
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.story_id = ?
        ORDER BY c.created_at ASC
        LIMIT 50
    """, (story_id,))
    rows = cursor.fetchall()
    conn.close()

    return jsonify({
        "comments": [
            {
                "id": r["id"],
                "content": r["content"],
                "author_name": r["author_name"],
                "created_at": r["created_at"]
            }
            for r in rows
        ]
    }), 200


@app.route("/api/stories/<int:story_id>/comments", methods=["POST"])
def add_comment(story_id):
    data = request.get_json(silent=True) or {}
    content = (data.get("content") or "").strip()

    if not content:
        return jsonify({"message": "留言不可為空白"}), 400
    if len(content) > 200:
        return jsonify({"message": "留言最多 200 字"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM stories WHERE id = ?", (story_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"message": "慘事不存在"}), 404

    user = get_current_user()
    if user:
        cursor.execute(
            "INSERT INTO comments (story_id, user_id, content) VALUES (?, ?, ?)",
            (story_id, user["user_id"], content)
        )
        author_name = user.get("code_name", "匿名衰鬼")
    else:
        session_token = (data.get("session_token") or "").strip()
        cursor.execute(
            "INSERT INTO comments (story_id, session_token, content) VALUES (?, ?, ?)",
            (story_id, session_token or None, content)
        )
        author_name = "匿名衰鬼"

    conn.commit()
    comment_id = cursor.lastrowid

    cursor.execute("SELECT created_at FROM comments WHERE id = ?", (comment_id,))
    row = cursor.fetchone()
    conn.close()

    return jsonify({
        "id": comment_id,
        "content": content,
        "author_name": author_name,
        "created_at": row["created_at"]
    }), 201


# ===== 我的頁面 API =====

@app.route("/api/me/stories", methods=["GET"])
def get_my_stories():
    user = get_current_user()
    if not user:
        return jsonify({"message": "未登入或 token 已過期"}), 401

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            s.id, s.content, s.pat_count, s.category, s.created_at,
            (SELECT COUNT(*) FROM comments c WHERE c.story_id = s.id) AS comment_count,
            cr.id AS chat_room_id
        FROM stories s
        LEFT JOIN chat_rooms cr ON cr.story_id = s.id
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC
    """, (user["user_id"],))
    rows = cursor.fetchall()

    stories = []
    for r in rows:
        pair_vote_count = get_story_total_pair_votes(cursor, r["id"])
        stories.append({
            "id": r["id"],
            "content": r["content"],
            "pat_count": r["pat_count"],
            "vote_count": pair_vote_count,
            "category": r["category"],
            "comment_count": r["comment_count"],
            "chat_room_id": r["chat_room_id"],
            "created_at": r["created_at"]
        })

    conn.close()

    return jsonify({"stories": stories}), 200


@app.route("/api/me/stats", methods=["GET"])
def get_my_stats():
    user = get_current_user()
    if not user:
        return jsonify({"message": "未登入或 token 已過期"}), 401

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, pat_count
        FROM stories
        WHERE user_id = ?
    """, (user["user_id"],))
    my_stories = cursor.fetchall()

    story_count = len(my_stories)
    total_pats = sum(row["pat_count"] for row in my_stories)
    total_votes = 0

    for row in my_stories:
        total_votes += get_story_total_pair_votes(cursor, row["id"])

    cursor.execute("""
        SELECT COUNT(*) AS chat_room_count
        FROM chat_rooms cr
        JOIN stories s ON cr.story_id = s.id
        WHERE s.user_id = ?
    """, (user["user_id"],))
    chat_stats = cursor.fetchone()

    conn.close()

    return jsonify({
        "story_count": story_count,
        "total_pats": total_pats,
        "total_votes": total_votes,
        "chat_room_count": chat_stats["chat_room_count"]
    }), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
