# Implementation Plan: Developer C Interaction & Chat Feature

## Overview

本實作計畫將「魯蛇回收站」的核心互動功能從拍拍機制擴展到聊天室解鎖與即時對話。實作範圍包括：

1. **後端擴充**：新增聊天室與訊息資料表、API 端點、解鎖邏輯
2. **前端擴充**：聊天室 UI 組件、輪詢機制、訊息發送與顯示
3. **文案系統**：防呆提示與搞笑文案整合
4. **測試與文件**：單元測試、整合測試、預期成果文件

技術棧：Python Flask + SQLite（後端）、Vanilla JavaScript（前端）

## Tasks

- [x] 1. 擴充資料庫 Schema 與初始化腳本
  - 在 `backend/init_db.py` 新增 `chat_rooms` 表（欄位：id, story_id, created_at）
  - 在 `backend/init_db.py` 新增 `messages` 表（欄位：id, chat_room_id, sender_story_id, content, created_at）
  - 新增 `messages` 表的索引：`idx_messages_chat_room_created` (chat_room_id, created_at)
  - 執行資料庫初始化腳本，驗證表結構正確建立
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 2. 實作後端聊天室 API 端點
  - [x] 2.1 修改 `PUT /api/stories/{story_id}/pat` 端點
    - 當 `pat_count` 達到 3 時，檢查是否已有 `chat_room` 記錄
    - 若無 `chat_room` 記錄，建立新的 `chat_room` 記錄（story_id 為觸發解鎖的慘事 ID）
    - 回傳 JSON 包含 `match_unlocked: true` 與 `chat_room_id`
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 2.2 實作 `POST /api/chat-rooms` 端點
    - 接收 `story_id` 參數
    - 驗證 `story_id` 存在且 `pat_count >= 3`
    - 若已有 `chat_room` 記錄，回傳現有 ID（冪等性）
    - 若無記錄，建立新的 `chat_room` 並回傳 ID
    - _Requirements: 10.1, 10.4_

  - [x] 2.3 實作 `GET /api/chat-rooms/{chat_room_id}/messages` 端點
    - 接收可選的 `since` 查詢參數（ISO 8601 時間戳）
    - 查詢 `messages` 表，過濾 `chat_room_id` 與 `created_at > since`
    - 回傳訊息列表（按 `created_at` 升序排序）
    - 處理 404 錯誤（chat_room_id 不存在）與 400 錯誤（since 格式錯誤）
    - _Requirements: 9.5, 10.2, 3.2_

  - [x] 2.4 實作 `POST /api/chat-rooms/{chat_room_id}/messages` 端點
    - 接收 `sender_story_id` 與 `content` 參數
    - 驗證 `chat_room_id` 存在
    - 驗證 `content` 不為空且長度 1-500 字元
    - 插入訊息到 `messages` 表
    - 回傳新建立的訊息（含 id, sender_story_id, content, created_at）
    - 處理 404、403、400 錯誤
    - _Requirements: 9.4, 10.3, 10.5, 2.3, 2.4_

- [x] 2.5 撰寫後端 API 單元測試
  - 測試 `PUT /api/stories/{story_id}/pat` 的解鎖邏輯（第 3 次拍拍回傳 match_unlocked）
  - 測試 `POST /api/chat-rooms` 的冪等性與驗證邏輯
  - 測試 `GET /api/chat-rooms/{chat_room_id}/messages` 的 since 參數過濾
  - 測試 `POST /api/chat-rooms/{chat_room_id}/messages` 的內容驗證
  - 測試錯誤處理（404, 400, 403）
  - _Requirements: 7.2, 7.3, 7.4, 7.6_

- [x] 3. 擴充前端 fetchClient 模組
  - 在 `frontend/js/fetchClient.js` 新增 `getChatRoomId(storyId)` 方法
  - 在 `frontend/js/fetchClient.js` 新增 `getMessages(chatRoomId, since)` 方法
  - 在 `frontend/js/fetchClient.js` 新增 `sendMessage(chatRoomId, senderStoryId, content)` 方法
  - 處理 API 錯誤回應，回傳統一的 `{ok, data/status}` 格式
  - _Requirements: 2.3, 3.1, 3.2, 3.3_

- [x] 3.1 撰寫 fetchClient 單元測試
  - 測試 `getChatRoomId` 成功與失敗情境
  - 測試 `getMessages` 的 since 參數處理
  - 測試 `sendMessage` 的錯誤處理
  - _Requirements: 7.6_

