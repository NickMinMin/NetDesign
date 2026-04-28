# 整合測試指南 (Integration Test Guide)

本文件說明如何執行「魯蛇回收站」專案的整合測試，包括自動化測試腳本與手動測試清單。

**Validates**: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7

---

## 📋 測試概覽

本專案提供兩種測試方式：

1. **自動化整合測試** (`backend/test_integration_complete_flow.py`)
   - 使用 pytest 執行
   - 測試後端 API 與資料庫整合
   - 涵蓋 4 個核心測試案例

2. **手動測試清單** (`MANUAL_TEST_CHECKLIST.md`)
   - 端到端 (E2E) 測試
   - 測試前端 + 後端完整流程
   - 包含 UI/UX、響應式設計、跨瀏覽器測試

---

## 🚀 快速開始

### 1. 執行自動化整合測試

```bash
# 安裝測試依賴（如果尚未安裝）
pip install pytest

# 執行所有整合測試
pytest backend/test_integration_complete_flow.py -v -s

# 執行特定測試案例
pytest backend/test_integration_complete_flow.py::test_case_1_complete_matching_flow -v -s
pytest backend/test_integration_complete_flow.py::test_case_2_polling_mechanism -v -s
pytest backend/test_integration_complete_flow.py::test_case_3_error_handling -v -s
pytest backend/test_integration_complete_flow.py::test_case_4_chat_room_persistence -v -s
```

**參數說明**:
- `-v`: 顯示詳細測試資訊
- `-s`: 顯示 print 輸出（用於查看測試步驟）

### 2. 執行手動測試

1. 開啟 `MANUAL_TEST_CHECKLIST.md`
2. 啟動後端伺服器：`python backend/app.py`
3. 開啟前端：在瀏覽器中開啟 `frontend/index.html` 或 `http://localhost:5000`
4. 依照清單逐項測試

---

## 📊 測試案例說明

### 測試案例 1：完整配對流程（發文 → 拍拍 → 聊天）

**目標**: 驗證使用者可以完成從投稿到聊天的完整流程

**測試內容**:
- 投稿慘事
- 拍拍 3 次解鎖聊天室
- 發送訊息
- 取得訊息列表

**自動化測試**:
```bash
pytest backend/test_integration_complete_flow.py::test_case_1_complete_matching_flow -v -s
```

**手動測試**: 參考 `MANUAL_TEST_CHECKLIST.md` 測試案例 1

---

### 測試案例 2：輪詢機制（新訊息自動更新）

**目標**: 驗證聊天室可以自動更新新訊息（每 3 秒輪詢）

**測試內容**:
- 建立聊天室並發送訊息
- 使用 `since` 參數輪詢新訊息
- 驗證只回傳新訊息
- 驗證訊息按時間排序

**自動化測試**:
```bash
pytest backend/test_integration_complete_flow.py::test_case_2_polling_mechanism -v -s
```

**手動測試**: 參考 `MANUAL_TEST_CHECKLIST.md` 測試案例 2
- 需要開啟兩個瀏覽器視窗
- 驗證訊息在兩個視窗間自動同步

---

### 測試案例 3：錯誤處理（網路錯誤、驗證錯誤）

**目標**: 驗證系統正確處理各種錯誤情況

**測試內容**:
- 404 錯誤：不存在的資源
- 400 錯誤：驗證失敗（空白訊息、超長訊息、pat_count 不足）
- 網路錯誤：API 請求失敗

**自動化測試**:
```bash
pytest backend/test_integration_complete_flow.py::test_case_3_error_handling -v -s
```

**手動測試**: 參考 `MANUAL_TEST_CHECKLIST.md` 測試案例 3
- 需要手動關閉後端伺服器測試網路錯誤

---

### 測試案例 4：聊天室持久化（關閉後重新開啟）

**目標**: 驗證聊天室狀態在關閉後可以恢復

**測試內容**:
- 建立聊天室並發送訊息
- 模擬關閉聊天室
- 重新開啟聊天室
- 驗證訊息歷史保留
- 驗證可繼續發送新訊息

**自動化測試**:
```bash
pytest backend/test_integration_complete_flow.py::test_case_4_chat_room_persistence -v -s
```

**手動測試**: 參考 `MANUAL_TEST_CHECKLIST.md` 測試案例 4
- 測試多次開啟關閉
- 測試頁面重新整理
- 測試關閉瀏覽器後重新開啟

---

## 🔧 測試環境設定

### 前置需求

- Python 3.7+
- pytest
- Flask
- SQLite3

### 安裝依賴

```bash
# 後端依賴
pip install -r backend/requirements.txt

# 測試依賴
pip install pytest
```

### 資料庫初始化

```bash
# 初始化資料庫（如果尚未初始化）
python backend/init_db.py
```

### 啟動伺服器

```bash
# 啟動後端伺服器
python backend/app.py

# 伺服器將運行在 http://localhost:5000
```

