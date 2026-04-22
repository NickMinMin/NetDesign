# 需求文件

## 簡介

「衰鬼回收站 TrashMatch」是一個以「比慘」為核心互動機制的反向社交匿名平台。
本文件涵蓋前端部分的功能需求，包含首頁（Feed）、投稿頁（Post）與聊天室（Chat）三個主要頁面。
前端採用 HTML/CSS/Vanilla JavaScript 實作，視覺風格為毛玻璃（Glassmorphism）與像素風（Pixel Art）混搭，
透過 Fetch API 串接後端 REST API。

---

## 詞彙表

- **Feed 頁**：首頁，隨機展示一則慘事卡片，使用者可給予「拍拍」
- **Post 頁**：投稿頁，使用者輸入並送出自己的慘事
- **Chat 頁**：聊天室頁，配對成功後開啟的對話視窗
- **慘事卡片（Story_Card）**：展示單則慘事內容與拍拍數的毛玻璃卡片元件
- **拍拍按鈕（Pat_Button）**：觸發 PUT /api/stories/<id>/pat 的互動按鈕
- **配對解鎖（Match_Unlock）**：雙方互拍達 3 次後觸發的聊天室開啟機制
- **Fetch_Client**：封裝 Fetch API 呼叫後端的 JavaScript 模組
- **Renderer**：負責將 API 回傳資料動態渲染至 DOM 的 JavaScript 模組
- **Router**：負責頁面切換（SPA 路由或多頁切換）的模組

---

## 需求

### 需求 1：首頁隨機慘事展示

**User Story：** 身為一個心情很差的使用者，我想在首頁看到一則隨機的慘事，讓我知道大家都沒救了，不如就在一起吧。

#### 驗收標準

1. WHEN 使用者開啟首頁，THE Renderer SHALL 呼叫 GET /api/stories/random 並將回傳的慘事內容渲染至 Story_Card
2. WHEN GET /api/stories/random 回傳成功，THE Story_Card SHALL 顯示慘事內容（content）與目前拍拍數（pat_count）
3. WHEN 使用者點擊「換一則」按鈕，THE Fetch_Client SHALL 重新呼叫 GET /api/stories/random 並由 Renderer 更新 Story_Card 內容
4. IF GET /api/stories/random 回傳非 200 狀態碼，THEN THE Renderer SHALL 在 Story_Card 位置顯示錯誤提示文字「目前沒有慘事，快去投稿吧！」
5. THE Story_Card SHALL 以毛玻璃（Glassmorphism）樣式呈現，包含半透明背景、模糊效果與圓角邊框

---

### 需求 2：拍拍互動

**User Story：** 身為一個感同身受的使用者，我想對一則慘事按下「拍拍」，表達我的共鳴。

#### 驗收標準

1. WHEN 使用者點擊 Pat_Button，THE Fetch_Client SHALL 呼叫 PUT /api/stories/<story_id>/pat
2. WHEN PUT /api/stories/<story_id>/pat 回傳成功，THE Renderer SHALL 將 Story_Card 上顯示的 pat_count 數值加 1
3. WHEN PUT /api/stories/<story_id>/pat 回傳包含配對解鎖旗標（match unlocked），THE Router SHALL 觸發聊天室滑入動畫並顯示 Chat 頁
4. WHILE 拍拍請求進行中，THE Pat_Button SHALL 呈現禁用（disabled）狀態，防止重複送出
5. IF PUT /api/stories/<story_id>/pat 回傳非 200 狀態碼，THEN THE Renderer SHALL 在 Pat_Button 旁顯示錯誤提示「拍拍失敗，請稍後再試」
6. THE Pat_Button SHALL 以像素風（Pixel Art）圖示「✋」呈現，並位於 Story_Card 右下角

---

### 需求 3：投稿慘事

**User Story：** 身為一個也沒救了的使用者，我想投稿自己的慘事，讓大家知道我的處境。

#### 驗收標準

