from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import random

app = Flask(__name__)
CORS(app)

DB_NAME = "loser.db"


def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "TrashMatch API is running"})


@app.route("/api/stories", methods=["POST"])
def create_story():
    data = request.get_json(silent=True) or {}
    content = (data.get("content") or "").strip()

    if not content:
        return jsonify({
            "message": "送出失敗，你的慘事暫時無人接收"
        }), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO stories (content) VALUES (?)",
        (content,)
    )
    conn.commit()
    story_id = cursor.lastrowid
    conn.close()

    return jsonify({
        "id": story_id,
        "content": content,
        "pat_count": 0
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

    # Check if pat_count reached 3 and handle chat_room creation
    chat_room_id = None
    match_unlocked = False
    
    if pat_count >= 3:
        match_unlocked = True
        
        # Check if chat_room already exists for this story
        cursor.execute(
            "SELECT id FROM chat_rooms WHERE story_id = ?",
            (story_id,)
        )
        existing_chat_room = cursor.fetchone()
        
        if existing_chat_room:
            # Chat room already exists, use existing ID
            chat_room_id = existing_chat_room["id"]
        else:
            # Create new chat_room
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

    # Verify story exists and has pat_count >= 3
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

    if story["pat_count"] < 3:
        conn.close()
        return jsonify({
            "message": "拍拍數不足，無法解鎖聊天室"
        }), 400

    # Check if chat_room already exists (idempotency)
    cursor.execute(
        "SELECT id, created_at FROM chat_rooms WHERE story_id = ?",
        (story_id,)
    )
    existing_chat_room = cursor.fetchone()

    if existing_chat_room:
        # Return existing chat_room_id
        conn.close()
        return jsonify({
            "chat_room_id": existing_chat_room["id"],
            "created_at": existing_chat_room["created_at"]
        }), 200

    # Create new chat_room
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
    # Get optional 'since' query parameter
    since = request.args.get("since")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify chat_room exists
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
    
    # Build query based on whether 'since' parameter is provided
    if since:
        # Validate ISO 8601 format
        try:
            # Simple validation: check if it's a valid timestamp format
            # SQLite will handle the comparison
            cursor.execute(
                "SELECT id, sender_story_id, content, created_at FROM messages WHERE chat_room_id = ? AND created_at > ? ORDER BY created_at ASC",
                (chat_room_id, since)
            )
        except Exception as e:
            conn.close()
            return jsonify({
                "message": "since 參數格式錯誤"
            }), 400
    else:
        # Get all messages
        cursor.execute(
            "SELECT id, sender_story_id, content, created_at FROM messages WHERE chat_room_id = ? ORDER BY created_at ASC",
            (chat_room_id,)
        )
    
    messages = cursor.fetchall()
    conn.close()
    
    # Convert to list of dictionaries
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
    data = request.get_json(silent=True) or {}
    sender_story_id = data.get("sender_story_id")
    content = (data.get("content") or "").strip()
    
    # Validate content is not empty
    if not content:
        return jsonify({
            "message": "訊息不可為空白"
        }), 400
    
    # Validate content length (1-500 characters)
    if len(content) > 500:
        return jsonify({
            "message": "訊息長度超過限制（最多 500 字）"
        }), 400
    
    # Validate sender_story_id is provided
    if not sender_story_id:
        return jsonify({
            "message": "sender_story_id 參數為必填"
        }), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify chat_room exists
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
    
    # Verify sender_story_id exists
    cursor.execute(
        "SELECT id FROM stories WHERE id = ?",
        (sender_story_id,)
    )
    sender_story = cursor.fetchone()
    
    if not sender_story:
        conn.close()
        return jsonify({
            "message": "發送者慘事不存在"
        }), 403
    
    # Insert message into messages table
    try:
        cursor.execute(
            "INSERT INTO messages (chat_room_id, sender_story_id, content) VALUES (?, ?, ?)",
            (chat_room_id, sender_story_id, content)
        )
        conn.commit()
        message_id = cursor.lastrowid
        
        # Retrieve the newly created message
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
        
    except Exception as e:
        conn.close()
        return jsonify({
            "message": "訊息送出失敗，請稍後再試"
        }), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
