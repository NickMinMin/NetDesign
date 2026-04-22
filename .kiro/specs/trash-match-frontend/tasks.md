# 任務清單：衰鬼回收站 TrashMatch 前端

## 任務

- [x] 1. 建立專案基礎結構與全域樣式
  - [x] 1.1 建立 `index.html`，包含 nav、feed-page、post-page、chat-panel 等容器骨架
  - [x] 1.2 建立 `css/base.css`，定義 CSS Reset、CSS 自訂屬性（設計 token）、全域字型與深色背景樣式
  - [x] 1.3 建立 `css/components.css`，定義 Story_Card 毛玻璃樣式、Pat_Button 像素風樣式、頭像元件樣式
  - [x] 1.4 建立 `css/pages.css`，定義 Feed 頁與 Post 頁的佈局樣式
  - [x] 1.5 建立 `css/chat.css`，定義 Chat_Panel 滑入/滑出 CSS 動畫與毛玻璃樣式
  - [x] 1.6 在 `index.html` 中加入口號文字「大家都沒救了，不如就在一起吧。」（需求 7.4）
  - [x] 1.7 在 `index.html` 中加入像素風導覽列，包含「首頁」與「投稿」連結（需求 5.4）

- [x] 2. 實作 fetchClient.js 模組
  - [x] 2.1 建立 `js/fetchClient.js`，實作統一的 `request` 內部函式，封裝 fetch 呼叫並統一回傳 `{ ok, status, data }` 結構，網路例外時回傳 `{ ok: false, status: 0, data: null }`
  - [x] 2.2 實作 `fetchClient.getRandomStory()`，呼叫 `GET /api/stories/random`
  - [x] 2.3 實作 `fetchClient.patStory(storyId)`，呼叫 `PUT /api/stories/<id>/pat`
  - [x] 2.4 實作 `fetchClient.postStory(content)`，呼叫 `POST /api/stories`，傳入 `{ content }`
  - [x] 2.5 為 fetchClient 撰寫單元測試，模擬各種 HTTP 狀態碼與網路例外情境

- [x] 3. 實作 renderer.js 模組
  - [x] 3.1 建立 `js/renderer.js`，實作 `renderStoryCard(story)` 將 story.content 與 story.pat_count 填入 DOM
  - [x] 3.2 實作 `renderer.renderError(container, msg)` 在指定容器插入錯誤訊息文字
  - [x] 3.3 實作 `renderer.renderSuccess(container, msg)` 在指定容器插入成功訊息文字
  - [x] 3.4 實作 `renderer.updatePatCount(count)` 更新 `#pat-count` 顯示數值
  - [x] 3.5 實作 `renderer.clearPostForm()` 清空投稿表單輸入框
  - [x] 3.6 為 renderer 撰寫屬性測試（fast-check），驗證屬性 1：對任意合法 Story 物件，`renderStoryCard` 後 DOM 包含 content 與 pat_count（最少 100 次迭代）
  - [x] 3.7 為 renderer 撰寫屬性測試（fast-check），驗證屬性 3：對任意初始 pat_count，`updatePatCount(count + 1)` 後顯示值正確遞增（最少 100 次迭代）
  - [x] 3.8 為 renderer 撰寫屬性測試（fast-check），驗證屬性 4：對任意錯誤訊息字串，`renderError` 後容器包含該訊息（最少 100 次迭代）

- [x] 4. 實作 router.js 模組
  - [x] 4.1 建立 `js/router.js`，實作 `router.init()` 監聽 `hashchange` 事件並根據 hash 切換頁面可見性
  - [x] 4.2 實作 `router.navigate(hash)` 更新 `window.location.hash` 並切換對應頁面容器的顯示/隱藏
  - [x] 4.3 實作 `router.openChat()` 為 Chat_Panel 加上滑入 CSS class，移除 hidden class
  - [x] 4.4 實作 `router.closeChat()` 為 Chat_Panel 加上滑出 CSS class，動畫結束後加回 hidden class
  - [x] 4.5 為 router 撰寫屬性測試（fast-check），驗證屬性 5：對任意合法 hash（`#feed`、`#post`），`navigate` 後 `window.location.hash` 等於該 hash 且對應頁面可見（最少 100 次迭代）

