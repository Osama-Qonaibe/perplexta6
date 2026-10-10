import { getAuthHeaders } from '../utils/adminUtils';

export class ChatService {
  static async createChat(token: string, title: string, message?: string, tool?: string) {
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ title, message, tool }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to create chat');
    }
    return res.json();
  }

  static async renameChat(token: string, chatId: string, title: string) {
    const res = await fetch(`/api/chats/${chatId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to update chat title');
    }
    return res.json();
  }

  static async togglePin(token: string, chatId: string, messageId: number, isPinned: boolean) {
    const res = await fetch(`/api/chats/${chatId}/messages/${messageId}/pin`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ isPinned }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to toggle pin');
    }
    return res.json();
  }

  static async deleteChat(token: string, chatId: string) {
    const res = await fetch(`/api/chats/${chatId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to delete chat');
    }
    return res.json();
  }

  static async getMessages(token: string, chatId: string) {
    const res = await fetch(`/api/chats/${chatId}/messages`, {
      headers: getAuthHeaders(token),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch messages');
    }
    return res.json();
  }

  static async submitFeedback(
    token: string,
    messageId: number,
    feedback: number,
    details?: {
      rating?: number;
      reason?: string;
      comment?: string;
      tags?: string[];
      userPrompt?: string;
      assistantResponse?: string;
    }
  ) {
    const res = await fetch(`/api/messages/${messageId}/feedback`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({
        feedback,
        rating: details?.rating,
        reason: details?.reason,
        comment: details?.comment,
        tags: details?.tags,
        userPrompt: details?.userPrompt,
        assistantResponse: details?.assistantResponse
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to submit feedback');
    }
    return res.json();
  }
}
