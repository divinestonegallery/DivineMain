export const LOGIN_AFTER_LOGOUT_KEY = "dsg:login-after-logout";

export function markLoginAfterLogout() {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(LOGIN_AFTER_LOGOUT_KEY, "true");
  }
}

export function consumeLoginAfterLogout() {
  if (typeof window === "undefined" || window.sessionStorage.getItem(LOGIN_AFTER_LOGOUT_KEY) !== "true") {
    return false;
  }

  window.sessionStorage.removeItem(LOGIN_AFTER_LOGOUT_KEY);
  return true;
}
