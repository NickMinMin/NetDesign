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
    """產生隨機搞笑代號，例如「垃圾桶 #4521」"""
    prefix = random.choice(CODE_NAME_PREFIXES)
    number = random.randint(1000, 9999)
    return f"{prefix} #{number}"

def generate_jwt(user_id, nickname, code_name):
    """產生 JWT token"""
    payload = {
        "user_id": user_id,
        "nickname": nickname,
        "code_name": code_name,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=JWT_EXPIRE_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_jwt(token):
    """驗證 JWT token，回傳 payload 或 None"""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None

def get_current_user():
    """從 Authorization header 取得目前登入的使用者資訊"""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    return verify_jwt(token)

DB_NAME = "loser.db"

# --- [新增] 自動遷移資料庫函數 ---
def migrate_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    try:
        # 檢查 stories 表是否有 token 欄位
        cursor.execute("PRAGMA table_info(stories)")
        columns = [column[1] for column in cursor.fetchall()]
        if 'token' not in columns:
            print("Migration: Adding token column to stories table...")
            cursor.execute("ALTER TABLE stories ADD COLUMN token TEXT NOT NULL DEFAULT ''")
            conn.commit()
            print("Migration: token column added successfully.")

        # 遷移 1：為 stories 表新增 vote_count 欄位（若已存在則跳過）
        cursor.execute("PRAGMA table_info(stories)")
        columns = [column[1] for column in cursor.fetchall()]
        if 'vote_count' not in columns:
            print("Migration: Adding vote_count column to stories table...")
            cursor.execute("ALTER TABLE stories ADD COLUMN vote_count INTEGER NOT NULL DEFAULT 0")
            conn.commit()
            print("Migration: vote_count column added successfully.")

        # 遷移 1b：為 stories 表新增 user_id 欄位（若已存在則跳過）
        cursor.execute("PRAGMA table_info(stories)")
        columns = [column[1] for column in cursor.fetchall()]
        if 'user_id' not in columns:
            print("Migration: Adding user_id column to stories table...")
            cursor.execute("ALTER TABLE stories ADD COLUMN user_id INTEGER")
            conn.commit()
            print("Migration: user_id column added successfully.")

        # 遷移 2：建立 votes 表（若已存在則跳過）
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
        print("Migration: votes table and idx_votes_story_id ensured.")

        # 遷移補充：為已存在但 token 為空的 stories 產生唯一 token
        cursor.execute("SELECT id FROM stories WHERE token IS NULL OR token = ''")
        rows = cursor.fetchall()
        if rows:
            print(f"Migration: Generating tokens for {len(rows)} existing stories...")
            for row in rows:
                new_token = uuid.uuid4().hex
                cursor.execute("UPDATE stories SET token = ? WHERE id = ?", (new_token, row[0]))
            conn.commit()
            print("Migration: tokens generated for existing stories.")

    except Exception as e:
        print(f"Migration error: {e}")
    finally:
        conn.close()

# 在啟動前執行遷移
migrate_db()
# --------------------------------

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "TrashMatch API is running"})


# ===== 帳號系統 API =====

@app.route("/api/register", methods=["POST"])
def register():
    """
    註冊新帳號
    body: { nickname, password }
    回傳: { token, nickname, code_name }
    """
    data = request.get_json(silent=True) or {}
    nickname = (data.get("nickname") or "").strip()
    password = (data.get("password") or "").strip()

    # 驗證輸入
    if not nickname:
        return jsonify({"message": "暱稱不可為空白"}), 400
    if len(nickname) > 20:
        return jsonify({"message": "暱稱最多 20 個字"}), 400
    if not password:
        return jsonify({"message": "密碼不可為空白"}), 400
    if len(password) < 4:
        return jsonify({"message": "密碼至少 4 個字元"}), 400

    # 加密密碼
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    # 產生搞笑代號
    code_name = generate_code_name()

    conn = get_db_connection()
    cursor = conn.cursor()

    # 檢查暱稱是否已存在
    cursor.execute("SELECT id FROM users WHERE nickname = ?", (nickname,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"message": "這個暱稱已被其他衰鬼搶走了，換一個吧"}), 409

    # 確保代號唯一
    while True:
        cursor.execute("SELECT id FROM users WHERE code_name = ?", (code_name,))
        if not cursor.fetchone():
            break
        code_name = generate_code_name()

    # 建立使用者
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
    """
    登入
    body: { nickname, password }
    回傳: { token, nickname, code_name }
    """
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

    # 驗證密碼
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
    """
    取得目前登入使用者的資訊（用 token 驗證）
    """
    user = get_current_user()
    if not user:
        return jsonify({"message": "未登入或 token 已過期"}), 401

    return jsonify({
        "user_id": user["user_id"],
        "nickname": user["nickname"],
        "code_name": user["code_name"]
    }), 200