---

## 📝 測試報告

### 自動化測試報告

執行測試後，pytest 會自動生成測試報告：

```
======================== test session starts =========================
collected 4 items

backend/test_integration_complete_flow.py::test_case_1_complete_matching_flow PASSED
backend/test_integration_complete_flow.py::test_case_2_polling_mechanism PASSED
backend/test_integration_complete_flow.py::test_case_3_error_handling PASSED
backend/test_integration_complete_flow.py::test_case_4_chat_room_persistence PASSED

========================= 4 passed in 2.34s ==========================
```

### 手動測試報告

手動測試完成後，請填寫 `MANUAL_TEST_CHECKLIST.md` 中的「測試結果記錄」區塊：

- 測試環境資訊
- 測試結果摘要
- 發現的問題
- 總結

---

## 🐛 常見問題 (Troubleshooting)

### 問題 1: 測試失敗 - 資料庫鎖定

**錯誤訊息**: `sqlite3.OperationalError: database is locked`

**解決方法**:
1. 確保後端伺服器未運行（測試會使用獨立的測試資料庫）
2. 刪除 `test_loser.db` 檔案
3. 重新執行測試

### 問題 2: 測試失敗 - 模組找不到

**錯誤訊息**: `ModuleNotFoundError: No module named 'app'`

**解決方法**:
1. 確保在專案根目錄執行測試
2. 或設定 PYTHONPATH：
   ```bash
   export PYTHONPATH="${PYTHONPATH}:$(pwd)"
   pytest backend/test_integration_complete_flow.py -v -s
   ```

### 問題 3: 手動測試 - 聊天室未開啟

**可能原因**:
1. 拍拍數未達到 3
2. JavaScript 錯誤（檢查瀏覽器 Console）
3. API 請求失敗（檢查 Network 標籤）

**解決方法**:
1. 開啟瀏覽器開發者工具
2. 檢查 Console 是否有錯誤訊息
3. 檢查 Network 標籤，確認 API 請求成功
4. 確認後端伺服器運行中

### 問題 4: 輪詢機制未運作

**可能原因**:
1. 輪詢計時器未啟動
2. API 請求失敗
3. 前端 JavaScript 錯誤

**解決方法**:
1. 開啟瀏覽器 Console，檢查是否有錯誤
2. 開啟 Network 標籤，確認每 3 秒有 API 請求
3. 檢查 `chat.js` 中的 `startPolling()` 函式

---

## 📚 相關文件

- **需求文件**: `.kiro/specs/developer-c-interaction-chat/requirements.md`
- **設計文件**: `.kiro/specs/developer-c-interaction-chat/design.md`
- **任務清單**: `.kiro/specs/developer-c-interaction-chat/tasks.md`
- **手動測試清單**: `MANUAL_TEST_CHECKLIST.md`
- **自動化測試腳本**: `backend/test_integration_complete_flow.py`

---

## 🎯 測試覆蓋率

### 自動化測試覆蓋

| 需求編號 | 需求描述 | 測試案例 | 狀態 |
|---------|---------|---------|------|
| 7.1 | 驗證使用者可以成功投稿慘事 | 測試案例 1 | ✅ |
| 7.2 | 驗證慘事可以接收拍拍且計數正確 | 測試案例 1, 2 | ✅ |
| 7.3 | 驗證聊天室在 3 個拍拍後解鎖 | 測試案例 1 | ✅ |
| 7.4 | 驗證使用者可以在聊天室發送和接收訊息 | 測試案例 1, 4 | ✅ |
| 7.5 | 驗證錯誤訊息正確顯示 | 測試案例 3 | ✅ |
| 7.6 | 驗證前端正確處理後端 API 失敗 | 測試案例 3 | ✅ |
| 7.7 | 驗證輪詢機制正確取得新訊息 | 測試案例 2 | ✅ |

### 手動測試覆蓋

手動測試額外涵蓋：
- UI/UX 測試
- 響應式設計測試
- 跨瀏覽器測試
- 效能測試

---

## 🔄 持續整合 (CI/CD)

### 建議的 CI/CD 流程

1. **每次 commit**:
   - 執行單元測試
   - 執行整合測試

2. **每日**:
   - 執行完整測試套件
   - 生成測試報告

3. **發布前**:
   - 執行所有自動化測試
   - 執行完整手動測試清單
   - 跨瀏覽器測試
   - 效能測試

### GitHub Actions 範例 (可選)

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        pip install -r backend/requirements.txt
        pip install pytest
    
    - name: Run integration tests
      run: |
        pytest backend/test_integration_complete_flow.py -v
```

---

## 📞 聯絡資訊

如有測試相關問題，請聯絡：
- **開發者 C**: [聯絡方式]
- **專案負責人**: [聯絡方式]

---

**文件版本**: 1.0  
**最後更新**: 2025-01-15  
**維護者**: Developer C
