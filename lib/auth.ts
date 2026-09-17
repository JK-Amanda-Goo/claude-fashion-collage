const SESSION_KEY = "FC_SESSION";

export function getCurrentUser(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setCurrentUser(email: string | null): void {
  if (email) {
    sessionStorage.setItem(SESSION_KEY, email);
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export function logout(): void {
  setCurrentUser(null);
}
