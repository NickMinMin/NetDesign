# Requirements Document

## Introduction

本文件定義「魯蛇回收站」（TrashMatch）專案中開發者 C 負責的功能需求。開發者 C 的職責範圍包括：互動機制實作（累積 3 個拍拍解鎖聊天室）、聊天室開發、文案系統、系統整合測試，以及預期成果文件撰寫。

「魯蛇回收站」是一個零門檻的匿名「比慘」交友平台，用幽默與自黑取代外貌焦慮。核心口號：「大家都沒救了，不如就在一起吧。」

技術架構：
- 前端：HTML/CSS/JavaScript
- 後端：Python Flask + SQLite
- 已有功能：匿名投稿系統、隨機推播慘事

## Glossary

- **System**: 整個「魯蛇回收站」應用程式（前端 + 後端）
- **Backend**: Python Flask 後端伺服器
- **Frontend**: HTML/CSS/JavaScript 前端應用程式
- **Story**: 使用者投稿的慘事內容
- **Pat**: 使用者對慘事的「拍拍」互動（表示同情或共鳴）
- **Chat_Room**: 當兩個使用者互相拍拍對方的慘事且累積滿 3 個拍拍時解鎖的對話視窗
- **Match**: 兩個使用者因互動而解鎖聊天室的配對狀態
- **Message**: 聊天室中的訊息
- **Error_Message**: 系統錯誤或防呆提示的文案
- **Humorous_Copy**: 系統內的搞笑文案（如 404 頁面、空狀態提示等）
- **Integration_Test**: 驗證完整流程（發文 → 拍拍 → 聊天）的測試
- **Expected_Outcome_Document**: 描述專案預期成果、亮點與未來擴展性的文件

## Requirements

### Requirement 1: 拍拍累積解鎖聊天室邏輯

**User Story:** 作為使用者，我想要在累積 3 個拍拍後解鎖聊天室，這樣我就能與有共鳴的人開始對話。

#### Acceptance Criteria

1. WHEN a Story receives its third Pat, THE Backend SHALL mark the Story as eligible for Chat_Room unlock
2. WHEN a Story is marked as eligible for Chat_Room unlock, THE Backend SHALL return a match_unlocked flag set to true in the API response
3. WHEN the Frontend receives a match_unlocked flag set to true, THE Frontend SHALL display the Chat_Room interface
4. THE Backend SHALL persist the Pat count for each Story in the database
5. WHEN a Story has fewer than 3 Pats, THE System SHALL NOT unlock the Chat_Room

### Requirement 2: 聊天室介面開發

**User Story:** 作為使用者，我想要有一個簡易的聊天室介面，這樣我就能與配對成功的人交流。

#### Acceptance Criteria

1. WHEN a Chat_Room is unlocked, THE Frontend SHALL display a chat panel with a message input field and a message display area
2. THE Frontend SHALL display a greeting message indicating successful Match when the Chat_Room opens
3. WHEN a user types a Message and submits it, THE Frontend SHALL send the Message to the Backend
4. THE Backend SHALL store the Message in the database with a timestamp and sender identifier
5. THE Frontend SHALL display all Messages in chronological order in the message display area

### Requirement 3: 訊息更新機制（輪詢）

**User Story:** 作為使用者，我想要看到對方發送的新訊息，這樣我就能進行即時對話。

#### Acceptance Criteria

1. WHEN a Chat_Room is open, THE Frontend SHALL poll the Backend for new Messages every 3 seconds
2. WHEN the Backend receives a polling request, THE Backend SHALL return all Messages since the last retrieved timestamp
3. WHEN new Messages are received, THE Frontend SHALL append them to the message display area
4. WHEN the Chat_Room is closed, THE Frontend SHALL stop polling for new Messages
5. THE Frontend SHALL display a loading indicator during the initial Message fetch

### Requirement 4: 聊天室關閉與重新開啟

**User Story:** 作為使用者，我想要能夠關閉和重新開啟聊天室，這樣我就能控制介面的顯示狀態。

#### Acceptance Criteria

1. WHEN a user clicks the close button, THE Frontend SHALL hide the Chat_Room panel
2. WHEN the Chat_Room is closed, THE Frontend SHALL preserve the Match state
3. WHEN a user navigates to a matched Story, THE Frontend SHALL display a button to reopen the Chat_Room
4. WHEN a user clicks the reopen button, THE Frontend SHALL display the Chat_Room panel with all previous Messages
5. THE Frontend SHALL maintain the Chat_Room state across page navigation within the single-page application

### Requirement 5: 防呆提示文案系統

**User Story:** 作為使用者，我想要看到清楚的錯誤提示，這樣我就能理解系統狀態並知道如何操作。

#### Acceptance Criteria

