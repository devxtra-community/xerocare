export function setAccessTokenCookie(token: string): void {
  // 900s = 15 min, matching the JWT access-token TTL
  document.cookie = `accessToken=${token}; path=/; SameSite=Strict; Max-Age=900`;
}

export function clearAccessTokenCookie(): void {
  document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
}
