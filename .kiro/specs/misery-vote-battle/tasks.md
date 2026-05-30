# Implementation Plan: Misery Vote Battle（誰比較慘？投票對決）

## Overview

在 TrashMatch 平台新增投票對決（`#vote`）與慘度排行榜（`#leaderboard`）功能。
後端新增 `votes` 表、`stories.vote_count` 欄位及三支 API；前端新增兩個頁面模組、更新路由與導覽列。

## Tasks

- [x] 1. 資料庫遷移：新增 votes 表與 vote_count 欄位
  - [x] 1.1 在 `backend/init_db.py` 的 `init_db()` 中新增 `votes` 表建立語句
    - 欄位：`id`、`user_id`（FK → users）、`story_id`（FK → stories）、`created_at`
    - 加上 `UNIQUE(user_id, story_id)` 約束
    - 同時新增 `CREATE INDEX IF NOT EXISTS idx_votes_story_id ON votes(story_id)` 索引
    - _Requirements: 6.1, 6.3_
  - [x] 1.2 在 `backend/app.py` 的 `migrate_db()` 中新增兩段遷移邏輯
    - 第一段：`ALTER TABLE stories ADD COLUMN vote_count INTEGER NOT NULL DEFAULT 0`（若欄位已存在則跳過，用 `PRAGMA table_info` 檢查）
    - 第二段：執行 `CREATE TABLE IF NOT EXISTS votes (...)` 同 1.1 的 DDL（確保線上資料庫也能自動建立）
    - _Requirements: 6.1_

- [x] 2. 後端 API：GET /api/stories/random-pair
  - [x] 2.1 在 `backend/app.py` 新增 `get_random_pair()` 路由函數
    - 路由：`@app.route("/api/stories/random-pair", methods=["GET"])`
    - 從 `stories` 表 SELECT 所有 `id, content, vote_count`
    - 若總數 < 2，回傳 HTTP 404 `{ "message": "慘事數量不足，快去投稿吧！" }`
    - 用 `random.sample(stories, 2)` 抽取兩則不重複的 Story
    - 回傳 HTTP 200 `{ "stories": [{ id, content, vote_count }, { id, content, vote_count }] }`
    - _Requirements: 6.5, 6.7_
  - [ ]* 2.2 為 `get_random_pair` 撰寫 pytest 測試
    - **Property 4: random-pair 回傳不重複的兩則慘事**
    - **Validates: Requirements 1.1, 6.5**
    - 測試情境：Story 數量 < 2 時回傳 404；Story 數量 ≥ 2 時回傳兩則 id 不同的 Story

- [x] 3. 後端 API：POST /api/stories/<story_id>/vote
  - [x] 3.1 在 `backend/app.py` 新增 `vote_story(story_id)` 路由函數
    - 路由：`@app.route("/api/stories/<int:story_id>/vote", methods=["POST"])`
    - 呼叫 `get_current_user()`；若為 None 回傳 HTTP 401 `{ "message": "未登入或 token 已過期" }`
    - 查詢 story 是否存在；不存在回傳 HTTP 404 `{ "message": "慘事不存在" }`
    - `INSERT INTO votes (user_id, story_id)` + `UPDATE stories SET vote_count = vote_count + 1`
    - 捕捉 `sqlite3.IntegrityError`（UNIQUE 衝突）回傳 HTTP 409 `{ "message": "你已經對這則慘事投過票了" }`
    - 從 `request.args.get("opponent_id")` 取得對手 id，查詢兩則最新 `vote_count`
    - 回傳 HTTP 200 `{ "vote_counts": { str(story_id): N, str(opponent_id): M } }`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ]* 3.2 為 `vote_story` 撰寫 pytest 測試
    - **Property 1: 投票後票數單調遞增**
    - **Validates: Requirements 2.1, 6.1**
    - **Property 2: 防重複投票**
    - **Validates: Requirements 2.3, 6.3**
    - 測試情境：未登入 → 401；story 不存在 → 404；成功投票 → vote_count +1；重複投票 → 409 且 vote_count 不變

- [x] 4. 後端 API：GET /api/leaderboard
  - [x] 4.1 在 `backend/app.py` 新增 `get_leaderboard()` 路由函數
    - 路由：`@app.route("/api/leaderboard", methods=["GET"])`
    - `SELECT id, content, vote_count FROM stories ORDER BY vote_count DESC LIMIT 10`
    - 回傳 HTTP 200 `{ "stories": [{ id, content, vote_count }, ...] }`（無資料時回傳空陣列）
    - _Requirements: 6.6_
  - [ ]* 4.2 為 `get_leaderboard` 撰寫 pytest 測試
    - **Property 5: 排行榜依票數降序排列**
    - **Validates: Requirements 5.1, 6.6**
    - 測試情境：無資料時回傳空陣列；有資料時相鄰兩則 `vote_count[i] >= vote_count[i+1]`；最多回傳 10 則