- [x] 4. 實作前端聊天室模組（chat.js）
  - [x] 4.1 建立聊天室狀態管理
    - 定義 `chatState` 物件（chatRoomId, messages, lastFetchedAt, pollingInterval, isSending）
    - 實作 `chat.init()` 方法：綁定關閉按鈕與發送按鈕事件
    - _Requirements: 2.1, 4.1_

  - [x] 4.2 實作聊天室開啟邏輯
    - 實作 `chat.open(chatRoomId)` 方法
    - 顯示聊天室面板（移除 `hidden` class）
    - 呼叫 `fetchClient.getMessages()` 載入初始訊息
    - 啟動輪詢機制（每 3 秒呼叫 `pollMessages()`）
    - 顯示載入指示器
    - _Requirements: 2.1, 2.5, 3.1, 3.5_

  - [x] 4.3 實作訊息輪詢機制
    - 實作 `pollMessages()` 方法
    - 使用 `lastFetchedAt` 作為 `since` 參數呼叫 API
    - 若有新訊息，呼叫 `appendMessages()` 更新 UI
    - 更新 `lastFetchedAt` 為最新訊息的時間戳
    - 靜默處理錯誤（記錄到 console，不中斷輪詢）
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.4 實作訊息發送邏輯
    - 實作 `chat.sendMessage(content)` 方法
    - 驗證訊息內容（不可為空白、長度 1-500 字元）
    - 呼叫 `fetchClient.sendMessage()` 發送訊息
    - 發送成功後立即顯示訊息（不等待輪詢）
    - 清空輸入框
    - 顯示錯誤訊息（若發送失敗）
    - _Requirements: 2.3, 2.4, 5.4_

  - [x] 4.5 實作聊天室關閉邏輯
    - 實作 `chat.close()` 方法
    - 隱藏聊天室面板（新增 `hidden` class）
    - 停止輪詢（clearInterval）
    - 保留 `chatRoomId` 與 `messages`（支援重新開啟）
    - _Requirements: 4.1, 4.2, 4.4_

- [x] 4.6 撰寫 chat 模組單元測試
  - 測試 `validateMessage` 函式（空白、長度驗證）
  - 測試 `formatTimestamp` 函式（時間格式化）
  - 測試聊天室開啟/關閉狀態切換
  - _Requirements: 7.6_

- [x] 5. 擴充前端 renderer 模組
  - 在 `frontend/js/renderer.js` 新增 `renderMessages(messages)` 方法
  - 實作訊息氣泡 HTML 生成（區分發送者與接收者）
  - 實作時間戳格式化（顯示相對時間或絕對時間）
  - 實作自動滾動到最新訊息
  - 新增 `renderChatGreeting()` 方法：顯示「💘 配對成功！你們都沒救了」
  - 新增 `renderEmptyChatState()` 方法：顯示「你們都沒救了,不如聊聊吧 💬✨」
  - _Requirements: 2.2, 2.5, 6.2, 6.3_

- [x] 5.1 撰寫 renderer 單元測試
  - 測試訊息列表渲染（多則訊息）
  - 測試空狀態渲染
  - 測試錯誤訊息渲染
  - _Requirements: 7.6_

- [x] 6. 修改前端 feed 模組
  - 在 `frontend/js/feed.js` 的 `handlePat()` 函式中處理 `match_unlocked` 旗標
  - 當 `match_unlocked === true` 時，呼叫 `fetchClient.getChatRoomId()` 取得聊天室 ID
  - 呼叫 `router.openChat(chatRoomId)` 開啟聊天室
  - _Requirements: 1.2, 1.3_

- [x] 7. 擴充前端 router 模組
  - 在 `frontend/js/router.js` 新增 `openChat(chatRoomId)` 方法
  - 呼叫 `chat.open(chatRoomId)` 開啟聊天室面板
  - 新增 `closeChat()` 方法：呼叫 `chat.close()`
  - 維護聊天室狀態（支援頁面導航時保留聊天室）
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 8. 更新前端 HTML 結構
  - 在 `frontend/index.html` 新增聊天室面板 DOM 結構
  - 新增聊天室標題區（含關閉按鈕）
  - 新增訊息顯示區（`#chat-messages`）
  - 新增訊息輸入區（輸入框 + 送出按鈕）
  - 預設隱藏聊天室面板（`hidden` class）
  - _Requirements: 2.1_

