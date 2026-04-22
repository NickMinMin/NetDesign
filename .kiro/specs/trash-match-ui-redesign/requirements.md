# 需求文件：衰鬼回收站 UI/UX 重設計

## 簡介

本次重設計針對「衰鬼回收站 TrashMatch」前端的視覺風格與使用者體驗進行全面升級。
目標是在保留現有毛玻璃（Glassmorphism）與像素風（Pixel Art）混搭基調的前提下，
讓整體風格更搞怪（quirky）、更可愛（cute），並大幅提升現有圖片資源（trash.png、heart.png、cards.png、chat.png）的視覺存在感。

現有技術棧：HTML/CSS/Vanilla JavaScript（無框架），圖片資源位於 `frontend/images/`。

---

## 詞彙表

- **Hero_Image**：頁面頂部的主視覺大圖，目前為 `cards.png`，尺寸需顯著放大
- **Avatar_Image**：慘事卡片與投稿成功後顯示的垃圾桶頭像，使用 `trash.png`
- **Pat_Icon**：拍拍按鈕內的愛心圖示，使用 `heart.png`
- **Chat_Image**：聊天室佔位介面的插圖，使用 `chat.png`
- **Quirky_Style**：搞怪風格，指不對稱排版、誇張動畫、意外的顏色跳色、幽默文案等視覺手法
- **Cute_Style**：可愛風格，指圓潤造型、柔和色調點綴、彈跳動畫、表情符號裝飾等視覺手法
- **Pixel_Wobble**：像素風搖晃動畫，元素以 2–4px 的像素步進做週期性位移
- **Story_Card**：展示單則慘事內容與拍拍數的毛玻璃卡片元件
- **Pat_Button**：觸發拍拍互動的像素風按鈕
- **Chat_Panel**：配對成功後從右側滑入的聊天室面板
- **CSS_Token**：`base.css` 中以 CSS 自訂屬性（Custom Properties）定義的設計變數

---

## 需求

### 需求 1：Hero_Image 放大與強化

**User Story：** 身為使用者，我想在首頁看到一個超大、超搶眼的主視覺圖片，讓我一進來就感受到這個平台的搞怪氣氛。

#### 驗收標準

1. THE Hero_Image SHALL 在桌面版（viewport 寬度 ≥ 768px）顯示寬度不小於 320px
2. THE Hero_Image SHALL 在行動版（viewport 寬度 < 768px）顯示寬度不小於 240px
3. WHEN 頁面載入完成，THE Hero_Image SHALL 播放一次向上彈跳的進場動畫（bounce-in），動畫時長為 0.6s
4. THE Hero_Image SHALL 套用紫色光暈效果（`drop-shadow`），光暈半徑不小於 20px
5. THE Hero_Image SHALL 保持 `image-rendering: pixelated` 以維持像素風清晰度

---

### 需求 2：Avatar_Image 放大與搖晃動畫

**User Story：** 身為使用者，我想看到更大、更有個性的垃圾桶頭像，讓每則慘事都有一個搞怪的「臉」。

#### 驗收標準

1. THE Avatar_Image 在 Story_Card 內的顯示尺寸 SHALL 不小於 64px × 64px（現行為 48px）
2. THE Avatar_Image 在投稿成功後的顯示尺寸 SHALL 不小於 96px × 96px（現行為 64px）
3. WHEN 使用者將滑鼠懸停於 Story_Card 上，THE Avatar_Image SHALL 播放 Pixel_Wobble 動畫，動畫週期為 0.4s
4. THE Avatar_Image SHALL 保持 `image-rendering: pixelated` 以維持像素風清晰度
5. WHEN 投稿成功，THE Avatar_Image SHALL 播放一次彈跳動畫（bounce），動畫時長為 0.5s

---

### 需求 3：Pat_Icon 放大與互動動畫

**User Story：** 身為使用者，我想看到更大、更可愛的愛心圖示，讓拍拍這個動作更有儀式感。

#### 驗收標準

1. THE Pat_Icon 在 Pat_Button 內的顯示尺寸 SHALL 不小於 1.8rem × 1.8rem（現行為 1.2rem）
2. WHEN 使用者點擊 Pat_Button，THE Pat_Icon SHALL 播放一次放大後縮回的脈衝動畫（pulse），動畫時長為 0.3s
3. WHEN 使用者將滑鼠懸停於 Pat_Button 上，THE Pat_Icon SHALL 輕微旋轉（±15 度），過渡時長為 0.2s
4. THE Pat_Icon SHALL 保持 `image-rendering: pixelated` 以維持像素風清晰度

