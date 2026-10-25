const formEl = document.getElementById("auth-form");
const titleEl = document.getElementById("auth-title");
const sublineEl = document.getElementById("auth-subline");
const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const errorEl = document.getElementById("form-error");
const submitEl = document.getElementById("submit-btn");
const switchEl = document.getElementById("switch-btn");

const params = new URLSearchParams(window.location.search);
const nextParam = params.get("next") || "/";
const isSafeNext =
  nextParam.length > 0 &&
  !nextParam.startsWith("//") &&
  !nextParam.startsWith("\\") &&
  !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(nextParam);
const nextUrl = isSafeNext ? nextParam : "/";

let mode = "login";

function setMode(newMode) {
  mode = newMode;
  const register = mode === "register";
  titleEl.textContent = register ? "Create account" : "Log in";
  sublineEl.textContent = register
    ? "Pick a username to start booking"
    : "Book and manage your tables";
  submitEl.textContent = register ? "Create account" : "Log in";
  switchEl.textContent = register ? "Back to log in" : "Create account";
  passwordEl.autocomplete = register ? "new-password" : "current-password";
  errorEl.hidden = true;
  formEl.reset();
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  const username = usernameEl.value.trim();
  const password = passwordEl.value;
  if (!username) return showError("Enter your username.");
  if (!password) return showError("Enter your password.");
  if (mode === "register" && password.length < 8) {
    return showError("Password must be at least 8 characters.");
  }

  submitEl.disabled = true;
  try {
    const res = await fetch(`/api/${mode === "register" ? "register" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      window.location.replace(nextUrl);
      return;
    }
    const data = await res.json().catch(() => ({}));
    showError(data.error || "Something went wrong. Try again.");
  } catch (err) {
    showError("Couldn’t reach the server. Try again.");
  } finally {
    submitEl.disabled = false;
  }
});

switchEl.addEventListener("click", () => {
  setMode(mode === "login" ? "register" : "login");
});

window.revresAuth.then((user) => {
  if (user) window.location.replace(nextUrl);
});
