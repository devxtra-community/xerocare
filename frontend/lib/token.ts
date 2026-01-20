export function setAccessToken(token: string) {
  localStorage.setItem('accessToken', token);
  // Set cookie for middleware access
  document.cookie = `accessToken=${token}; path=/; max-age=86400; SameSite=Strict`;
}

export function clearAuth() {
  localStorage.clear();
  // Clear the cookie by setting it to expire in the past
  document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
}