---

### 需求 4：Chat_Image 放大與強化

**User Story：** 身為使用者，我想在聊天室佔位介面看到更大的插圖，讓等待感覺不那麼無聊。

#### 驗收標準

1. THE Chat_Image 在 Chat_Panel 佔位介面的顯示寬度 SHALL 不小於 200px（現行為 140px）
2. WHEN Chat_Panel 滑入完成後，THE Chat_Image SHALL 播放一次彈跳動畫，動畫時長為 0.5s，延遲 0.35s（等待滑入動畫結束）
3. THE Chat_Image SHALL 套用紫色光暈效果（`drop-shadow`），光暈半徑不小於 12px
4. THE Chat_Image SHALL 保持 `image-rendering: pixelated` 以維持像素風清晰度

---

### 需求 5：搞怪色彩點綴

**User Story：** 身為使用者，我想看到更有個性的配色，讓整個網站不只是「深紫色」，而是有更多意外的顏色跳出來。

#### 驗收標準

1. THE CSS_Token SHALL 新增至少兩個搞怪點綴色，包含一個螢光黃綠色（建議 `#b5ff4d`）與一個亮粉紅色（建議 `#ff6eb4`）
2. THE Pat_Button SHALL 在 hover 狀態下，邊框顏色切換為亮粉紅色點綴色，過渡時長為 0.15s
3. THE Story_Card 在 hover 狀態下，光暈顏色 SHALL 混入亮粉紅色點綴色（`box-shadow` 調整）
4. THE 口號文字（slogan）SHALL 以螢光黃綠色點綴色顯示，取代現行的 `--color-text-muted`
5. WHERE 使用者的作業系統偏好設定為 `prefers-reduced-motion: reduce`，THE 全站動畫 SHALL 停用所有非必要動畫，僅保留顏色過渡效果

---

### 需求 6：可愛圓潤化

**User Story：** 身為使用者，我想看到更圓潤、更可愛的卡片與按鈕造型，讓整體感覺不那麼稜角分明。

#### 驗收標準

1. THE Story_Card 的圓角半徑（`border-radius`）SHALL 不小於 20px（現行為 12px）
2. THE Post_Form_Wrapper 的圓角半徑 SHALL 不小於 20px（現行為 12px）
3. THE pixel-btn 的圓角半徑 SHALL 不小於 8px（現行為 0px，純像素風直角）
4. THE Chat_Panel 在行動版的圓角半徑 SHALL 不小於 24px（現行為 12px）
5. THE Story_Card__content 的行高（`line-height`）SHALL 不小於 2.0（現行為 1.8），增加可讀性與呼吸感

---

### 需求 7：搞怪文案強化

**User Story：** 身為使用者，我想看到更有個性、更幽默的介面文案，讓整個平台的「比慘」氛圍更到位。

#### 驗收標準

1. THE Post_Page 的 placeholder 文字 SHALL 更新為「說說你有多慘… 越慘越好 🗑️」
2. THE Post_Page 的送出按鈕文字 SHALL 更新為「🗑️ 我也沒救了，送出」（加入垃圾桶 emoji）
3. THE Feed_Page 的「換一則」按鈕文字 SHALL 更新為「再看一個慘的 👀」
4. THE Chat_Panel 的開場白文字 SHALL 更新為「你們都沒救了，不如聊聊吧 💬✨」（加入閃爍 emoji）
5. THE 導覽列品牌名稱 SHALL 保持「🗑️ TrashMatch」，並在 hover 時顯示 Pixel_Wobble 動畫

---

### 需求 8：整體動畫節奏統一

**User Story：** 身為使用者，我希望整個網站的動畫感覺一致，不會有些地方很生硬、有些地方又太誇張。

#### 驗收標準

1. THE CSS_Token SHALL 新增動畫時長變數：`--anim-fast: 0.15s`、`--anim-normal: 0.3s`、`--anim-slow: 0.6s`
2. THE 全站所有 hover 過渡效果 SHALL 統一使用 `--anim-fast`（0.15s）
3. THE 全站所有點擊回饋動畫 SHALL 統一使用 `--anim-normal`（0.3s）
4. THE 全站所有進場動畫 SHALL 統一使用 `--anim-slow`（0.6s）
5. IF 動畫播放中使用者再次觸發同一動畫，THEN THE 動畫 SHALL 重置並重新播放，不累積疊加

