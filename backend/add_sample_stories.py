import sqlite3

DB_NAME = "loser.db"

def add_sample_stories():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    sample_stories = [
        "今天上班遲到，被老闆當眾訓話，同事們都在看戲。",
        "約會對象放我鴿子，還發訊息說忘記了。",
        "花了大錢買的衣服，洗一次就縮水了。",
        "準備了很久的簡報，投影機壞了。",
        "點了外送，送來的東西完全不對。",
        "手機掉水裡，救起來後螢幕花了。",
        "考試前一天生病，成績一落千丈。",
        "買的彩票中獎了，但忘記去領。",
        "養的寵物把家裡搞得亂七八糟。",
        "朋友借錢不還，還裝作沒事人。"
    ]

    for story in sample_stories:
        cursor.execute(
            "INSERT INTO stories (content, pat_count) VALUES (?, ?)",
            (story, 0)
        )

    conn.commit()
    conn.close()
    print(f"✓ Added {len(sample_stories)} sample stories to database")

if __name__ == "__main__":
    add_sample_stories()