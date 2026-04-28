# Task 2.3 Implementation Summary

## Task Description
實作 `GET /api/chat-rooms/{chat_room_id}/messages` 端點

## Implementation Details

### Endpoint Specification
- **URL**: `/api/chat-rooms/<int:chat_room_id>/messages`
- **Method**: `GET`
- **Query Parameters**:
  - `since` (optional): ISO 8601 timestamp to filter messages created after this time

### Response Format

#### Success (200 OK)
```json
{
  "messages": [
    {
      "id": 1,
      "sender_story_id": 123,
      "content": "訊息內容",
      "created_at": "2025-01-15 10:00:00"
    }
  ]
}
```

#### Error Responses
- **404 Not Found**: Chat room doesn't exist
  ```json
  {
    "message": "聊天室不存在"
  }
  ```

- **400 Bad Request**: Invalid `since` parameter format
  ```json
  {
    "message": "since 參數格式錯誤"
  }
  ```

### Implementation Features

1. **Chat Room Validation**: Verifies that the chat_room_id exists before querying messages
2. **Optional Filtering**: Supports `since` query parameter to retrieve only new messages
3. **Ascending Order**: Messages are sorted by `created_at` in ascending order
4. **Error Handling**: Proper HTTP status codes for different error scenarios

### Code Location
- **File**: `backend/app.py`
- **Function**: `get_messages(chat_room_id)`
- **Lines**: ~215-270

### Database Query
```sql
-- Without since parameter
SELECT id, sender_story_id, content, created_at 
FROM messages 
WHERE chat_room_id = ? 
ORDER BY created_at ASC

-- With since parameter
SELECT id, sender_story_id, content, created_at 
FROM messages 
WHERE chat_room_id = ? AND created_at > ? 
ORDER BY created_at ASC
```

## Testing

### Unit Tests
Created 6 comprehensive unit tests in `backend/test_chat_rooms.py`:

1. ✅ `test_get_messages_nonexistent_chat_room` - Verifies 404 error for non-existent chat room
2. ✅ `test_get_messages_empty_chat_room` - Verifies empty messages list for new chat room
3. ✅ `test_get_messages_with_messages` - Verifies messages are returned in ascending order
4. ✅ `test_get_messages_with_since_parameter` - Verifies `since` parameter filters correctly
5. ✅ `test_get_messages_with_invalid_since_format` - Verifies error handling for invalid format
6. ✅ `test_get_messages_since_with_no_new_messages` - Verifies empty result when no new messages

**Test Results**: All 12 tests in `test_chat_rooms.py` pass (6 new + 6 existing)

### Manual Testing
Created `backend/manual_test_get_messages.py` for integration testing with live server:

1. ✅ Get all messages from a chat room
2. ✅ Get messages with `since` parameter filtering
3. ✅ Handle non-existent chat room (404 error)

**Manual Test Results**: All tests passed successfully

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 9.5**: Provides API endpoint to retrieve all messages for a given chat room ordered by created_at
- **Requirement 10.2**: Implements GET endpoint at `/api/chat-rooms/{chat_room_id}/messages`
- **Requirement 3.2**: Backend returns all messages since the last retrieved timestamp (via `since` parameter)

## Usage Example

### Get All Messages
```bash
curl http://localhost:5000/api/chat-rooms/1/messages
```

### Get Messages Since Timestamp
```bash
curl "http://localhost:5000/api/chat-rooms/1/messages?since=2025-01-15%2010:00:00"
```

### Frontend Integration
```javascript
// Using fetchClient (to be implemented in Task 3)
const result = await fetchClient.getMessages(chatRoomId, since);
if (result.ok) {
  const messages = result.data.messages;
  // Process messages...
}
```

## Next Steps

This endpoint is ready for frontend integration in Task 3 (擴充前端 fetchClient 模組) and Task 4 (實作前端聊天室模組).

The polling mechanism (Task 4.3) will use the `since` parameter to efficiently retrieve only new messages every 3 seconds.

## Files Modified
- ✅ `backend/app.py` - Added `get_messages()` endpoint
- ✅ `backend/test_chat_rooms.py` - Added 6 unit tests
- ✅ `backend/manual_test_get_messages.py` - Created manual test script
- ✅ `backend/TASK_2.3_IMPLEMENTATION_SUMMARY.md` - This summary document
