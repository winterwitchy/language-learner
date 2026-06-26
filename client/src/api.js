const BASE = "/api";

// The current user identity, set by the login screen and stored locally. It's
// sent as the X-User-Id header on every request; the server scopes all data to
// it (row-level security). In a real app this would be an auth token instead.
const USER_KEY = "dialogue_user_id";
export function getCurrentUserId() {
  return localStorage.getItem(USER_KEY) || "";
}
export function setCurrentUserId(id) {
  localStorage.setItem(USER_KEY, id);
}
export function clearCurrentUserId() {
  localStorage.removeItem(USER_KEY);
}

async function request(path, options = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      cache: "no-store",
      ...options,
      headers: { "X-User-Id": getCurrentUserId(), ...(options.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error ?? "Something went wrong." };
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again in a moment." };
  }
}

// Create a new chat (generates + persists the dialogue).
export function createChat({ scenario, level, language, turns }) {
  return request("/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario, level, language, turns }),
  });
}

// Full state of one chat, for resuming.
export function getChat(chatId) {
  return request(`/chats/${chatId}`);
}

// The current user's previous chats, newest first.
export function listChats({ limit = 20 } = {}) {
  return request(`/chats?limit=${limit}`);
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

// Cumulative learner profile for the current user in one language.
export function getProfile(language) {
  return request(`/users/${encodeURIComponent(getCurrentUserId())}/profile?language=${encodeURIComponent(language)}`);
}
