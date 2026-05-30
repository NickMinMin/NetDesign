/**
 * main.js — 應用程式進入點
 * 初始化所有模組，啟動衰鬼回收站 TrashMatch 前端應用程式
 */

import { router } from './router.js'
import { feed } from './feed.js'
import { post } from './post.js'
import { chat } from './chat.js'
import { initSession } from './session.js'
import { auth } from './auth.js'
import { vote } from './vote.js'
import { leaderboard } from './leaderboard.js'

// 初始化匿名代號系統（取得/建立代號並顯示在導覽列）
initSession()

// 初始化帳號系統（更新導覽列登入狀態、綁定登入/註冊/登出表單事件）
auth.init()

// 初始化路由（含初始頁面切換，根據 hash 決定顯示 Feed 頁或 Post 頁）
router.init()

// 初始化 Feed 頁（載入第一則慘事、綁定換一則與拍拍按鈕）
feed.init()

// 初始化 Post 頁（綁定表單送出事件）
post.init()

// 初始化 Chat 面板（綁定關閉按鈕與外部點擊事件）
chat.init()

// 初始化投票對決頁（監聽 hashchange，載入隨機對決組）
vote.init()

// 初始化慘度排行榜頁（監聽 hashchange，載入排行榜）
leaderboard.init()