@app.route("/api/stories", methods=["POST"])
def create_story():
    data = request.get_json(silent=True) or {}
    content = (data.get("content") or "").strip()

    if not content:
        return jsonify({
            "message": "送出失敗，你的慘事暫時無人接收"
        }), 400

    # 產生一組隨機的 UUID 作為發文者的專屬 Token 金鑰
    story_token = uuid.uuid4().hex
    user = get_current_user()
    user_id = user["user_id"] if user else None

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO stories (content, token, user_id) VALUES (?, ?, ?)",
        (content, story_token, user_id)
    )
    conn.commit()
    story_id = cursor.lastrowid
    conn.close()

    return jsonify({
        "id": story_id,
        "content": content,
        "pat_count": 0,
        "token": story_token
    }), 201


@app.route("/api/stories/random", methods=["GET"])
def get_random_story():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, content, pat_count FROM stories")
    stories = cursor.fetchall()
    conn.close()

    if not stories:
        return jsonify({
            "message": "目前沒有慘事，快去投稿吧！"
        }), 404

    story = random.choice(stories)

    return jsonify({
        "id": story["id"],
        "content": story["content"],
        "pat_count": story["pat_count"]
    }), 200


@app.route("/api/stories/random-pair", methods=["GET"])
def get_random_pair():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, content, vote_count FROM stories")
    stories = cursor.fetchall()
    conn.close()

    if len(stories) < 2:
        return jsonify({
            "message": "慘事數量不足，快去投稿吧！"
        }), 404

    pair = random.sample(list(stories), 2)

    return jsonify({
        "stories": [
            {"id": pair[0]["id"], "content": pair[0]["content"], "vote_count": pair[0]["vote_count"]},
            {"id": pair[1]["id"], "content": pair[1]["content"], "vote_count": pair[1]["vote_count"]}
        ]
    }), 200


@app.route("/api/stories/<int:story_id>/pat", methods=["PUT"])
def pat_story(story_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, pat_count FROM stories WHERE id = ?",
        (story_id,)
    )
    story = cursor.fetchone()

    if not story:
        conn.close()
        return jsonify({
            "message": "拍拍失敗，請稍後再試"
        }), 404

    cursor.execute(
        "INSERT INTO pats (story_id) VALUES (?)",
        (story_id,)
    )
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

    # 改為：拍一次即可解鎖聊天室
    if pat_count >= 1:
        # debug: show pat_count type
        print(f"[DBG] pat_count={pat_count} ({type(pat_count)}) for story {story_id}")
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


@app.route("/api/chat-rooms", methods=["POST"])
def create_chat_room():
    data = request.get_json(silent=True) or {}
    story_id = data.get("story_id")

    if not story_id:
        return jsonify({
            "message": "story_id 參數為必填"
        }), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, pat_count FROM stories WHERE id = ?",
        (story_id,)
    )
    story = cursor.fetchone()

    if not story:
        conn.close()
        return jsonify({
            "message": "慘事不存在"
        }), 404

    # 改為：拍一次即可解鎖聊天室
    if story["pat_count"] < 1:
        conn.close()
        return jsonify({
            "message": "拍拍數不足，無法解鎖聊天室"
        }), 400

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
        return jsonify({
            "message": "聊天室不存在"
        }), 404

    if since:
        try:
            cursor.execute(
                "SELECT id, sender_story_id, content, created_at FROM messages WHERE chat_room_id = ? AND created_at > ? ORDER BY created_at ASC",
                (chat_room_id, since)
            )
        except Exception:
            conn.close()
            return jsonify({
                "message": "since 參數格式錯誤"
            }), 400
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

    return jsonify({
        "messages": messages_list
    }), 200


@app.route("/api/chat-rooms/<int:chat_room_id>/messages", methods=["POST"])
def send_message(chat_room_id):
    # 從 HTTP 請求標頭 (Header) 提取 Authorization Bearer Token
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"message": "未授權的操作"}), 401
    
    provided_token = auth_header.split(' ')[1]

    data = request.get_json(silent=True) or {}
    sender_story_id = data.get("sender_story_id")
    content = (data.get("content") or "").strip()

    if not content:
        return jsonify({
            "message": "訊息不可為空白"
        }), 400

    if len(content) > 500:
        return jsonify({
            "message": "訊息長度超過限制（最多 500 字）"
        }), 400

    if not sender_story_id:
        return jsonify({
            "message": "sender_story_id 參數為必填"
        }), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, story_id FROM chat_rooms WHERE id = ?",
        (chat_room_id,)
    )
    chat_room = cursor.fetchone()

    if not chat_room:
        conn.close()
        return jsonify({
            "message": "聊天室不存在"
        }), 404

    # 安全校驗核心：先嘗試用 JWT 驗證，再退回到 story token 檢查
    jwt_payload = verify_jwt(provided_token)
    if jwt_payload:
        cursor.execute(
            "SELECT id, user_id FROM stories WHERE id = ?",
            (sender_story_id,)
        )
        sender_story = cursor.fetchone()

        if not sender_story or sender_story["user_id"] != jwt_payload["user_id"]:
            conn.close()
            return jsonify({
                "message": "發送者身分驗證失敗，無法發送訊息"
            }), 403
    else:
        cursor.execute(
            "SELECT id FROM stories WHERE id = ? AND token = ?",
            (sender_story_id, provided_token)
        )
        sender_story = cursor.fetchone()

        if not sender_story:
            conn.close()
            return jsonify({
                "message": "發送者身分驗證失敗，無法發送訊息"
            }), 403

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
        return jsonify({
            "message": "訊息送出失敗，請稍後再試"
        }), 500


