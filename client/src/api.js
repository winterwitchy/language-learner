const BASE = "/api";

// Single placeholder user until a real login system is integrated. The backend
// stores this on every chat as the seam for future per-user auth.
export const USER_ID = "000000";

async function request(path, options = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: "no-store", ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error ?? "Something went wrong." };
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again in a moment." };
  }
}

// Create a new chat (generates + persists the dialogue).
export function createChat({ scenario, level, language, userId = USER_ID, turns }) {
  return request("/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario, level, language, userId, turns }),
  });
}

// Full state of one chat, for resuming.
export function getChat(chatId) {
  return request(`/chats/${chatId}`);
}

// A user's previous chats, newest first.
export function listChats({ userId = USER_ID, limit = 20 } = {}) {
  return request(`/chats?userId=${encodeURIComponent(userId)}&limit=${limit}`);
}

// Submit + evaluate one answer.
export function postAnswer({ chatId, turnId, answer }) {
  return request(`/chats/${chatId}/turns/${turnId}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer }),
  });
}

// Permanently delete a chat.
export function deleteChat(chatId) {
  return request(`/chats/${chatId}`, { method: "DELETE" });
}

// Update a chat's status (e.g. 'abandoned' when the student leaves mid-session).
export function setChatStatus(chatId, status) {
  return request(`/chats/${chatId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

// Session report (recurring patterns). Generated lazily on first request.
export function getReport(chatId) {
  return request(`/chats/${chatId}/report`);
}

// Cumulative learner profile for a user in one language.
export function getProfile(language, userId = USER_ID) {
  return request(`/users/${encodeURIComponent(userId)}/profile?language=${encodeURIComponent(language)}`);
}
