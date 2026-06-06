# 魯蛇回收站（TrashMatch）

> 「大家都沒救了，不如就在一起吧。」

一個零門檻的匿名「比慘」交友平台，透過幽默與自嘲取代傳統交友 App 的外貌焦慮。

---

## 目錄

- [專案簡介](#專案簡介)
- [核心功能](#核心功能)
- [技術架構](#技術架構)
- [快速開始](#快速開始)
- [功能說明](#功能說明)
- [API 文件](#api-文件)
- [資料庫結構](#資料庫結構)
- [專案結構](#專案結構)
- [測試](#測試)
- [搞笑文案列表](#搞笑文案列表)
- [未來規劃](#未來規劃)

---

## 專案簡介

「魯蛇回收站」讓使用者透過分享生活中的挫折與窘境，與有共鳴的人建立連結。當你的慘事累積拍拍後，系統會自動解鎖聊天室，讓你與同樣「沒救」的人開始對話。支援帳號系統與完全匿名模式並行，讓使用者自由選擇身份。

---

## 核心功能

| 功能 | 說明 |
|------|------|
| **匿名 / 帳號雙模式** | 無需註冊即可投稿，也可用帳號登入以保留投稿紀錄 |
| **投稿慘事** | 依分類（愛情慘劇 / 職場地獄 / 考試爆炸 / 家庭悲劇 / 其他衰事）投稿 |
| **隨機瀏覽** | 隨機推播慘事，可依分類過濾 |
| **拍拍互動** | 對慘事按拍拍，達門檻後自動解鎖聊天室 |
| **比慘對決** | 兩則慘事 PK，投票選出「更慘」的那則 |
| **聊天室** | 拍拍解鎖後開啟私人聊天，輪詢式即時更新 |
| **公開留言** | 任何人都可以對慘事發表公開留言 |
| **慘度排行榜** | 依拍拍數 + 對決得票數綜合排名，前 10 名公開展示 |
| **個人頁面** | 登入後查看自己的投稿紀錄 |

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | HTML / CSS / Vanilla JavaScript（ES6 模組） |
| 後端 | Python 3.8+ / Flask / Flask-CORS |
| 資料庫 | SQLite（`loser.db`） |
| 認證 | JWT（PyJWT，有效期 30 天）+ bcrypt 密碼雜湊 |
| 通訊 | RESTful API + 長輪詢（3 秒間隔） |
| 測試 | pytest（後端）/ Playwright（前端 E2E） |

---

## 快速開始

### 環境需求

- Python 3.8+
- 現代瀏覽器（Chrome、Firefox、Safari）

### 安裝步驟

1. **Clone 專案**
   ```bash
   git clone <repository-url>
   cd NetDesign
   ```

2. **安裝後端依賴**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

   依賴套件：`Flask`、`flask-cors`、`bcrypt`、`PyJWT`

3. **初始化資料庫**
   ```bash
   python init_db.py
   ```
   > 若資料庫已存在，`app.py` 啟動時會自動執行 migration，補齊缺少的欄位。

4. **啟動後端伺服器**
   ```bash
   python app.py
   ```
   伺服器將在 `http://localhost:5000` 啟動

5. **開啟前端**

   直接用瀏覽器開啟根目錄的 `index.html`，或使用本地伺服器：
   ```bash
   # 在專案根目錄執行
   python -m http.server 8000
   ```
   前端將在 `http://localhost:8000` 啟動

---

## 功能說明

### 1. 帳號系統

系統採**雙身份設計**：已登入使用者（JWT）與匿名訪客（session token）可並行使用所有功能。

- **註冊**：設定登入暱稱與密碼，系統隨機分配搞笑代號（如「垃圾桶 #4521」）
- **真實暱稱隱藏**：對其他人只顯示搞笑代號，保護真實身份
- **匿名模式**：未登入時系統自動建立 session，並分配臨時匿名代號

### 2. 投稿慘事

無需登入即可投稿，支援依分類整理：

- **使用方式**：點擊「📝 投稿」→ 輸入慘事（最多 500 字）→ 選擇分類 → 送出
- 投稿後系統回傳 `token`，作為後續聊天室發訊的身份憑證（請妥善保存）

### 3. 瀏覽 / 拍拍

- 系統隨機推播慘事，可過濾分類
- 對有共鳴的慘事按「拍拍 TA」，達到門檻後自動解鎖聊天室
- 每位使用者對同一則慘事只能拍一次（登入或 session 去重）

### 4. 比慘對決

- 進入「**比慘對決**」頁面，系統隨機配出兩則慘事 PK
- 登入後投票選出「更慘」的那則
- 投票結果即時顯示雙方票數
- 對決得票數計入排行榜總分

### 5. 聊天室

- 拍拍達到門檻後聊天室自動解鎖，從右側滑入
- 每 3 秒輪詢新訊息，無需手動重新整理
- 訊息長度限制 1–500 字元
- 聊天室與慘事一對一綁定（`chat_rooms.story_id UNIQUE`）

### 6. 公開留言

- 任何人（登入或匿名）都可以對慘事留下公開留言
- 每則留言最多 200 字，每次最多顯示 50 則

### 7. 慘度排行榜

計分公式：
```
score = 對決總得票數（pair_votes）+ 拍拍數（pat_count）
```
前 10 名公開顯示，分類展示 `vote_count`、`pat_count`、`score`。

---

## API 文件

詳細 API 說明請參考 [MD/API_DESIGN.md](MD/API_DESIGN.md)。

### 端點快速索引

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| POST | `/api/register` | 註冊帳號 | 否 |
| POST | `/api/login` | 登入 | 否 |
| GET | `/api/me` | 取得目前使用者 | JWT |
| GET | `/api/session` | 取得 / 建立匿名 session | 否 |
| POST | `/api/stories` | 投稿慘事 | 否（選填 JWT） |
| GET | `/api/stories/random` | 取得隨機慘事 | 否 |
| GET | `/api/stories/random-pair` | 取得隨機對決組 | 否 |
| PUT | `/api/stories/:id/pat` | 拍拍慘事 | 否（選填 JWT） |
| GET | `/api/stories/:id/owner` | 取得作者代號 | 否 |
| GET | `/api/stories/:id/comments` | 取得留言列表 | 否 |
| POST | `/api/stories/:id/comments` | 新增留言 | 否（選填 JWT） |
| POST | `/api/vote-pairs/:id/vote` | 對決投票 | **JWT 必填** |
| GET | `/api/vote-pairs/:id/results` | 取得對決票數 | 否 |
| POST | `/api/chat-rooms` | 建立聊天室 | 否 |
| GET | `/api/chat-rooms/:id/messages` | 取得聊天室訊息 | 否 |
| POST | `/api/chat-rooms/:id/messages` | 發送訊息 | story_token 或 JWT |
| GET | `/api/leaderboard` | 排行榜前 10 名 | 否 |

### 認證說明

| 身份 | 認證方式 |
|------|----------|
| 登入使用者 | `Authorization: Bearer <JWT>` |
| 匿名投稿者 | `Authorization: Bearer <story_token>`（投稿時回傳） |
| 匿名訪客 | Request Body `session_token`（由 `GET /api/session` 取得） |

---

## 資料庫結構

詳細設計與正規化分析請參考 [MD/DATABASE_DESIGN.md](MD/DATABASE_DESIGN.md)。

### 資料表總覽

| 資料表 | 說明 |
|--------|------|
| `users` | 已註冊使用者帳號，含 bcrypt 密碼雜湊與搞笑代號 |
| `sessions` | 匿名訪客的 session token 與臨時暱稱 |
| `stories` | 慘事主體，含分類、拍拍快取、匿名 token |
| `pats` | 拍拍行為紀錄，支援登入使用者與匿名訪客 |
| `vote_pairs` | 比慘對決配對，每次 random-pair 產生一筆 |
| `pair_votes` | 對決投票紀錄，每人每對決限投一票 |
| `chat_rooms` | 解鎖的聊天室，與慘事 1:1 關聯 |
| `messages` | 聊天室訊息 |
| `comments` | 慘事公開留言 |
| `votes` | 舊版投票表（保留相容，已不主動使用） |

### 正規化摘要

- **1NF / 2NF / 3NF**：所有資料表均符合，單一主鍵避免部分/傳遞函數相依
- **BCNF**：`votes`、`pair_votes`、`chat_rooms` 的複合唯一約束均形成候選鍵
- **反正規化例外**：`stories.pat_count` 為快取欄位，以加速排行榜排序；`stories.vote_count` 為舊版保留欄位

---

## 專案結構

```
NetDesign/
├── backend/
│   ├── app.py                 # Flask 主應用程式（API 路由、JWT、migration）
│   ├── init_db.py             # 資料庫初始化腳本（建表、索引）
│   ├── requirements.txt       # Python 依賴（Flask, flask-cors, bcrypt, PyJWT）
│   ├── loser.db               # SQLite 資料庫檔案（gitignore 可視情況加入）
│   └── test_*.py              # 單元測試與整合測試（pytest）
├── css/
│   ├── base.css               # 全域基礎樣式、CSS 變數
│   ├── components.css         # 可複用元件樣式（按鈕、卡片等）
│   ├── pages.css              # 各頁面專屬樣式
│   └── chat.css               # 聊天室面板樣式
├── js/
│   ├── main.js                # 應用程式進入點，初始化所有模組
│   ├── router.js              # Hash 路由（#cover / #feed / #post / #vote / #leaderboard / #profile）
│   ├── auth.js                # 帳號登入 / 註冊 / 登出
│   ├── session.js             # 匿名 session 管理
│   ├── feed.js                # 慘事瀏覽頁邏輯
│   ├── post.js                # 慘事投稿頁邏輯
│   ├── vote.js                # 比慘對決頁邏輯
│   ├── leaderboard.js         # 慘度排行榜邏輯
│   ├── chat.js                # 聊天室面板邏輯（輪詢）
│   ├── comments.js            # 公開留言邏輯
│   ├── profile.js             # 個人頁面邏輯
│   ├── renderer.js            # UI 渲染工具函式
│   ├── fetchClient.js         # API 請求封裝（含 JWT header）
│   └── *.test.js              # 各模組的單元測試（Playwright）
├── MD/
│   ├── DATABASE_DESIGN.md     # 資料庫設計文件（含正規化分析）
│   ├── API_DESIGN.md          # REST API 設計文件
│   └── ...                    # 其他測試報告與實作摘要
├── index.html                 # 單頁應用程式主檔案（SPA）
└── README.md                  # 本文件
```

---

## 測試

### 後端（pytest）

```bash
cd backend
pytest test_*.py -v
```

### 前端 E2E（Playwright）

```bash
cd frontend
npx playwright test
```

### 手動測試流程

1. 啟動後端 `python app.py`
2. 用兩個瀏覽器分頁開啟前端
3. 在分頁 A 投稿一則慘事，取得回傳的 `token`
4. 在分頁 B 對該慘事拍拍，達到門檻後確認聊天室自動解鎖
5. 分別在兩個分頁發送訊息，確認 3 秒輪詢正常接收
6. 測試比慘對決：進入 `#vote` 頁面，登入後投票，確認票數即時更新
7. 進入 `#leaderboard` 確認排行榜分數計算正確

---

## 搞笑文案列表

| 場景 | 文案 |
|------|------|
| 配對成功 | 「💘 配對成功！你們都沒救了」 |
| 聊天室空狀態 | 「你們都沒救了，不如聊聊吧 💬✨」 |
| 投稿成功 | 「你的慘事已送達垃圾桶，等待有緣衰鬼」 |
| 拍拍失敗 | 「拍拍失敗，請稍後再試」 |
| 無慘事 | 「目前沒有慘事，快去投稿吧！」 |
| 404 頁面 | 「你的運氣跟這個網頁一樣，都不存在」 |
| 訊息失敗 | 「訊息送出失敗，你的話語迷失在虛空中」 |
| 聊天室載入失敗 | 「聊天室載入失敗，連系統都放棄你了」 |
| 登入搞笑代號 | 系統從「垃圾桶、廢物、魯蛇、衰鬼、倒楣鬼、沒救了、躺平王、失業中、被貓嫌、欠債中」隨機搭配四位數字 |

---

## 未來規劃

- [ ] 引入 WebSocket 取代輪詢，實現真正即時通訊
- [ ] 新增智慧配對演算法（基於 NLP 分析慘事內容相似度）
- [ ] 主題標籤系統（`#職場` `#感情` `#生活`）
- [ ] 慘事分享功能（複製連結 / 社群平台）
- [ ] 前端框架重構（React 或 Vue.js）
- [ ] 資料庫升級至 PostgreSQL
- [ ] 雲端部署（AWS / GCP / Azure）
- [ ] 慘事圖片附件支援
- [ ] 訊息已讀回執

---

## 相關文件

| 文件 | 說明 |
|------|------|
| [MD/DATABASE_DESIGN.md](MD/DATABASE_DESIGN.md) | 完整資料庫設計、ER 圖、正規化分析 |
| [MD/API_DESIGN.md](MD/API_DESIGN.md) | REST API 端點規格、Request/Response 範例 |
| [MD/DEVELOPER_GUIDE.md](MD/DEVELOPER_GUIDE.md) | 開發環境設定與貢獻指南 |

---

## 授權

本專案為教育用途，未指定授權。

---

**專案口號**：「大家都沒救了，不如就在一起吧。」 🗑️💘