- [x] 5. 後端 Checkpoint — 確認所有 API 測試通過
  - 確認 `migrate_db()` 可在現有 `loser.db` 上正確執行（欄位已存在時不報錯）
  - 確認三支新 API 端點可正常回應，詢問使用者是否有問題。

- [x] 6. 前端 fetchClient：新增三個 API 方法
  - [x] 6.1 在 `js/fetchClient.js` 的 `fetchClient` 物件中新增 `getRandomPair()` 方法
    - `GET /api/stories/random-pair`，無需 token
    - 回傳 `{ ok, status, data: { stories: [...] } }`
    - _Requirements: 1.1_
  - [x] 6.2 在 `js/fetchClient.js` 新增 `voteStory(storyId, opponentId)` 方法
    - `POST /api/stories/${storyId}/vote?opponent_id=${opponentId}`
    - 從 `localStorage.getItem('trashmatch_auth_token')` 取得 JWT，加入 `Authorization: Bearer` header
    - 回傳 `{ ok, status, data: { vote_counts: {...} } }`
    - _Requirements: 2.1, 6.1_
  - [x] 6.3 在 `js/fetchClient.js` 新增 `getLeaderboard()` 方法
    - `GET /api/leaderboard`，無需 token
    - 回傳 `{ ok, status, data: { stories: [...] } }`
    - _Requirements: 5.1_

- [x] 7. 前端模組：建立 js/vote.js
  - [x] 7.1 建立 `js/vote.js`，匯出 `vote` 物件，實作 `init()` 方法
    - `init()` 監聽 `hashchange` 事件；當 `hash === '#vote'` 時呼叫 `loadPair()`
    - `loadPair()`：呼叫 `fetchClient.getRandomPair()`，成功則呼叫 `renderPair(storyA, storyB)`，失敗則顯示「目前慘事不足，快去投稿吧！」並隱藏投票按鈕
    - `renderPair(storyA, storyB)`：將兩則 Story 的 `content` 填入對應 DOM 元素，顯示「這個比較慘」按鈕，隱藏百分比區塊與「換一組」按鈕
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 7.2 在 `js/vote.js` 實作投票互動邏輯
    - 點擊「這個比較慘」按鈕時，先呼叫 `auth.requireLogin()`；未登入則停止（`auth.requireLogin()` 已處理跳轉）
    - 呼叫 `fetchClient.voteStory(votedId, opponentId)`
    - 成功（200）：呼叫 `calculatePercentages(countA, countB)` 計算百分比，呼叫 `showResults(pctA, pctB)` 顯示進度條，隱藏投票按鈕，顯示「換一組」按鈕
    - 409：顯示「你已經對這則慘事投過票了」
    - 401：呼叫 `auth.requireLogin()`
    - 網路錯誤（status 0）：顯示「網路錯誤，請稍後再試」
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1_
  - [x] 7.3 在 `js/vote.js` 實作 `calculatePercentages(countA, countB)` 純函數
    - 若 `countA + countB === 0`，回傳 `{ pctA: 50, pctB: 50 }`
    - 否則 `pctA = Math.round(countA / total * 100)`，`pctB = 100 - pctA`
    - _Requirements: 4.1, 4.2_
  - [ ]* 7.4 為 `calculatePercentages` 撰寫單元測試
    - **Property 3: Vote_Percentage 合計恆為 100%**
    - **Validates: Requirements 4.1, 4.2**
    - 測試情境：`(0, 0)` → `(50, 50)`；任意非負整數對，`pctA + pctB === 100`

