export const authStore = new Map();

/**
 * sessionId → { access_token, user }
 */

export function setAuth(sessionId, data) {
  authStore.set(sessionId, {
    ...data,
    updatedAt: Date.now(),
  });
}

export function getAuth(sessionId) {
  return authStore.get(sessionId);
}

export function getLatestUser() {
  // for single-user dev mode
  const first = authStore.values().next().value;
  return first || null;
}