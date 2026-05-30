# Requirements Document

## Introduction

「誰比較慘？投票對決（Misery Vote Battle）」是衰鬼回收站 TrashMatch 平台的新功能模組。
使用者可在 `#vote` 頁面看到隨機抽出的兩則慘事並排對決，點選「這個比較慘」進行投票；
投票後即時顯示兩則慘事的得票百分比。另設有 `#leaderboard` 慘度排行榜頁面，展示得票最多的前 10 則慘事。
投票功能需要登入，且每位使用者對同一則慘事只能投票一次。

## Glossary

- **Vote_System**：負責投票邏輯的後端模組，包含投票 API 與防重複投票機制
- **Vote_Page**：前端 `#vote` 頁面，顯示兩則慘事並排對決的 UI 元件
- **Leaderboard_Page**：前端 `#leaderboard` 頁面，顯示慘度排行榜的 UI 元件
- **Story**：一則慘事，對應資料庫 `stories` 表的一筆記錄
- **Vote**：一位已登入使用者對一則 Story 投出的一票，對應資料庫 `votes` 表的一筆記錄
- **Vote_Count**：某則 Story 累積的總得票數
- **Vote_Percentage**：某則 Story 的 Vote_Count 佔兩則對決 Story 總票數的百分比
- **Authenticated_User**：持有有效 JWT token 的已登入使用者
- **Router**：前端 hash-based 路由模組（`js/router.js`）

## Requirements

### Requirement 1

**User Story:** 身為一位使用者，我想在 `#vote` 頁面看到兩則隨機慘事並排對決，以便我可以投票選出比較慘的那一則。

#### Acceptance Criteria

1. WHEN 使用者導覽至 `#vote`，THE Vote_Page SHALL 從後端取得兩則不重複的隨機 Story 並顯示在頁面上。
2. WHEN 兩則 Story 成功載入，THE Vote_Page SHALL 為每則 Story 各自顯示一個「這個比較慘」按鈕。
3. WHEN 後端回傳 Story 數量少於 2，THE Vote_Page SHALL 顯示「目前慘事不足，快去投稿吧！」提示訊息，並隱藏投票按鈕；WHILE 後端可提供至少兩則 Story，THE Vote_Page SHALL 不顯示該提示訊息。
4. WHEN 使用者在 `#vote` 頁面點擊「換一組」，THE Vote_Page SHALL 重新從後端取得兩則不重複的隨機 Story 並更新顯示。

### Requirement 2

**User Story:** 身為一位已登入的使用者，我想點選「這個比較慘」來投票，以便表達我的比慘判斷。

#### Acceptance Criteria

1. WHEN Authenticated_User 點擊某則 Story 的「這個比較慘」按鈕，THE Vote_System SHALL 記錄該使用者對該 Story 的一票，並回傳兩則 Story 的最新 Vote_Count。
2. WHEN 投票成功，THE Vote_Page SHALL 隱藏兩個投票按鈕，並顯示兩則 Story 各自的 Vote_Percentage（以百分比呈現，兩者合計 100%）。
3. WHEN Authenticated_User 對同一則 Story 重複投票，THE Vote_System SHALL 拒絕該請求並回傳錯誤訊息「你已經對這則慘事投過票了」。
4. WHEN 投票成功後，THE Vote_Page SHALL 顯示「換一組」按鈕，讓使用者繼續對決。

### Requirement 3

**User Story:** 身為一位未登入的使用者，我想在點擊投票時被引導至登入頁，以便完成登入後再投票。

#### Acceptance Criteria

1. WHEN 未登入使用者點擊「這個比較慘」按鈕，THE Vote_Page SHALL 停止投票動作並導覽至 `#login` 頁面。
2. WHEN 未登入使用者導覽至 `#vote`，THE Vote_Page SHALL 顯示投票對決內容，但在投票按鈕上顯示「登入後才能投票」提示。

### Requirement 4

