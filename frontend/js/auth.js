window.revresAuth = (async () => {
  try {
    const res = await fetch("/api/me");
    if (!res.ok) return null;
    return (await res.json()).user;
  } catch {
    return null;
  }
})();

function applyAccount(user) {
  const btn = document.getElementById("rail-account");
  if (btn) {
    const label = document.getElementById("rail-account-label");
    const initial = btn.querySelector(".account-initial");
    const icon = btn.querySelector(".account-icon");
    if (user) {
      initial.hidden = false;
      initial.textContent = user.username[0].toUpperCase();
      icon.setAttribute("hidden", "");
      label.textContent = `${user.username} · Log out`;
      btn.setAttribute("aria-label", `Logged in as ${user.username}, log out`);
    } else {
      initial.hidden = true;
      icon.removeAttribute("hidden");
      label.textContent = "Log in";
      btn.setAttribute("aria-label", "Log in");
    }
  }
  const admin = document.getElementById("rail-admin");
  if (admin) admin.hidden = !(user && user.is_admin);
}

function loginUrl(next) {
  return `login.html?next=${encodeURIComponent(next)}`;
}

window.revresAuth.then((user) => {
  applyAccount(user);
  const btn = document.getElementById("rail-account");
  if (btn) {
    btn.addEventListener("click", async () => {
      if (user) {
        await fetch("/api/logout", { method: "POST" });
        window.location.reload();
      } else {
        window.location.href = loginUrl(
          window.location.pathname + window.location.search
        );
      }
    });
  }
  window.dispatchEvent(new CustomEvent("revres-auth", { detail: user }));
});