- [x] 5. 實作 Feed 頁（feed.js）
  - [x] 5.1 建立 `js/feed.js`，實作頁面初始化：呼叫 `fetchClient.getRandomStory()` 並以 `renderer.renderStoryCard` 渲染結果
  - [x] 5.2 實作「換一則」按鈕點擊事件：重新呼叫 API 並更新 Story_Card（需求 1.3）
  - [x] 5.3 處理 GET /api/stories/random 非 200 回應：呼叫 `renderer.renderError` 顯示「目前沒有慘事，快去投稿吧！」（需求 1.4）
  - [x] 5.4 實作 Pat_Button 點擊事件：呼叫 `fetchClient.patStory`，請求進行中設定按鈕 disabled（需求 2.1、2.4）
  - [x] 5.5 處理拍拍成功回應：呼叫 `renderer.updatePatCount` 遞增顯示值（需求 2.2）
  - [x] 5.6 處理拍拍回應包含 `match_unlocked: true`：呼叫 `router.openChat()`（需求 2.3）
  - [x] 5.7 處理拍拍失敗回應：呼叫 `renderer.renderError` 顯示「拍拍失敗，請稍後再試」（需求 2.5）
  - [x] 5.8 為 feed.js 撰寫單元測試，驗證各種 API 回應情境下的 DOM 狀態與按鈕狀態

- [x] 6. 實作 Post 頁（post.js）
  - [x] 6.1 建立 `js/post.js`，實作投稿表單的 DOM 參照與事件綁定
  - [x] 6.2 實作送出前的空白驗證：若輸入框內容 trim 後為空，顯示「總得說點什麼吧？」並阻止送出（需求 3.3）
  - [x] 6.3 實作送出按鈕點擊事件：呼叫 `fetchClient.postStory`，請求進行中設定按鈕 disabled（需求 3.2、3.6）
  - [x] 6.4 處理 POST 回傳 201：呼叫 `renderer.clearPostForm()` 並顯示「你的慘事已送出，大家都懂你」（需求 3.4）
  - [x] 6.5 處理 POST 非 201 回應：顯示「送出失敗，你的慘事暫時無人接收」（需求 3.5）
  - [x] 6.6 為 post.js 撰寫屬性測試（fast-check），驗證屬性 2：對任意僅由空白字元組成的字串，投稿被拒絕且 API 未被呼叫（最少 100 次迭代）
  - [x] 6.7 為 post.js 撰寫單元測試，驗證成功與失敗情境下的 DOM 狀態

- [x] 7. 實作 Chat 面板（chat.js）
  - [x] 7.1 建立 `js/chat.js`，實作 Chat_Panel 的靜態佔位介面，顯示「你們都沒救了，不如聊聊吧 💬」（需求 4.4、4.5）
  - [x] 7.2 實作點擊 Chat_Panel 外部區域關閉邏輯：監聽 document click 事件，若點擊目標不在 Chat_Panel 內則呼叫 `router.closeChat()`（需求 4.3）
  - [x] 7.3 實作關閉按鈕點擊事件：呼叫 `router.closeChat()`（需求 4.3）
  - [x] 7.4 為 chat.js 撰寫單元測試，驗證點擊外部與關閉按鈕後 Chat_Panel 加上 hidden class

- [x] 8. 實作統一頭像元件
  - [x] 8.1 以像素風 CSS 或 SVG 實作「醜萌垃圾桶」頭像，不使用外部圖片資源（需求 6.3）
  - [x] 8.2 將頭像元件整合至 Story_Card，確認不顯示任何使用者個人資訊（需求 6.1）
  - [x] 8.3 將頭像元件整合至 Post_Page 成功提示區域（需求 6.2）

- [x] 9. 實作 main.js 應用程式進入點
  - [x] 9.1 建立 `js/main.js`，呼叫 `router.init()` 初始化路由
  - [x] 9.2 根據初始 hash 決定顯示 Feed 頁或 Post 頁，預設顯示 Feed 頁
  - [x] 9.3 初始化 Feed 頁（呼叫 feed.js 的初始化函式載入第一則慘事）

- [x] 10. 整合測試與最終驗收
  - [x] 10.1 手動驗收 Feed 頁完整流程：載入 → 顯示卡片 → 拍拍 → 配對解鎖 → Chat 面板滑入
  - [x] 10.2 手動驗收 Post 頁完整流程：輸入 → 送出 → 成功提示 → 表單清空
  - [x] 10.3 手動驗收路由切換：導覽列點擊 → hash 更新 → 頁面切換 → 瀏覽器上下頁功能
  - [x] 10.4 手動驗收視覺風格：毛玻璃卡片、像素風按鈕、深色背景、口號文字顯示
  - [x] 10.5 執行所有自動化測試（`vitest --run`），確認全部通過