**User Story:** 身為一位使用者，我想在投票後立即看到兩則慘事的得票百分比，以便了解大家的比慘判斷。

#### Acceptance Criteria

1. WHEN 投票完成，THE Vote_Page SHALL 計算並顯示每則 Story 的 Vote_Percentage，格式為整數百分比（例如：67%）。
2. WHEN 兩則 Story 的總票數為零，THE Vote_Page SHALL 顯示兩則 Story 各為 50%。
3. WHEN Vote_Percentage 計算完成，THE Vote_Page SHALL 以視覺化進度條呈現兩則 Story 的相對得票比例。

### Requirement 5

**User Story:** 身為一位使用者，我想在 `#leaderboard` 頁面看到得票最多的前 10 則慘事，以便了解哪些慘事最受認可。

#### Acceptance Criteria

1. WHEN 使用者導覽至 `#leaderboard`，THE Leaderboard_Page SHALL 從後端取得 Vote_Count 最高的前 10 則 Story 並依票數由高至低排列顯示。
2. WHEN 排行榜資料載入完成，THE Leaderboard_Page SHALL 為每則 Story 顯示其排名、慘事內容摘要（最多 100 字）及 Vote_Count。
3. WHEN 排行榜中沒有任何 Story 有票數，THE Leaderboard_Page SHALL 顯示「還沒有人投票，快去 #vote 頁面開始比慘！」提示訊息。
4. WHEN 使用者在 `#leaderboard` 點擊「重新整理」，THE Leaderboard_Page SHALL 重新從後端取得最新排行榜資料並更新顯示。

### Requirement 6

**User Story:** 身為一位後端開發者，我想提供投票與排行榜 API，以便前端可以正確執行投票與查詢排行榜。

#### Acceptance Criteria

1. THE Vote_System SHALL 提供 `POST /api/stories/<story_id>/vote` 端點，接受 JWT Bearer token 驗證，記錄 Authenticated_User 對指定 Story 的投票。
2. WHEN `POST /api/stories/<story_id>/vote` 收到無效或缺少的 JWT token，THE Vote_System SHALL 回傳 HTTP 401 狀態碼。
3. WHEN `POST /api/stories/<story_id>/vote` 收到已投票過的請求，THE Vote_System SHALL 回傳 HTTP 409 狀態碼與錯誤訊息。
4. WHEN `POST /api/stories/<story_id>/vote` 收到不存在的 story_id，THE Vote_System SHALL 回傳 HTTP 404 狀態碼。
5. THE Vote_System SHALL 提供 `GET /api/stories/random-pair` 端點，回傳兩則不重複的隨機 Story（含 id、content、vote_count）。
6. THE Vote_System SHALL 提供 `GET /api/leaderboard` 端點，回傳 Vote_Count 最高的前 10 則 Story（含 id、content、vote_count），依票數由高至低排序。
7. WHEN `GET /api/stories/random-pair` 被呼叫且資料庫中 Story 數量少於 2，THE Vote_System SHALL 回傳 HTTP 404 狀態碼與錯誤訊息。

### Requirement 7

**User Story:** 身為一位使用者，我想透過導覽列連結切換至 `#vote` 與 `#leaderboard` 頁面，以便流暢地使用投票功能。

#### Acceptance Criteria

1. WHEN 使用者導覽至 `#vote`，THE Router SHALL 顯示 Vote_Page 容器並隱藏其他頁面。
2. WHEN 使用者導覽至 `#leaderboard`，THE Router SHALL 顯示 Leaderboard_Page 容器並隱藏其他頁面。
3. WHEN 使用者切換至 `#vote`，THE Vote_Page SHALL 自動觸發載入兩則隨機 Story 的流程。
4. WHEN 使用者切換至 `#leaderboard`，THE Leaderboard_Page SHALL 自動觸發載入排行榜資料的流程。
5. THE Router SHALL 在導覽列新增「⚔️ 比慘」與「🏆 排行榜」連結，並在對應頁面時標記 active 狀態。
