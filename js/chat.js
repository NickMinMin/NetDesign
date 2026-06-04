/**
 * chat.js — Chat 面板邏輯模組
 */

import { router } from './router.js';
import { fetchClient } from './fetchClient.js';
import { renderer } from './renderer.js';

let _controller = null;

export const chatState = {
  chatRoomId: null,
  storyId: null,
  otherNickname: '對方衰鬼', // 對方的匿名代號，解鎖後從 API 取得
  messages: [],
  lastFetchedAt: null,
  pollingTimeoutId: null, // 改為儲存 setTimeout 的 ID
  isPollingActive: false, // 標記輪詢是否應持續進行
  isSending: false,
};

export const chat = {
  init() {
    if (_controller) _controller.abort();
    _controller = new AbortController();
    const signal = _controller.signal;

    const closeBtn = document.getElementById('chat-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => router.closeChat(), { signal });
    }

    document.addEventListener('click', (event) => {
      const panel = document.getElementById('chat-panel');
      const isClickInside = panel && panel.contains(event.target);
      const isClickNav = event.target.closest('.nav-link');
      const isClickPat = event.target.closest('#pat-btn');
      
      if (panel && !panel.classList.contains('hidden') && !isClickInside && !isClickNav && !isClickPat) {
        router.closeChat();
      }
    }, { signal });

    const sendBtn = document.getElementById('chat-send-btn');
    const chatInput = document.getElementById('chat-input');

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        if (chatInput) this.sendMessage(chatInput.value);
      }, { signal });
    }

    if (chatInput) {
      chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          this.sendMessage(chatInput.value);
        }
      }, { signal });
    }
  },

  async open(chatRoomId, storyId = null) {
    // 先停止上一次可能殘留的輪詢
    this.stopPolling();

    chatState.chatRoomId = chatRoomId;
    chatState.messages = [];
    chatState.lastFetchedAt = null;
    chatState.isSending = false;
    chatState.otherNickname = '對方衰鬼';

    // storyId 是被拍的慘事 ID
    // 若我有這則慘事的 story_token → 我是作者，用這個 storyId 發訊息
    // 若沒有 story_token → 我是拍拍者，也用這個 storyId（後端會查 pats 表驗證）
    chatState.storyId = storyId;

    const chatInput = document.getElementById('chat-input');
    if (chatInput) chatInput.value = '';
    renderer.renderEmptyChatState();

    // 查詢對方（慘事作者）的匿名代號
    if (storyId) {
      try {
        const ownerResult = await fetchClient.getStoryOwner(storyId);
        if (ownerResult.ok && ownerResult.data && ownerResult.data.nickname) {
          chatState.otherNickname = ownerResult.data.nickname;
        }
      } catch (e) {
        console.error('Failed to get story owner:', e);
      }
    }

    // 啟用安全輪詢
    chatState.isPollingActive = true;
    await this.startPollingLoop();
  },

  /**
   * 遞迴式安全輪詢機制：避免非同步請求重疊，防止崩潰
   */
  async startPollingLoop() {
    if (!chatState.isPollingActive || !chatState.chatRoomId) return;

    await this.pollMessages();

    // 前一次請求徹底完成後，才倒數 3 秒發起下一次請求
    if (chatState.isPollingActive) {
      chatState.pollingTimeoutId = setTimeout(() => {
        this.startPollingLoop();
      }, 3000);
    }
  },

  async pollMessages() {
    if (!chatState.chatRoomId) return;

    try {
      const result = await fetchClient.getMessages(chatState.chatRoomId, chatState.lastFetchedAt);

      if (result.ok && result.data && result.data.messages && result.data.messages.length > 0) {
        chatState.messages.push(...result.data.messages);
        chatState.lastFetchedAt = result.data.messages[result.data.messages.length - 1].created_at;
        this.renderMessages();
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  },

  renderMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    if (chatState.messages.length === 0) {
      renderer.renderEmptyChatState();
      return;
    }

    container.innerHTML = chatState.messages
      .map((msg) => {
        // 使用 Number 進行安全的強型態比較，避免字串與數字對比失敗
        const isMe = Number(msg.sender_story_id) === Number(chatState.storyId);
        const msgClass = isMe ? 'chat-message--me' : 'chat-message--other';
        const senderName = isMe ? '你 (匿名衰鬼)' : chatState.otherNickname;
        const escapedContent = renderer.escapeHtml(msg.content);
        const formattedTime = renderer.formatTimestamp(msg.created_at);

        return `
          <div class="chat-message ${msgClass}">
            <div class="chat-message__bubble">
              <div class="chat-message__meta">${senderName} • ${formattedTime}</div>
              <div class="chat-message__text">${escapedContent}</div>
            </div>
          </div>
        `;
      }).join('');
    
    renderer.scrollToLatestMessage();
  },

  async sendMessage(content) {
    const trimmed = content.trim();
    if (!trimmed || chatState.isSending || !chatState.chatRoomId || !chatState.storyId) return;

    chatState.isSending = true;
    const sendBtn = document.getElementById('chat-send-btn');
    const chatInput = document.getElementById('chat-input');
    if (sendBtn) sendBtn.disabled = true;

    try {
      // 優先使用這則慘事的 story_token（作者身份）
      // 若沒有 story_token，代表是拍拍者，讓 fetchClient 自動帶 JWT（已登入情況）
      const specificStoryToken = localStorage.getItem(`story_token_${chatState.storyId}`);
      const options = specificStoryToken
        ? { headers: { 'Authorization': `Bearer ${specificStoryToken}` } }
        : {}; // 無 story_token：交給 fetchClient 的全域攔截自動帶 JWT

      const result = await fetchClient.sendMessage(
        chatState.chatRoomId,
        chatState.storyId,
        trimmed,
        options
      );

      if (result.ok && result.data) {
        if (chatInput) chatInput.value = '';
        chatState.messages.push(result.data);
        chatState.lastFetchedAt = result.data.created_at;
        this.renderMessages();
      } else {
        const msg = result.data?.message || '訊息發送失敗，請稍後再試';
        alert(msg);
      }
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      chatState.isSending = false;
      if (sendBtn) sendBtn.disabled = false;
      if (chatInput) chatInput.focus();
    }
  },

  /**
   * 確實清除計時器，防止記憶體洩漏與背景偷跑
   */
  stopPolling() {
    chatState.isPollingActive = false;
    if (chatState.pollingTimeoutId) {
      clearTimeout(chatState.pollingTimeoutId);
      chatState.pollingTimeoutId = null;
    }
  },

  close() {
    this.stopPolling();
    chatState.chatRoomId = null;
    chatState.storyId = null;
    chatState.otherNickname = '對方衰鬼';
    chatState.messages = [];
    chatState.lastFetchedAt = null;
  },
};