- [x] 9. 新增聊天室 CSS 樣式
  - 建立 `frontend/css/chat.css`（若尚未存在）或在現有 CSS 檔案中新增樣式
  - 實作聊天室面板樣式（固定在右側、滑入動畫）
  - 實作訊息氣泡樣式（發送者/接收者區分）
  - 實作輸入框與按鈕樣式
  - 實作響應式設計（手機版適配）
  - _Requirements: 2.1_

- [x] 10. 整合錯誤訊息與搞笑文案
  - [x] 10.1 在 `fetchClient.js` 新增 `getErrorMessage(context, status)` 函式
    - 定義錯誤訊息對應表（pat, send_message, load_chat, load_story）
    - 回傳對應的搞笑錯誤文案
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 10.2 在 `renderer.js` 新增 `renderError(message)` 方法
    - 顯示錯誤訊息（Toast 或 Alert 樣式）
    - 自動消失（3 秒後）
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 10.3 在 `renderer.js` 新增 `renderLoadingState(message)` 方法
    - 顯示「載入中… 🗑️」
    - _Requirements: 6.5_

  - [x] 10.4 在 `post.js` 更新投稿成功訊息
    - 顯示「你的慘事已送達垃圾桶，等待有緣衰鬼」
    - _Requirements: 6.4_

  - [x] 10.5 建立 404 頁面（可選）
    - 新增 404.html 或在 router 中處理 404 路由
    - 顯示「你的運氣跟這個網頁一樣，都不存在」
    - _Requirements: 6.1_

- [x] 11. Checkpoint - 功能驗證與測試
  - 執行所有單元測試，確保通過
  - 手動測試完整流程：投稿 → 拍拍 3 次 → 聊天室開啟 → 發送訊息
  - 測試輪詢機制：開啟兩個瀏覽器視窗，驗證訊息即時更新
  - 測試錯誤處理：關閉後端伺服器，驗證錯誤訊息顯示
  - 測試聊天室關閉與重新開啟：驗證訊息歷史保留
  - 確保所有測試通過，詢問使用者是否有問題

- [x] 12. 系統整合測試
  - [x] 12.1 建立整合測試腳本或手動測試清單
    - 測試案例 1：完整配對流程（發文 → 拍拍 → 聊天）
    - 測試案例 2：輪詢機制（新訊息自動更新）
    - 測試案例 3：錯誤處理（網路錯誤、驗證錯誤）
    - 測試案例 4：聊天室持久化（關閉後重新開啟）
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 12.2 執行跨瀏覽器測試
    - 測試 Chrome、Firefox、Safari
    - 驗證 UI 一致性與功能正確性
    - _Requirements: 7.6_

  - [x] 12.3 執行行動裝置測試
    - 測試 iOS Safari 與 Android Chrome
    - 驗證響應式設計與觸控互動
    - _Requirements: 7.6_

- [x] 13. 撰寫預期成果文件
  - 建立 `EXPECTED_OUTCOMES.md` 檔案
  - 撰寫專案摘要：核心功能與獨特價值主張
  - 描述使用者互動場景（產品上線後的使用情境）
  - 列出未來擴展方向（即時通訊、配對演算法、使用者認證）
  - 強調幽默與自嘲調性作為核心差異化特色
  - 使用繁體中文撰寫，Markdown 格式
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 14. 更新專案文件
  - 更新 `README.md`：新增聊天室功能說明
  - 新增 API 文件（可選）：記錄所有聊天室相關端點
  - 新增開發者指南（可選）：說明如何擴展聊天室功能

- [x] 15. Final Checkpoint - 完整驗收
  - 執行所有自動化測試（單元測試 + 整合測試）
  - 執行完整手動測試清單
  - 驗證所有需求的 Acceptance Criteria 均已滿足
  - 檢查程式碼品質（命名、註解、結構）
  - 確保所有文件完整且最新
  - 詢問使用者是否有最終調整需求

## Notes

- 任務標記 `*` 為可選任務，可跳過以加速 MVP 開發
- 每個任務均標註對應的需求編號（Requirements），確保可追溯性
- Checkpoint 任務用於階段性驗證，確保漸進式交付
- 單元測試與整合測試標記為可選，但強烈建議執行以確保品質
- 前端使用 Vanilla JavaScript（ES6 模組），無框架依賴
- 後端使用 Python Flask + SQLite，保持簡單可靠
- 輪詢間隔設定為 3 秒，可根據實際需求調整
- 所有搞笑文案均已在設計文件中定義，實作時直接引用
