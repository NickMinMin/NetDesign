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
    conn.close()

    pat_count = updated_story["pat_count"]

    return jsonify({
        "pat_count": pat_count,
        "match_unlocked": pat_count >= 3
    }), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)
