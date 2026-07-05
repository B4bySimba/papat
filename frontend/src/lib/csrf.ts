export function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2); // or use uuid if preferred
}
