/**
 * fetchClient.js
 * 統一處理 API 請求的模組
 */

const API_BASE_URL =
  window.API_BASE_URL || 'https://netdesign.onrender.com';

/**
 * 核心基礎請求函式
 */
async function request(url, options = {}) {
  const fullUrl = url.startsWith('http')
    ? url
    : `${API_BASE_URL.replace(/\/$/, '')}${
        url.startsWith('/') ? url : '/' + url
      }`;

  // 初始化 headers 物件，確保不為空
  options.headers = options.headers || {};

  // 1. 如果有傳送 Body 且非 FormData，自動幫前端補上 Content-Type
  if (options.body && !(options.body instanceof FormData) && !options.headers['Content-Type']) {
    options.headers['Content-Type'] = 'application/json';
  }

  // 2. 全域身份憑證自動攔截 (處理投票與需要 JWT 帳號身分的 API)
  // 如果外部沒有特別覆蓋 Authorization，則預設帶上登入帳號的 JWT token
  if (!options.headers['Authorization']) {
    const defaultJwt = localStorage.getItem('trashmatch_auth_token') || '';
    if (defaultJwt) {
      options.headers['Authorization'] = `Bearer ${defaultJwt}`;
    }
  }

  try {
    const response = await fetch(fullUrl, options);
    let data = null;

    try {
      data = await response.json();
    } catch (e) {
      // 避免後端回傳空回應時解析 JSON 噴錯
    }

    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    console.error(`API Error: ${fullUrl}`, error);
    return {
      ok: false,
      status: 0,
      data: null
    };
  }
}

export const fetchClient = {
  /**
   * 隨機撈取一則慘事
   */
  async getRandomStory() {
    return request('/api/stories/random');
  },

  /**
   * 投稿新慘事
   */
  async postStory(content) {
    return request('/api/stories', {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  },

  /**
   * 幫慘事拍拍
   */
  async patStory(storyId) {
    return request(`/api/stories/${storyId}/pat`, {
      method: 'PUT'
    });
  },

  /**
   * 建立或解鎖聊天室 (由慘事 ID 觸找)
   */
  async getChatRoomId(storyId) {
    return request('/api/chat-rooms', {
      method: 'POST',
      body: JSON.stringify({
        story_id: Number(storyId) // 強制轉數字確保後端 SQLite 讀取正確
      })
    });
  },

  /**
   * 撈取聊天室訊息列表 (支援 since 增量輪詢)
   */
  async getMessages(chatRoomId, since = null) {
    let url = `/api/chat-rooms/${chatRoomId}/messages`;
    if (since) {
      url += `?since=${encodeURIComponent(since)}`;
    }
    return request(url);
  },

  /**
   * 傳送聊天訊息
   * @param {Object} customOptions 用於接收從 chat.js 傳過來覆蓋 Authorization 的專屬故事 UUID token
   */
  async sendMessage(chatRoomId, senderStoryId, content, customOptions = {}) {
    // 預設先抓這篇慘事專屬的 token
    const token = localStorage.getItem(`story_token_${senderStoryId}`) || '';

    // 合併設定檔：允許外部傳入的 customOptions (包含 headers) 進行覆蓋
    const defaultOptions = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        sender_story_id: Number(senderStoryId), // 轉成數字對齊後端 SQLite 型態
        content
      })
    };

    // 深度合併複寫 headers，防止傳入的 customOptions 被洗掉
    const mergedOptions = {
      ...defaultOptions,
      ...customOptions,
      headers: {
        ...defaultOptions.headers,
        ...(customOptions.headers || {})
      }
    };

    return request(`/api/chat-rooms/${chatRoomId}/messages`, mergedOptions);
  },

  /**
   * 獲取慘事作者的匿名代號
   */
  async getStoryOwner(storyId) {
    return request(`/api/stories/${storyId}/owner`);
  },

  /**
   * 獲取一組慘事對決組合 (大亂鬥)
   */
  async getRandomPair() {
    return request('/api/stories/random-pair');
  },

  /**
   * 慘事對決投票
   */
  async voteStory(storyId, opponentId) {
    // 底層 request() 會自動補上 trashmatch_auth_token (JWT)
    return request(
      `/api/stories/${storyId}/vote?opponent_id=${opponentId}`,
      {
        method: 'POST'
      }
    );
  },

  /**
   * 獲取慘度排行榜 (前10名)
   */
  async getLeaderboard() {
    // 精準對齊後端全小寫的 /api/leaderboard 端點，完美解決大寫 B 導致的 404 錯誤
    return request('/api/leaderboard', {
      method: 'GET'
    });
  }
};