- [x] 8. 前端模組：建立 js/leaderboard.js
  - [x] 8.1 建立 `js/leaderboard.js`，匯出 `leaderboard` 物件，實作 `init()` 方法
    - `init()` 監聽 `hashchange` 事件；當 `hash === '#leaderboard'` 時呼叫 `loadLeaderboard()`
    - `loadLeaderboard()`：呼叫 `fetchClient.getLeaderboard()`
    - 成功且有資料：呼叫 `renderLeaderboard(stories)` 渲染排行榜列表（排名、內容摘要最多 100 字、票數）
    - 成功但空陣列：顯示「還沒有人投票，快去 #vote 頁面開始比慘！」
    - 失敗：顯示「載入失敗，請稍後再試」
    - 「重新整理」按鈕重新呼叫 `loadLeaderboard()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. 前端路由：更新 router.js PAGE_MAP
  - 在 `js/router.js` 的 `PAGE_MAP` 物件中新增兩個條目：
    - `'#vote': 'vote-page'`
    - `'#leaderboard': 'leaderboard-page'`
  - `ALL_PAGES` 由 `Object.values(PAGE_MAP)` 自動產生，無需額外修改
  - _Requirements: 7.1, 7.2_

- [x] 10. 前端 HTML：新增頁面 section 與導覽列連結
  - [x] 10.1 在 `index.html` 的 `<main>` 區塊中，於 Login 頁 `</section>` 之後新增 `#vote-page` section
    - `<section id="vote-page" class="page hidden" aria-label="投票對決">`
    - 包含：頁面標題、兩則 Story 卡片容器（`id="vote-story-a"` 與 `id="vote-story-b"`）、各自的「這個比較慘」按鈕（`id="vote-btn-a"` 與 `id="vote-btn-b"`）、百分比進度條區塊（`id="vote-results"`，預設 `hidden`）、「換一組」按鈕（`id="vote-next-btn"`，預設 `hidden`）、訊息提示區（`id="vote-feedback"`）
    - _Requirements: 1.2, 2.2, 2.4, 3.2, 4.3_
  - [x] 10.2 在 `index.html` 的 `<main>` 區塊中，於 Vote 頁 `</section>` 之後新增 `#leaderboard-page` section
    - `<section id="leaderboard-page" class="page hidden" aria-label="慘度排行榜">`
    - 包含：頁面標題、排行榜列表容器（`id="leaderboard-list"`）、「重新整理」按鈕（`id="leaderboard-refresh-btn"`）、訊息提示區（`id="leaderboard-feedback"`）
    - _Requirements: 5.2, 5.3, 5.4_
  - [x] 10.3 在 `index.html` 的 `<ul class="nav-links">` 中，於「📝 投稿」`<li>` 之後新增兩個導覽連結
    - `<li><a href="#vote" class="nav-link" data-page="vote">⚔️ 比慘</a></li>`
    - `<li><a href="#leaderboard" class="nav-link" data-page="leaderboard">🏆 排行榜</a></li>`
    - _Requirements: 7.5_

- [x] 11. 前端 CSS：新增 vote 與 leaderboard 頁面樣式
  - 在 `css/pages.css` 末尾新增 `#vote-page` 與 `#leaderboard-page` 的樣式
  - Vote 頁：`.vote-battle-wrapper`（兩欄並排，`display: flex; gap`）、`.vote-card`（與現有 `.story-card` 風格一致的玻璃卡片）、`.vote-results`（進度條容器）、`.vote-bar`（進度條本體，使用 CSS 變數 `--pct` 控制寬度）
  - Leaderboard 頁：`.leaderboard-list`（有序列表）、`.leaderboard-item`（排名 + 摘要 + 票數的橫向佈局）、`.leaderboard-rank`（排名數字，pixel font）
  - 響應式：`@media (max-width: 480px)` 下 `.vote-battle-wrapper` 改為 `flex-direction: column`
  - _Requirements: 4.3_

- [ ] 12. 前端進入點：更新 main.js
  - 在 `js/main.js` 中新增兩行 import：
    - `import { vote } from './vote.js'`
    - `import { leaderboard } from './leaderboard.js'`
  - 在現有初始化呼叫之後新增：
    - `vote.init()`
    - `leaderboard.init()`
  - _Requirements: 7.3, 7.4_

- [~] 13. 最終 Checkpoint — 確認所有功能整合正常
  - 確認 `#vote` 頁面可正常載入對決組、投票、顯示百分比、換一組
  - 確認 `#leaderboard` 頁面可正常顯示排行榜與重新整理
  - 確認未登入時點擊投票按鈕會跳轉至 `#login`
  - 確認導覽列 active 狀態在切換頁面時正確更新
  - 確認所有測試通過，詢問使用者是否有問題。

## Notes

- 標記 `*` 的子任務為選填，可跳過以加速 MVP 開發
- 每個任務均標注對應的需求條款以利追蹤
- 後端遷移採用 `PRAGMA table_info` 防止重複 ALTER TABLE 報錯
- `calculatePercentages` 為純函數，可獨立單元測試（Property 3）
- `voteStory` 使用 `trashmatch_auth_token` key（與 `auth.js` 中的 `AUTH_TOKEN_KEY` 一致）
- Property tests（Property 1–5）對應 design.md 的 Correctness Properties 章節

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2", "3", "4"] },
    { "wave": 3, "tasks": ["5"] },
    { "wave": 4, "tasks": ["6"] },
    { "wave": 5, "tasks": ["7", "8"] },
    { "wave": 6, "tasks": ["9"] },
    { "wave": 7, "tasks": ["10"] },
    { "wave": 8, "tasks": ["11"] },
    { "wave": 9, "tasks": ["12"] },
    { "wave": 10, "tasks": ["13"] }
  ]
}
```
