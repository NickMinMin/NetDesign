/**
 * fetchClient.js
 * 統一處理 API 請求的模組
 */

const API_BASE_URL =
  window.API_BASE_URL || 'https://netdesign.onrender.com';

async function request(url, options = {}) {
  const fullUrl = url.startsWith('http')
    ? url
    : `${API_BASE_URL.replace(/\/$/, '')}${
        url.startsWith('/') ? url : '/' + url
      }`;

  try {
    const response = await fetch(fullUrl, options);

    let data = null;

    try {
      data = await response.json();
    } catch (e) {}

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
  async getRandomStory() {
    return request('/api/stories/random');
  },

  async postStory(content) {
    return request('/api/stories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });
  },

  async patStory(storyId) {
    return request(`/api/stories/${storyId}/pat`, {
      method: 'PUT'
    });
  },

  async getChatRoomId(storyId) {
    return request('/api/chat-rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        story_id: storyId
      })
    });
  },

  async getMessages(chatRoomId, since = null) {
    let url = `/api/chat-rooms/${chatRoomId}/messages`;

    if (since) {
      url += `?since=${encodeURIComponent(since)}`;
    }

    return request(url);
  },

  async sendMessage(chatRoomId, senderStoryId, content) {
    const token =
      localStorage.getItem(
        `story_token_${senderStoryId}`
      ) || '';

    return request(
      `/api/chat-rooms/${chatRoomId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sender_story_id: senderStoryId,
          content
        })
      }
    );
  },

  async getStoryOwner(storyId) {
    return request(`/api/stories/${storyId}/owner`);
  },

  async getRandomPair() {
    return request('/api/stories/random-pair');
  },

  async voteStory(storyId, opponentId) {
    const token = localStorage.getItem('trashmatch_auth_token') || '';
    return request(
      `/api/stories/${storyId}/vote?opponent_id=${opponentId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
  },

  async getLeaderboard() {
    return request('/api/leaderboard');
  }
};