1. WHEN a user submits an empty Story, THE System SHALL display the Error_Message "送出失敗，你的慘事暫時無人接收"
2. WHEN a user attempts to Pat a non-existent Story, THE System SHALL display the Error_Message "拍拍失敗，請稍後再試"
3. WHEN no Stories are available, THE System SHALL display the Error_Message "目前沒有慘事，快去投稿吧！"
4. WHEN a Message fails to send, THE System SHALL display the Error_Message "訊息送出失敗，你的話語迷失在虛空中"
5. WHEN the Chat_Room fails to load, THE System SHALL display the Error_Message "聊天室載入失敗，連系統都放棄你了"

### Requirement 6: 搞笑文案系統

**User Story:** 作為使用者，我想要看到幽默的系統文案，這樣我就能在使用過程中感到輕鬆愉快。

#### Acceptance Criteria

1. WHEN a user navigates to a non-existent page (404 error), THE System SHALL display the Humorous_Copy "你的運氣跟這個網頁一樣，都不存在"
2. WHEN a Chat_Room is first unlocked, THE System SHALL display the Humorous_Copy "💘 配對成功！你們都沒救了"
3. WHEN a Chat_Room has no Messages yet, THE System SHALL display the Humorous_Copy "你們都沒救了，不如聊聊吧 💬✨"
4. WHEN a user successfully submits a Story, THE System SHALL display the Humorous_Copy "你的慘事已送達垃圾桶，等待有緣衰鬼"
5. WHEN the system is loading, THE System SHALL display the Humorous_Copy "載入中… 🗑️"

### Requirement 7: 系統整合測試

**User Story:** 作為開發者，我想要執行完整的整合測試，這樣我就能確保「發文 → 拍拍 → 聊天」流程正常運作。

#### Acceptance Criteria

1. THE Integration_Test SHALL verify that a user can successfully submit a Story
2. THE Integration_Test SHALL verify that a Story can receive Pats and the Pat count increments correctly
3. THE Integration_Test SHALL verify that a Chat_Room unlocks when a Story receives 3 Pats
4. THE Integration_Test SHALL verify that users can send and receive Messages in an unlocked Chat_Room
5. THE Integration_Test SHALL verify that all Error_Messages display correctly under error conditions
6. THE Integration_Test SHALL verify that the Frontend correctly handles Backend API failures
7. THE Integration_Test SHALL verify that the polling mechanism retrieves new Messages without errors

### Requirement 8: 預期成果文件撰寫

**User Story:** 作為專案負責人，我想要有一份預期成果文件，這樣我就能向利害關係人說明專案價值與未來發展。

#### Acceptance Criteria

1. THE Expected_Outcome_Document SHALL include a summary of the project's key features and unique value proposition
2. THE Expected_Outcome_Document SHALL describe user interaction scenarios after the product launches
3. THE Expected_Outcome_Document SHALL outline potential future enhancements and scalability considerations
4. THE Expected_Outcome_Document SHALL highlight the humorous and self-deprecating tone as a core differentiator
5. THE Expected_Outcome_Document SHALL be written in Traditional Chinese and formatted in Markdown

### Requirement 9: 聊天室資料模型

**User Story:** 作為開發者，我想要有清楚的資料模型，這樣我就能正確儲存和查詢聊天室相關資料。

#### Acceptance Criteria

1. THE Backend SHALL create a database table for Chat_Room with fields: id, story_id_1, story_id_2, created_at
2. THE Backend SHALL create a database table for Message with fields: id, chat_room_id, sender_story_id, content, created_at
3. WHEN a Chat_Room is unlocked, THE Backend SHALL create a new Chat_Room record linking the two Stories
4. WHEN a Message is sent, THE Backend SHALL store the Message with the correct chat_room_id and sender_story_id
5. THE Backend SHALL provide an API endpoint to retrieve all Messages for a given Chat_Room ordered by created_at

### Requirement 10: 聊天室 API 端點

**User Story:** 作為前端開發者，我想要有清楚的 API 端點，這樣我就能與後端進行聊天室相關的資料交換。

#### Acceptance Criteria

1. THE Backend SHALL provide a POST endpoint at /api/chat-rooms to create a new Chat_Room
2. THE Backend SHALL provide a GET endpoint at /api/chat-rooms/{chat_room_id}/messages to retrieve all Messages for a Chat_Room
3. THE Backend SHALL provide a POST endpoint at /api/chat-rooms/{chat_room_id}/messages to send a new Message
4. WHEN a request to create a Chat_Room is received, THE Backend SHALL validate that both Stories exist
5. WHEN a request to send a Message is received, THE Backend SHALL validate that the Chat_Room exists and the sender is authorized
6. THE Backend SHALL return appropriate HTTP status codes (200, 201, 400, 404) for all API responses