@app.route("/api/session", methods=["GET"])
def get_session():
    """
    匿名代號系統：
    - 前端帶著 session_token（存在 localStorage）來查詢
    - 若沒有 token 或 token 不存在，自動產生新的搞笑代號
    - 回傳 { session_token, nickname }
    """
    # 搞笑代號前綴清單
    PREFIXES = [
        "垃圾桶", "廢物", "魯蛇", "衰鬼", "倒楣鬼",
        "沒救了", "躺平王", "失業中", "被貓嫌", "欠債中"
    ]

    session_token = request.args.get("token")

    conn = get_db_connection()
    cursor = conn.cursor()

    if session_token:
        # 查詢現有 session
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

    # 產生新的 session
    new_token = uuid.uuid4().hex
    prefix = random.choice(PREFIXES)
    number = random.randint(1000, 9999)
    nickname = f"{prefix} #{number}"

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
    """
    拍拍解鎖後查詢慘事作者的代號
    回傳作者的匿名代號，讓聊天室顯示「你配對到了：垃圾桶 #XXXX」
    stories 表沒有 session_token 欄位，直接回傳預設值即可
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    # 確認 story 存在
    cursor.execute("SELECT id FROM stories WHERE id = ?", (story_id,))
    story = cursor.fetchone()
    conn.close()

    if not story:
        return jsonify({"message": "慘事不存在"}), 404

    # stories 表未關聯 sessions，回傳預設匿名代號
    return jsonify({"nickname": "神秘衰鬼"}), 200


@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
    """
    取得慘度排行榜（前 10 名）
    回傳: { "stories": [{ id, content, vote_count }, ...] }
    無資料時回傳空陣列
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, content, vote_count FROM stories ORDER BY vote_count DESC LIMIT 10"
    )
    stories = cursor.fetchall()
    conn.close()

    return jsonify({
        "stories": [
            {"id": s["id"], "content": s["content"], "vote_count": s["vote_count"]}
            for s in stories
        ]
    }), 200


@app.route("/api/stories/<int:story_id>/vote", methods=["POST"])
def vote_story(story_id):
    """
    對指定慘事投票
    需要 JWT Bearer token
    query param: opponent_id（選填，用於回傳對手最新票數）
    回傳: { vote_counts: { str(story_id): N, str(opponent_id): M } }
    """
    user = get_current_user()
    if user is None:
        return jsonify({"message": "未登入或 token 已過期"}), 401

    conn = get_db_connection()
    cursor = conn.cursor()

    # 查詢 story 是否存在
    cursor.execute("SELECT id FROM stories WHERE id = ?", (story_id,))
    story = cursor.fetchone()
    if not story:
        conn.close()
        return jsonify({"message": "慘事不存在"}), 404

    try:
        cursor.execute(
            "INSERT INTO votes (user_id, story_id) VALUES (?, ?)",
            (user["user_id"], story_id)
        )
        cursor.execute(
            "UPDATE stories SET vote_count = vote_count + 1 WHERE id = ?",
            (story_id,)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"message": "你已經對這則慘事投過票了"}), 409

    # 取得本則慘事最新票數
    cursor.execute("SELECT vote_count FROM stories WHERE id = ?", (story_id,))
    updated = cursor.fetchone()
    vote_counts = {str(story_id): updated["vote_count"]}

    # 若有傳入對手 id，一併回傳對手最新票數
    opponent_id = request.args.get("opponent_id")
    if opponent_id is not None:
        try:
            opponent_id_int = int(opponent_id)
            cursor.execute("SELECT vote_count FROM stories WHERE id = ?", (opponent_id_int,))
            opponent = cursor.fetchone()
            if opponent:
                vote_counts[str(opponent_id_int)] = opponent["vote_count"]
        except (ValueError, TypeError):
            pass  # opponent_id 非整數時忽略

    conn.close()
    return jsonify({"vote_counts": vote_counts}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)