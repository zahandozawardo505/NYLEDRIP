const validateEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = pass => String(pass || "").length >= 8;
const escapeHTML = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");
const escapeAttr = (value = "") => escapeHTML(value).replace(/`/g, "&#096;");
const getPasswordStrength = pass => {
  let s = 0;
  if (String(pass).length >= 8) s++;
  if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) s++;
  if (/\d/.test(pass)) s++;
  if (/[^A-Za-z0-9]/.test(pass)) s++;
  return Math.max(1, s);
};
const showError = (el, msg) => { if (!el) return; el.textContent = msg; el.classList.add("show"); };
const clearError = el => { if (!el) return; el.textContent = ""; el.classList.remove("show"); };

const getAssetPath = (path) => {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("//")) return path;
  const isInHTML = window.location.pathname.toLowerCase().includes("/html/");
  const clean = path.startsWith("../") ? path.slice(3) : path;
  return isInHTML ? `../${clean}` : clean;
};

const getPagePath = (pageName) => {
  const isInHTML = window.location.pathname.toLowerCase().includes("/html/");
  const [base, query] = pageName.split("?");
  const path = isInHTML ? base : `HTML/${base}`;
  return query ? `${path}?${query}` : path;
};

const formatCurrency = amount =>
  `${new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 0 }).format(amount).replace("EGP", "").trim()} EGP`;

const showToast = (message, type = "info", timeout = 3600) => {
  const text = String(message || "").trim();
  if (!text) return;
  let host = document.getElementById("toastHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "toastHost";
    host.className = "toast-host";
    host.setAttribute("aria-live", "polite");
    host.setAttribute("aria-relevant", "additions");
    document.body.appendChild(host);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.textContent = text;
  host.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add("toast-leaving");
    window.setTimeout(() => toast.remove(), 220);
  }, timeout);
};

const updateNavbarBadges = () => {
  const cart = (typeof DB !== "undefined" && DB.getCart) ? DB.getCart() : [];
  const wishlist = (typeof DB !== "undefined" && DB.getWishlist) ? DB.getWishlist() : [];
  const cartCount = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const wishlistCount = wishlist.length;
  const cartBadge = document.getElementById("cartNavBadge");
  const wishlistBadge = document.getElementById("wishlistNavBadge");
  if (cartBadge) { cartBadge.textContent = String(cartCount); cartBadge.style.display = cartCount > 0 ? "inline-flex" : "none"; }
  if (wishlistBadge) { wishlistBadge.textContent = String(wishlistCount); wishlistBadge.style.display = wishlistCount > 0 ? "inline-flex" : "none"; }
};

const updateNavbarAuth = () => {
  const menu = document.getElementById("navbarMenu");
  if (!menu || typeof DB === "undefined" || !DB.getCurrentUser) return;
  const currentUser = DB.getCurrentUser();
  const login = menu.querySelector('a[href*="login.html"]');
  const signup = menu.querySelector('a[href*="signup.html"]');
  const profileHref = getPagePath("profile.html");
  const sellerHref = getPagePath("seller-dashboard.html");
  const loginHref = getPagePath("login.html");
  if (currentUser) {
    if (currentUser.role === "seller") {
      if (login) login.outerHTML = `<a href="${sellerHref}" class="nav-link">Dashboard</a>`;
      if (signup) signup.outerHTML = '<a href="#" id="navLogoutLink" class="nav-link">Logout</a>';
    } else {
      if (login) login.outerHTML = `<a href="${profileHref}" class="nav-link">Profile</a>`;
      if (signup) signup.outerHTML = '<a href="#" id="navLogoutLink" class="nav-link">Logout</a>';
    }
    document.getElementById("navLogoutLink")?.addEventListener("click", (e) => {
      e.preventDefault();
      DB.logout();
      if (typeof Api !== "undefined") Api.setToken("");
      window.location.href = loginHref;
    });
  }
};

const initPremiumFeatures = () => {};

document.addEventListener("error", (event) => {
  const target = event.target;
  if (!target || target.tagName !== "IMG" || target.dataset.fallbackApplied === "true") return;
  target.dataset.fallbackApplied = "true";
  target.alt = target.alt || "Product image unavailable";
  target.src = getAssetPath("assets/images/bmw.webp");
}, true);

const requireSignedInUser = (message = "You have to sign in first.") => {
  if (typeof DB === "undefined" || !DB.getCurrentUser) return false;
  const currentUser = DB.getCurrentUser();
  const hasToken = typeof Api !== "undefined" ? Boolean(Api.token()) : true;
  if (currentUser && hasToken) return true;
  showToast(message, "error");
  window.location.href = getPagePath("login.html");
  return false;
};

const requireRole = (roles, message = "You do not have permission to access this page.") => {
  if (typeof DB === "undefined" || !DB.getCurrentUser) return false;
  const allowed = Array.isArray(roles) ? roles : [roles];
  const currentUser = DB.getCurrentUser();
  const hasToken = typeof Api !== "undefined" ? Boolean(Api.token()) : true;
  if (currentUser && hasToken && allowed.includes(currentUser.role)) return true;
  showToast(message, "error");
  window.location.href = getPagePath(currentUser ? "shop.html" : "login.html");
  return false;
};

const getReelEmbedInfo = (reelUrl, platformHint = "") => {
  const raw = String(reelUrl || "").trim();
  if (!raw) return { error: "Reel URL is required." };
  let parsed;
  try {
    parsed = new URL(raw);
  } catch (_) {
    return { error: "Reel URL is not valid." };
  }
  if (!/^https?:$/i.test(parsed.protocol)) return { error: "Reel URL must start with http:// or https://." };

  const host = String(parsed.hostname || "").toLowerCase();
  const pathname = String(parsed.pathname || "");
  let platform = String(platformHint || "").trim().toLowerCase();
  if (!platform) {
    if (host.includes("instagram.com")) platform = "instagram";
    else if (host.includes("tiktok.com")) platform = "tiktok";
  }
  if (!["instagram", "tiktok"].includes(platform)) return { error: "Only Instagram and TikTok links are supported." };

  if (platform === "instagram") {
    if (!host.includes("instagram.com")) return { error: "Instagram reels must use instagram.com links." };
    const match = pathname.match(/\/reel\/([A-Za-z0-9_-]+)/i);
    if (!match) return { error: "Instagram URL must include /reel/{id}." };
    const reelId = match[1];
    const canonicalUrl = `https://www.instagram.com/reel/${reelId}/`;
    return {
      platform,
      canonicalUrl,
      externalUrl: canonicalUrl,
      embedUrl: `${canonicalUrl}embed`,
      reelId
    };
  }

  if (!host.includes("tiktok.com")) return { error: "TikTok reels must use tiktok.com links." };
  const idMatch = pathname.match(/\/video\/(\d+)/i);
  if (!idMatch) return { error: "TikTok URL must include /video/{id}." };
  const reelId = idMatch[1];
  const userMatch = pathname.match(/^\/@([^/]+)\/video\/\d+/i);
  const canonicalUrl = userMatch
    ? `https://www.tiktok.com/@${userMatch[1]}/video/${reelId}`
    : `https://www.tiktok.com/video/${reelId}`;
  return {
    platform,
    canonicalUrl,
    externalUrl: canonicalUrl,
    embedUrl: `https://www.tiktok.com/embed/v2/${reelId}`,
    reelId
  };
};
