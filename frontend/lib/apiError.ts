import { AxiosError } from 'axios';

/**
 * Extracts a human-readable message from an API error for display in
 * toasts/dialogs. Prefers the backend's message, falls back to the HTTP
 * error, then to a generic message.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    const serverMessage = data?.message || data?.error;
    if (serverMessage) return serverMessage;
    if (error.response) {
      return `Server error (${error.response.status}). Please try again or contact support.`;
    }
    if (error.request) {
      return 'Cannot reach the server. Check your connection and try again.';
    }
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}
