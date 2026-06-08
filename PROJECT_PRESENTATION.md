# NetDesign 專案簡報

## 📊 專案概況

**語言構成：**
- HTML: 61.7%
- JavaScript: 21.2%
- Python: 12.1%
- CSS: 5%

---

## 🛠️ 技術選型

| 套件 | 用途 |
|------|------|
| **Flask** | Web 框架、HTTP 路由管理 |
| **flask-cors** | 前端跨域請求支援 |
| **bcrypt** | 密碼雜湊加鹽 |
| **PyJWT** | JWT Token 生成與驗證 |
| **sqlite3** | 資料庫驅動 |

---

## 📁 後端專案結構

```
backend/
├── app.py           (主程式、路由定義)
├── init_db.py       (資料表與索引建立)
├── loser.db         (SQLite 資料庫)
└── requirements.txt (依賴套件)
```

---

## ✨ 核心特性

### 自動資料庫遷移機制
- 應用啟動時自動執行 `migrate_db()`
- 偵測欄位是否存在，自動補齊新欄位
- 無需手動執行升級腳本
- ✅ 向下相容、舊資料自動適配

### CORS 支援
```python
from flask_cors import CORS
CORS(app)  # 允許所有來源（開發用）
```

---

## 🎯 架構優勢

✓ 輕量級 SQLite 資料庫  
✓ JWT 安全認證  
✓ 自動化資料庫管理  
✓ 前後端分離支援  
✓ 密碼安全加密存儲
