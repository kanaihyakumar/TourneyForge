/* TourneyForge - shared site header + login modal, rendered into #siteHeader / #loginModalRoot */
import { TF } from "./shared.js";

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function renderHeader(activePage) {
  var session = TF.getSession();
  var root = document.getElementById("siteHeader");
  if (!root) return;

  var actionsHtml = "";
  if (session) {
    var dashLink = activePage === "dashboard" ? "" :
      '<a class="btn btn-sm" href="dashboard.html">' + (session.role === "admin" ? "\uD83D\uDEE0\uFE0F Admin Dashboard" : "\uD83D\uDEE0\uFE0F My Dashboard") + "</a>";
    actionsHtml =
      '<span class="chip">\uD83D\uDC64 ' + escapeHtml(session.displayName) +
      ' <span class="tag">' + escapeHtml(session.role) + '</span></span>' +
      dashLink +
      '<button type="button" class="btn btn-sm" id="tfLogoutBtn">Logout</button>';
  } else {
    actionsHtml = '<button type="button" class="btn btn-primary btn-sm" id="tfLoginBtn">\uD83D\uDD10 Organizer / Admin Login</button>';
  }

  root.innerHTML =
    '<header class="app-header">' +
    '<a class="logo-badge" href="index.html" aria-hidden="true">\uD83C\uDFB2</a>' +
    '<div><a class="title-link" href="index.html"><h1>TourneyForge</h1></a>' +
    '<p>Tournaments, groups & bragging rights - all in one arena.</p></div>' +
    '<div class="header-spacer"></div>' +
    '<div class="header-actions">' + actionsHtml + '</div>' +
    '</header>';

  var logoutBtn = document.getElementById("tfLogoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", function () {
    TF.logout();
    location.reload();
  });
  var loginBtn = document.getElementById("tfLoginBtn");
  if (loginBtn) loginBtn.addEventListener("click", openLoginModal);

  renderLoginModal();
}

function renderLoginModal() {
  var root = document.getElementById("loginModalRoot");
  if (!root) return;
  root.innerHTML =
    '<div class="modal-overlay" id="tfLoginOverlay" hidden>' +
    '<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="tfLoginTitle">' +
    '<div class="modal-head"><h2 id="tfLoginTitle">\uD83D\uDD10 Sign in</h2>' +
    '<button type="button" class="modal-close" id="tfLoginClose" aria-label="Close">\u2715</button></div>' +
    '<p class="hint">Admin and organizer accounts only. Participants don\u2019t need an account - just register with your Plato ID on a tournament card.</p>' +
    '<form id="tfLoginForm">' +
    '<label for="tfLoginUser">Username</label>' +
    '<div class="inset-field" style="margin-bottom:14px;"><input type="text" id="tfLoginUser" autocomplete="username" required></div>' +
    '<label for="tfLoginPass">Password</label>' +
    '<div class="inset-field" style="margin-bottom:6px;"><input type="password" id="tfLoginPass" autocomplete="current-password" required></div>' +
    '<p id="tfLoginError" class="field-note" style="color:var(--danger); display:none;"></p>' +
    '<div class="btn-row"><button type="submit" class="btn btn-primary btn-block" id="tfLoginSubmitBtn">Sign in</button></div>' +
    '</form></div></div>';

  var overlay = document.getElementById("tfLoginOverlay");
  document.getElementById("tfLoginClose").addEventListener("click", closeLoginModal);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeLoginModal(); });
  document.getElementById("tfLoginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var u = document.getElementById("tfLoginUser").value;
    var p = document.getElementById("tfLoginPass").value;
    var err = document.getElementById("tfLoginError");
    var submitBtn = document.getElementById("tfLoginSubmitBtn");
    err.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in...";
    TF.login(u, p).then(function (session) {
      if (!session) {
        err.textContent = "Incorrect username or password. Try again.";
        err.style.display = "block";
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign in";
        return;
      }
      location.href = "dashboard.html";
    }).catch(function () {
      err.textContent = "Could not reach the database. Check your connection and try again.";
      err.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";
    });
  });
}

function openLoginModal() {
  var overlay = document.getElementById("tfLoginOverlay");
  if (!overlay) return;
  overlay.hidden = false;
  var err = document.getElementById("tfLoginError");
  if (err) err.style.display = "none";
  var userField = document.getElementById("tfLoginUser");
  if (userField) { userField.value = ""; userField.focus(); }
  var passField = document.getElementById("tfLoginPass");
  if (passField) passField.value = "";
}
function closeLoginModal() {
  var overlay = document.getElementById("tfLoginOverlay");
  if (overlay) overlay.hidden = true;
}

export var TFHeader = { render: renderHeader, openLogin: openLoginModal, escapeHtml: escapeHtml };