1. THE Post_Page SHALL 提供一個大型文字輸入框，placeholder 文字為「說說你有多慘…」
2. WHEN 使用者點擊「我也沒救了，送出」按鈕，THE Fetch_Client SHALL 呼叫 POST /api/stories 並傳入 `{ "content": "<使用者輸入內容>" }`
3. IF 使用者點擊送出時輸入框為空，THEN THE Post_Page SHALL 顯示提示文字「總得說點什麼吧？」並阻止送出
4. WHEN POST /api/stories 回傳 201，THE Post_Page SHALL 清空輸入框並顯示成功提示「你的慘事已送出，大家都懂你」
5. IF POST /api/stories 回傳非 201 狀態碼，THEN THE Post_Page SHALL 顯示錯誤提示「送出失敗，你的慘事暫時無人接收」
6. WHILE POST /api/stories 請求進行中，THE Post_Page SHALL 將送出按鈕呈現禁用狀態

---

### 需求 4：聊天室滑入顯示

**User Story：** 身為一個成功配對的使用者，我想看到聊天室從右側滑出，開始與對方聊天。

#### 驗收標準

1. WHEN Router 觸發聊天室開啟，THE Chat_Panel SHALL 以從右側滑入的 CSS 動畫顯示於畫面右側
2. THE Chat_Panel SHALL 以毛玻璃樣式呈現，覆蓋於 Feed 頁內容之上
3. WHEN 使用者點擊 Chat_Panel 外部區域或關閉按鈕，THE Chat_Panel SHALL 以滑出動畫收回並隱藏
4. THE Chat_Panel SHALL 顯示提示文字「你們都沒救了，不如聊聊吧 💬」作為聊天室開場白
5. WHERE 後端尚未提供 WebSocket 聊天功能，THE Chat_Panel SHALL 僅顯示靜態佔位介面，不實作訊息收發邏輯

---

### 需求 5：頁面導覽

**User Story：** 身為使用者，我想在首頁與投稿頁之間自由切換，方便使用各項功能。

#### 驗收標準

1. THE Router SHALL 提供首頁（Feed）與投稿頁（Post）之間的頁面切換功能
2. WHEN 使用者點擊導覽列中的「投稿」連結，THE Router SHALL 切換至 Post_Page 並隱藏 Feed_Page
3. WHEN 使用者點擊導覽列中的「首頁」連結，THE Router SHALL 切換至 Feed_Page 並隱藏 Post_Page
4. THE 導覽列 SHALL 以像素風樣式呈現，並固定於畫面頂部
5. WHEN 使用者切換頁面，THE Router SHALL 更新瀏覽器網址列的 hash（例如 `#feed`、`#post`），使瀏覽器上下頁功能可正常運作

---

### 需求 6：統一頭像顯示

**User Story：** 身為使用者，我希望所有慘事都使用統一的「醜萌垃圾桶」頭像，維持匿名性。

#### 驗收標準

1. THE Story_Card SHALL 顯示統一的「醜萌垃圾桶」像素風頭像圖示，不顯示任何使用者個人資訊
2. THE Post_Page SHALL 在送出成功後顯示相同的「醜萌垃圾桶」頭像，確認匿名身份
3. THE 頭像圖示 SHALL 以像素風（Pixel Art）CSS 或 SVG 方式實作，不依賴外部圖片資源

---

### 需求 7：視覺風格一致性

**User Story：** 身為使用者，我希望整個網站的視覺風格統一，帶來沉浸式的「比慘」體驗。

#### 驗收標準

1. THE 全站樣式 SHALL 採用深色背景搭配毛玻璃卡片的視覺層次，主色調為深紫色或深藍色系
2. THE 所有互動按鈕 SHALL 以像素風樣式呈現，包含像素邊框與 hover 時的像素位移效果
3. THE 全站字型 SHALL 使用等寬字型（monospace）或像素風字型，強化像素藝術氛圍
4. WHEN 頁面初次載入，THE 頁面 SHALL 顯示口號文字「大家都沒救了，不如就在一起吧。」
