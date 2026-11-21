
const API_URL = "https://beru-ai-engine.mmzhoussem.workers.dev";
const AUTH_URL = "https://beru-auth-engine.mmzhoussem.workers.dev";
const GOOGLE_CLIENT_ID = "1029198003465-bs891ka49b1j2a1rm5m60cnog5vtalm3.apps.googleusercontent.com";
const SESSION_KEY = "beru_session_token";

const authScreen = document.getElementById("authScreen");
const beruApp = document.getElementById("beruApp");
const authStatus = document.getElementById("authStatus");
const googleButton = document.getElementById("googleButton");
const accountName = document.getElementById("accountName");
const accountPicture = document.getElementById("accountPicture");
const accountPlan = document.getElementById("accountPlan");
const coinBalance = document.getElementById("coinBalance");
const walletBalance = document.getElementById("walletBalance");
const accountMenuBtn = document.getElementById("accountMenuBtn");
const accountDropdown = document.getElementById("accountDropdown");
const settingsOverlay = document.getElementById("settingsOverlay");
const logoutBtn = document.getElementById("logoutBtn");
const menuLogoutBtn = document.getElementById("menuLogoutBtn");
const accountInitials = document.getElementById("accountInitials");
const accountTriggerName = document.getElementById("accountTriggerName");
const dropdownPicture = document.getElementById("dropdownPicture");
const dropdownInitials = document.getElementById("dropdownInitials");
const dropdownName = document.getElementById("dropdownName");
const dropdownEmail = document.getElementById("dropdownEmail");
const dropdownPlan = document.getElementById("dropdownPlan");
let activeUser = null;
let currentWalletData = null;
let currentConversationId = null;
let savedChats = [];

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const newChat = document.getElementById("newChat");
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.querySelector(".sidebar");

let conversation = [];
let isSending = false;
let currentSessionToken = localStorage.getItem(SESSION_KEY);

function setAuthStatus(message, isError = false) {
  if (!authStatus) return;
  authStatus.textContent = message;
  authStatus.classList.toggle("error", isError);
}

function initialsFor(name) {
  return String(name || "BERU").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase() || "B";
}

function setProfileImage(img, fallback, url) {
  if (!img || !fallback) return;
  img.onerror = function() { img.hidden = true; fallback.hidden = false; };
  if (url) {
    img.src = url;
    img.hidden = false;
    fallback.hidden = true;
  } else {
    img.removeAttribute("src");
    img.hidden = true;
    fallback.hidden = false;
  }
}

function showAuthenticatedApp(user) {
  activeUser = user || {};
  loadChatHistory();
  authScreen.style.display = "none";
  beruApp.classList.add("authenticated");

  const displayName = activeUser.name || activeUser.full_name || "BERU User";
  const email = activeUser.email || "";
  const planName = String(activeUser.plan || "FREE").toUpperCase();
  const pictureUrl = activeUser.picture || activeUser.photoURL || activeUser.avatar || "";

  accountTriggerName.textContent = displayName;
  accountTriggerName.title = email || displayName;
  accountInitials.textContent = initialsFor(displayName);
  dropdownName.textContent = displayName;
  dropdownEmail.textContent = email || "BERU account";
  dropdownPlan.textContent = planName + " PLAN";
  setProfileImage(accountPicture, accountInitials, pictureUrl);
  setProfileImage(dropdownPicture, dropdownInitials, pictureUrl);
  if (coinBalance) coinBalance.hidden = false;
  loadWalletBalance();
}

async function loadWalletBalance() {
  if (!currentSessionToken || !walletBalance) return;
  try {
    const response = await fetch(AUTH_URL + "/wallet", {
      headers: { "Authorization": "Bearer " + currentSessionToken }
    });
    const data = await response.json();
    if (!response.ok || !data.success || !data.wallet) throw new Error(data.error || "Wallet unavailable");
    currentWalletData = data;
    const balance = Number(data.wallet.balance || 0);
    walletBalance.textContent = balance.toLocaleString();
    const commerceBalance = document.getElementById("commerceWalletBalance");
    if (commerceBalance) commerceBalance.textContent = balance.toLocaleString();
    const plan = String((activeUser && activeUser.plan) || data.plan || "FREE").toUpperCase();
    const planKey = plan === "PREMIUM" ? "PRO" : plan;
    const dailyAmounts = { FREE:100, BASIC:300, PRO:700, ULTIMATE:1500 };
    const daily = data.dailyGrant && (data.dailyGrant.amount || data.dailyGrant.granted_amount);
    const dailyEl = document.getElementById("dailyCoinAllowance");
    if (dailyEl) dailyEl.textContent = Number(daily || dailyAmounts[planKey] || 100).toLocaleString() + " BC";
    const planEl = document.getElementById("walletPlanName");
    if (planEl) planEl.textContent = planKey;
    const expiryEl = document.getElementById("walletPlanExpiry");
    if (expiryEl) expiryEl.textContent = (activeUser && (activeUser.plan_expires_at || activeUser.subscription_expires_at)) || "Subscription details will appear here";
    if (coinBalance) coinBalance.title = "BERU Coins balance";
    renderCoinTransactions(data.wallet.transactions || data.transactions || []);
  } catch (error) {
    console.warn("BERU wallet could not load:", error);
    walletBalance.textContent = "—";
    const commerceBalance = document.getElementById("commerceWalletBalance");
    if (commerceBalance) commerceBalance.textContent = "—";
    const list = document.getElementById("coinTransactions");
    if (list) list.innerHTML = '<p class="empty-transactions">Wallet activity is temporarily unavailable.</p>';
  }
}

function renderCoinTransactions(items) {
  const list = document.getElementById("coinTransactions");
  if (!list) return;
  if (!Array.isArray(items) || !items.length) {
    list.innerHTML = '<p class="empty-transactions">No wallet activity yet. Your coin credits and usage will appear here.</p>';
    return;
  }
  list.innerHTML = "";
  items.slice(0, 30).forEach(item => {
    const row = document.createElement("div");
    row.className = "transaction-row";
    const info = document.createElement("div");
    info.className = "transaction-info";
    const title = document.createElement("strong");
    title.textContent = item.description || item.source_type || item.transaction_type || "Wallet activity";
    const date = document.createElement("small");
    date.textContent = item.created_at ? new Date(String(item.created_at).replace(" ", "T") + (String(item.created_at).endsWith("Z") ? "" : "Z")).toLocaleString() : "Date unavailable";
    info.append(title, date);
    const amount = document.createElement("span");
    const value = Number(item.amount || 0);
    const isDebit = String(item.transaction_type || "").toUpperCase() === "DEBIT" || value < 0;
    amount.className = "transaction-amount " + (isDebit ? "debit" : "credit");
    amount.textContent = (isDebit ? "−" : "+") + Math.abs(value).toLocaleString() + " BC";
    row.append(info, amount);
    list.appendChild(row);
  });
}

function renderSubscriptionPlans() {
  const rawPlan = String((activeUser && activeUser.plan) || "FREE").toUpperCase();
  const currentPlan = rawPlan === "PREMIUM" ? "PRO" : rawPlan;
  document.querySelectorAll(".plan-button[data-plan]").forEach(button => {
    const isCurrent = button.dataset.plan === currentPlan;
    button.classList.toggle("current", isCurrent);
    button.disabled = true;
    button.textContent = isCurrent ? "Your current plan" : "Purchase unavailable";
  });
}

function openCommerce(section) {
  const hub = document.getElementById("commerceHub");
  if (!hub) return;
  const chosen = section === "coins" ? "coins" : "subscriptions";
  hub.hidden = false;
  welcome.hidden = true;
  messages.hidden = true;
  chatForm.hidden = true;
  document.getElementById("attachmentPreview").hidden = true;
  document.getElementById("voiceStatus").hidden = true;
  const titles = {
    subscriptions: ["Subscriptions", "Choose the BERU plan that matches your needs."],
    coins: ["BERU Coins", "Manage your unified BERU wallet."]
  };
  document.getElementById("commerceTitle").textContent = titles[chosen][0];
  document.getElementById("commerceSubtitle").textContent = titles[chosen][1];
  document.querySelectorAll("[data-commerce-tab]").forEach(tab => tab.classList.toggle("active", tab.dataset.commerceTab === chosen));
  document.querySelectorAll("[data-commerce-view]").forEach(view => view.hidden = view.dataset.commerceView !== chosen);
  if (chosen === "coins") loadWalletBalance();
  if (chosen === "subscriptions") renderSubscriptionPlans();
  if (sidebar) sidebar.classList.remove("open");
}
window.openBeruCommerce = function(section) {
  if (accountDropdown) accountDropdown.hidden = true;
  if (accountMenuBtn) accountMenuBtn.setAttribute("aria-expanded", "false");
  openCommerce(section);
};

function closeCommerce() {
  const hub = document.getElementById("commerceHub");
  if (hub) hub.hidden = true;
  welcome.hidden = false;
  messages.hidden = false;
  chatForm.hidden = false;
  document.getElementById("voiceStatus").hidden = false;
}

function showLoginScreen(message) {
  if (coinBalance) coinBalance.hidden = true;
  beruApp.classList.remove("authenticated");
  authScreen.style.display = "flex";
  if (message) setAuthStatus(message);
}

async function verifyExistingSession() {
  if (!currentSessionToken) {
    showLoginScreen("Sign in with Google to continue.");
    return;
  }

  try {
    const response = await fetch(AUTH_URL + "/me", {
      headers: { "Authorization": "Bearer " + currentSessionToken }
    });
    const data = await response.json();

    if (!response.ok || !data.user) {
      throw new Error(data.error || "Session expired");
    }

    const cachedProfile = JSON.parse(localStorage.getItem("beru_profile_cache") || "{}");
    showAuthenticatedApp({
      ...cachedProfile,
      ...data.user,
      picture: data.user.picture || cachedProfile.picture
    });
  } catch (error) {
    localStorage.removeItem(SESSION_KEY);
    currentSessionToken = null;
    showLoginScreen("Please sign in again to continue.");
  }
}

function decodeGoogleCredential(credential) {
  try {
    const payload = credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(Array.from(atob(payload), c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")));
  } catch (error) {
    console.warn("Could not read Google profile claims:", error);
    return {};
  }
}

async function handleGoogleCredential(response) {
  setAuthStatus("Verifying your Google account...");
  try {
    const googleProfile = decodeGoogleCredential(response.credential);
    const result = await fetch(AUTH_URL + "/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential })
    });

    const data = await result.json();
    if (!result.ok || !data.token || !data.user) {
      throw new Error(data.error || data.message || "Google sign-in failed.");
    }

    currentSessionToken = data.token;
    localStorage.setItem(SESSION_KEY, currentSessionToken);
    const mergedUser = {
      ...data.user,
      name: data.user.name || googleProfile.name,
      email: data.user.email || googleProfile.email,
      picture: data.user.picture || googleProfile.picture
    };
    localStorage.setItem("beru_profile_cache", JSON.stringify(mergedUser));
    showAuthenticatedApp(mergedUser);
  } catch (error) {
    console.error("BERU AUTH ERROR:", error);
    setAuthStatus(error.message || "Unable to sign in. Please try again.", true);
  }
}

function initializeGoogleSignIn() {
  if (!googleButton) return;

  // Native Android builds use Google Credential Manager through Capacitor.
  if (typeof window.BeruNativeGoogleSignIn === "function") {
    googleButton.innerHTML = "";
    const nativeButton = document.createElement("button");
    nativeButton.type = "button";
    nativeButton.className = "native-google-signin";
    nativeButton.textContent = "Continue with Google";
    nativeButton.style.cssText = "width:280px;max-width:100%;min-height:48px;border:1px solid #777;border-radius:999px;background:#fff;color:#202124;font-size:15px;font-weight:600;cursor:pointer;padding:0 20px;";
    nativeButton.addEventListener("click", async () => {
      nativeButton.disabled = true;
      nativeButton.textContent = "Connecting to Google…";
      setAuthStatus("Choose your Google account…");
      try {
        const credential = await window.BeruNativeGoogleSignIn();
        if (!credential) throw new Error("Google did not return an ID token.");
        await handleGoogleCredential({ credential });
      } catch (error) {
        console.error("BERU native Google sign-in error:", error);
        setAuthStatus(error.message || "Google sign-in failed. Please try again.", true);
      } finally {
        nativeButton.disabled = false;
        nativeButton.textContent = "Continue with Google";
      }
    });
    googleButton.appendChild(nativeButton);
    setAuthStatus("Secure Google sign-in is ready.");
    return;
  }

  // Regular browsers continue to use Google Identity Services.
  if (!window.google || !window.google.accounts) return;
  googleButton.innerHTML = "";
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential
  });
  window.google.accounts.id.renderButton(googleButton, {
    theme: "filled_black",
    size: "large",
    shape: "pill",
    text: "signin_with",
    width: 280
  });
  setAuthStatus("Choose your Google account to sign in.");
}

window.beruGoogleLibraryLoaded = initializeGoogleSignIn;

let googleWaitCount = 0;
const googleWaiter = setInterval(() => {
  googleWaitCount++;
  if (typeof window.BeruNativeGoogleSignIn === "function") {
    clearInterval(googleWaiter);
    initializeGoogleSignIn();
  } else if (window.google && window.google.accounts) {
    clearInterval(googleWaiter);
    initializeGoogleSignIn();
  } else if (googleWaitCount > 40) {
    clearInterval(googleWaiter);
    setAuthStatus("Google sign-in could not load. Check your internet and refresh.", true);
  }
}, 250);

verifyExistingSession();

async function performLogout() {
  const token = currentSessionToken;
  try {
    if (token) {
      await fetch(AUTH_URL + "/logout", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token }
      });
    }
  } catch (error) {
    console.warn("Logout request failed:", error);
  }
  localStorage.removeItem(SESSION_KEY);
  currentSessionToken = null;
  localStorage.removeItem("beru_profile_cache");
  activeUser = null;
  accountDropdown.hidden = true;
  conversation = [];
  messages.innerHTML = "";
  welcome.style.display = "flex";
  showLoginScreen("You have been signed out.");
}

menuLogoutBtn.addEventListener("click", performLogout);

document.querySelectorAll("[data-commerce-tab]").forEach(button => {
  button.addEventListener("click", () => {
    openCommerce(button.dataset.commerceTab);
  });
});
document.getElementById("commerceBack").addEventListener("click", closeCommerce);
document.getElementById("refreshWallet").addEventListener("click", loadWalletBalance);
document.querySelectorAll("[data-commerce-action]").forEach(button => {
  button.addEventListener("click", () => {
    const target = button.dataset.commerceAction;
    if (target === "chat") closeCommerce();
    else openCommerce(target);
  });
});



/* BERU account menu, preferences and support panels */
const UI_TRANSLATIONS = {
  en: {settings:"Settings",redeem:"Redeem Code",about:"About BERU AI",report:"Report a problem",logout:"Log out",personalization:"Personalization",appearance:"Appearance",appearanceDesc:"Choose light or dark mode",language:"Language",languageDesc:"Choose your app language",redeemTitle:"Redeem a code",redeemDesc:"Enter a BERU promo code to activate a subscription or discount.",redeemButton:"Continue",aboutDesc:"Your intelligent space for ideas, answers and creation.",reportTitle:"Report a problem",reportDesc:"Tell us what happened. Your report will be sent securely to the BERU team.",copyReport:"Send report"},
  fr: {settings:"Paramètres",redeem:"Utiliser un code",about:"À propos de BERU AI",report:"Signaler un problème",logout:"Déconnexion",personalization:"Personnalisation",appearance:"Apparence",appearanceDesc:"Choisissez le mode clair ou sombre",language:"Langue",languageDesc:"Choisissez la langue de l’application",redeemTitle:"Utiliser un code",redeemDesc:"Saisissez un code promotionnel BERU pour activer un abonnement ou une réduction.",redeemButton:"Continuer",aboutDesc:"Votre espace intelligent pour les idées, les réponses et la création.",reportTitle:"Signaler un problème",reportDesc:"Décrivez le problème. Votre rapport sera envoyé en toute sécurité à l’équipe BERU.",copyReport:"Envoyer le rapport"},
  ar: {settings:"الإعدادات",redeem:"استخدام رمز",about:"حول BERU AI",report:"إرسال مشكلة",logout:"تسجيل الخروج",personalization:"التخصيص",appearance:"المظهر",appearanceDesc:"اختر الوضع الفاتح أو الداكن",language:"اللغة",languageDesc:"اختر لغة التطبيق",redeemTitle:"استخدام رمز ترويجي",redeemDesc:"أدخل رمز BERU لتفعيل اشتراك أو الحصول على خصم.",redeemButton:"متابعة",aboutDesc:"مساحتك الذكية للأفكار والإجابات والإبداع.",reportTitle:"الإبلاغ عن مشكلة",reportDesc:"اشرح ما حدث وسيصل بلاغك مباشرة إلى فريق BERU.",copyReport:"إرسال البلاغ"}
};

function applyLanguage(language) {
  const dict = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });
  localStorage.setItem("beru_language", language);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("beru_theme", theme);
}

function openSettingsPanel(panel) {
  accountDropdown.hidden = true;
  settingsOverlay.hidden = false;
  document.querySelectorAll(".settings-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.tab === panel));
  document.querySelectorAll(".settings-panel").forEach(section => {
    const selected = section.dataset.panelContent === panel;
    section.classList.toggle("active", selected);
    section.hidden = !selected;
  });
  document.getElementById("settingsTitle").textContent = panel === "preferences" ? (localStorage.getItem("beru_language") === "ar" ? "الإعدادات" : panel === "preferences" ? "Settings" : "Settings") : panel === "redeem" ? "Redeem Code" : panel === "about" ? "About BERU AI" : "Report a problem";
}

accountMenuBtn.addEventListener("click", function(event) {
  event.stopPropagation();
  accountDropdown.hidden = !accountDropdown.hidden;
  accountMenuBtn.setAttribute("aria-expanded", String(!accountDropdown.hidden));
});
document.addEventListener("click", function(event) {
  if (!accountDropdown.hidden && !accountDropdown.contains(event.target) && !accountMenuBtn.contains(event.target)) {
    accountDropdown.hidden = true;
    accountMenuBtn.setAttribute("aria-expanded", "false");
  }
});
accountDropdown.querySelectorAll("[data-panel]").forEach(button => button.addEventListener("click", () => openSettingsPanel(button.dataset.panel)));
document.querySelectorAll(".settings-panel").forEach(section => {
  section.hidden = !section.classList.contains("active");
});
document.getElementById("closeSettings").addEventListener("click", () => settingsOverlay.hidden = true);
settingsOverlay.addEventListener("click", event => { if (event.target === settingsOverlay) settingsOverlay.hidden = true; });
document.querySelectorAll(".settings-tab").forEach(tab => tab.addEventListener("click", () => openSettingsPanel(tab.dataset.tab)));
document.getElementById("themeSelect").addEventListener("change", event => applyTheme(event.target.value));
document.getElementById("languageSelect").addEventListener("change", event => applyLanguage(event.target.value));

const savedTheme = localStorage.getItem("beru_theme") || "dark";
const savedLanguage = localStorage.getItem("beru_language") || "en";
document.getElementById("themeSelect").value = savedTheme;
document.getElementById("languageSelect").value = savedLanguage;
applyTheme(savedTheme);
applyLanguage(savedLanguage);

document.getElementById("redeemForm").addEventListener("submit", async event => {
  event.preventDefault();
  const status = document.getElementById("redeemStatus");
  const button = event.currentTarget.querySelector("button[type=submit]");
  const code = document.getElementById("redeemInput").value.trim();
  button.disabled = true;
  status.textContent = savedLanguage === "ar" ? "جارٍ التحقق من الرمز..." : "Checking promo code...";
  try {
    const response = await fetch(AUTH_URL + "/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + currentSessionToken },
      body: JSON.stringify({ code })
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || "Could not redeem this code.");
    if (Number(data.coin_amount) > 0) {
      await loadWalletBalance();
      status.textContent = savedLanguage === "ar"
        ? "تمت إضافة " + Number(data.coin_amount).toLocaleString() + " BERU Coins إلى محفظتك بنجاح."
        : savedLanguage === "fr"
          ? Number(data.coin_amount).toLocaleString() + " BERU Coins ont été ajoutés à votre portefeuille."
          : Number(data.coin_amount).toLocaleString() + " BERU Coins have been added to your wallet.";
    } else {
      if (activeUser) activeUser.plan = data.plan;
      dropdownPlan.textContent = String(data.plan || "FREE").toUpperCase() + " PLAN";
      loadWalletBalance();
      if (accountPlan) accountPlan.textContent = data.plan;
      status.textContent = savedLanguage === "ar"
        ? "تم تفعيل اشتراك " + data.plan + " بنجاح."
        : savedLanguage === "fr" ? "Abonnement " + data.plan + " activé."
        : data.plan + " subscription activated successfully.";
    }
    event.currentTarget.reset();
  } catch (error) {
    status.textContent = error.message || "Could not redeem this code.";
  } finally {
    button.disabled = false;
  }
});

document.getElementById("reportForm").addEventListener("submit", async event => {
  event.preventDefault();
  const subject = document.getElementById("reportSubject").value.trim();
  const message = document.getElementById("reportMessage").value.trim();
  const status = document.getElementById("reportStatus");
  const button = event.currentTarget.querySelector("button[type=submit]");
  button.disabled = true;
  status.textContent = savedLanguage === "ar" ? "جارٍ إرسال البلاغ..." : savedLanguage === "fr" ? "Envoi du rapport..." : "Sending report...";
  try {
    const response = await fetch(API_URL + "/report", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + currentSessionToken },
      body: JSON.stringify({ subject, message })
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || "Could not send report.");
    status.textContent = savedLanguage === "ar" ? "تم استلام بلاغك بنجاح. شكرًا لمساعدتنا في تحسين BERU." : savedLanguage === "fr" ? "Votre rapport a bien été reçu. Merci." : "Your report was received successfully. Thank you.";
    event.currentTarget.reset();
  } catch (error) {
    status.textContent = error.message || "Could not send report.";
  } finally {
    button.disabled = false;
  }
});

function addMessage(text, sender) {
  const message = document.createElement("div");
  message.style.padding = "15px 18px";
  message.style.marginBottom = "14px";
  message.style.borderRadius = "14px";
  message.style.lineHeight = "1.7";
  message.style.whiteSpace = "pre-wrap";
  message.style.overflowWrap = "anywhere";
  message.style.maxWidth = "85%";

  if (sender === "user") {
    message.style.background = "#351052";
    message.style.border = "1px solid #9636d5";
    message.style.marginLeft = "auto";
  } else {
    message.style.background = "rgba(20,10,32,.95)";
    message.style.border = "1px solid #68269a";
    message.style.marginRight = "auto";
  }

  message.textContent = text;
  messages.appendChild(message);
  message.scrollIntoView({ behavior: "smooth", block: "end" });
  return message;
}

function historyStorageKey() {
  const identity = String((activeUser && (activeUser.email || activeUser.id)) || "guest").toLowerCase();
  return "beru_chat_history:" + identity;
}

function safeHistoryMessages(items) {
  return (items || []).map(item => {
    if (typeof item.content === "string") return { role: item.role, content: item.content };
    const textPart = Array.isArray(item.content)
      ? item.content.filter(part => part && part.type === "text").map(part => part.text || "").join(" ")
      : "";
    const hasImage = Array.isArray(item.content) && item.content.some(part => part && (part.type === "image_url" || part.type === "input_image"));
    return { role: item.role, content: (textPart + (hasImage ? (textPart ? "\\n" : "") + "[Image attached — image data is not stored in chat history]" : "")).trim() };
  });
}

function loadChatHistory() {
  try {
    savedChats = JSON.parse(localStorage.getItem(historyStorageKey()) || "[]");
    if (!Array.isArray(savedChats)) savedChats = [];
  } catch (error) {
    savedChats = [];
  }
  renderChatHistory();
}

function saveCurrentConversation() {
  if (!conversation.length) return;
  if (!currentConversationId) currentConversationId = "chat-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
  const storedMessages = safeHistoryMessages(conversation);
  const firstUser = storedMessages.find(item => item.role === "user");
  const title = (firstUser ? firstUser.content : "New conversation").replace(/\s+/g, " ").trim().slice(0, 46) || "New conversation";
  const existingIndex = savedChats.findIndex(chat => chat.id === currentConversationId);
  const chat = { id: currentConversationId, title, updatedAt: Date.now(), messages: storedMessages };
  if (existingIndex >= 0) savedChats[existingIndex] = chat;
  else savedChats.unshift(chat);
  savedChats.sort((a, b) => b.updatedAt - a.updatedAt);
  savedChats = savedChats.slice(0, 30);
  try {
    localStorage.setItem(historyStorageKey(), JSON.stringify(savedChats));
  } catch (error) {
    console.warn("Could not save BERU chat history:", error);
  }
  renderChatHistory();
}

function renderChatHistory() {
  const list = document.getElementById("chatHistory");
  if (!list) return;
  list.innerHTML = "";
  if (!savedChats.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "Your conversations will appear here.";
    list.appendChild(empty);
    return;
  }
  savedChats.forEach(chat => {
    const row = document.createElement("div");
    row.className = "history-row" + (chat.id === currentConversationId ? " active" : "");
    const open = document.createElement("button");
    open.type = "button";
    open.className = "history-open";
    open.textContent = chat.title || "New conversation";
    open.title = open.textContent;
    open.addEventListener("click", () => openSavedConversation(chat.id));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "history-delete";
    remove.textContent = "×";
    remove.title = "Delete conversation";
    remove.setAttribute("aria-label", "Delete conversation");
    remove.addEventListener("click", event => {
      event.stopPropagation();
      savedChats = savedChats.filter(item => item.id !== chat.id);
      try { localStorage.setItem(historyStorageKey(), JSON.stringify(savedChats)); } catch (error) {}
      if (currentConversationId === chat.id) {
        currentConversationId = null;
        conversation = [];
        messages.innerHTML = "";
        welcome.style.display = "flex";
      }
      renderChatHistory();
    });
    row.append(open, remove);
    list.appendChild(row);
  });
}

function openSavedConversation(id) {
  const chat = savedChats.find(item => item.id === id);
  if (!chat || isSending) return;
  currentConversationId = chat.id;
  conversation = (chat.messages || []).map(item => ({ role: item.role, content: item.content }));
  messages.innerHTML = "";
  welcome.style.display = "none";
  conversation.forEach(item => addMessage(item.content, item.role === "user" ? "user" : "beru"));
  renderChatHistory();
  if (sidebar) sidebar.classList.remove("open");
}

async function sendToBeru() {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(currentSessionToken ? { "Authorization": "Bearer " + currentSessionToken } : {}) },
    body: JSON.stringify({ messages: conversation })
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("المحرك أرسل رداً غير مفهوم.");
  }

  if (!response.ok) {
    throw new Error(data.details || data.error || `HTTP ${response.status}`);
  }
  if (data.success === false) {
    throw new Error(data.details || data.error || "حدث خطأ في محرك BERU.");
  }

  const answer = data.reply || data.answer || data.response ||
    (data.result && (data.result.response || data.result.answer));

  if (typeof answer !== "string" || !answer.trim()) {
    console.error("BERU response:", data);
    throw new Error("لم يتم العثور على نص الإجابة.");
  }
  return answer.trim();
}

let pendingImage = null;
let speechRecognition = null;
let isListening = false;

function renderImageMessage(dataUrl, fileName) {
  const bubble = document.createElement("div");
  bubble.className = "message-bubble user-message image-message";
  const image = document.createElement("img");
  image.src = dataUrl;
  image.alt = fileName || "Attached image";
  image.className = "chat-attached-image";
  bubble.appendChild(image);
  if (fileName) {
    const caption = document.createElement("div");
    caption.className = "image-caption";
    caption.textContent = fileName;
    bubble.appendChild(caption);
  }
  messages.appendChild(bubble);
  bubble.scrollIntoView({ behavior: "smooth", block: "end" });
}

function showPendingImage(dataUrl, name) {
  const preview = document.getElementById("attachmentPreview");
  preview.innerHTML = "";
  const image = document.createElement("img");
  image.src = dataUrl;
  image.alt = "Image preview";
  const label = document.createElement("span");
  label.textContent = name;
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "×";
  remove.setAttribute("aria-label", "Remove image");
  remove.addEventListener("click", () => {
    pendingImage = null;
    preview.hidden = true;
    preview.innerHTML = "";
    document.getElementById("imageInput").value = "";
  });
  preview.append(image, label, remove);
  preview.hidden = false;
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Unsupported image file."));
      image.onload = () => {
        const maxSide = 1280;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

document.getElementById("attachImageBtn").addEventListener("click", () => document.getElementById("imageInput").click());
document.getElementById("imageInput").addEventListener("change", async event => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("Please choose an image.");
    event.target.value = "";
    return;
  }
  if (file.size > 12 * 1024 * 1024) {
    alert("Image is too large. Choose an image under 12 MB.");
    event.target.value = "";
    return;
  }
  try {
    const dataUrl = await resizeImage(file);
    pendingImage = { dataUrl, name: file.name };
    showPendingImage(dataUrl, file.name);
  } catch (error) {
    alert(error.message);
  }
});

async function sendCurrentMessage() {
  const text = userInput.value.trim();
  if ((!text && !pendingImage) || isSending || !currentSessionToken) return;
  isSending = true;
  welcome.style.display = "none";
  const imageToSend = pendingImage;
  const userContent = imageToSend
    ? [{ type: "text", text: text || "Please describe this image." }, { type: "image_url", image_url: { url: imageToSend.dataUrl } }]
    : text;
  addMessage(text || (imageToSend ? "Please describe this image." : ""), "user");
  if (imageToSend) renderImageMessage(imageToSend.dataUrl, imageToSend.name);
  conversation.push({ role: "user", content: userContent });
  saveCurrentConversation();
  userInput.value = "";
  pendingImage = null;
  document.getElementById("attachmentPreview").hidden = true;
  document.getElementById("attachmentPreview").innerHTML = "";
  document.getElementById("imageInput").value = "";

  const loading = addMessage("BERU AI is thinking...", "beru");
  try {
    const answer = await sendToBeru();
    loading.textContent = answer;
    conversation.push({ role: "assistant", content: answer });
    saveCurrentConversation();
  } catch (error) {
    console.error("BERU AI ERROR:", error);
    loading.textContent = imageToSend && /invalid conversation/i.test(error.message) ? "محرك BERU لا يدعم قراءة الصور بعد. يجب تفعيل نموذج الرؤية في خدمة المحرك." : "عذراً، لم يصل رد من المحرك: " + error.message;
    // Keep the user's message in the saved history even when the engine fails.
    // Do not silently erase the conversation from the history list.
    saveCurrentConversation();
  } finally {
    isSending = false;
    userInput.focus();
  }
}

chatForm.addEventListener("submit", async event => {
  event.preventDefault();
  await sendCurrentMessage();
});

const voiceBtn = document.getElementById("voiceBtn");
const voiceStatus = document.getElementById("voiceStatus");
let finalVoiceTranscript = "";

function resetVoiceButton() {
  isListening = false;
  voiceBtn.classList.remove("recording");
  voiceBtn.textContent = "🎙";
  voiceBtn.setAttribute("aria-label", "Start voice input");
  voiceBtn.title = "Start voice input";
}

function stopVoiceInput() {
  if (!speechRecognition) return;
  try { speechRecognition.stop(); } catch (error) { resetVoiceButton(); }
}

voiceBtn.addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (isListening && speechRecognition) {
    voiceStatus.textContent = "Stopping microphone…";
    stopVoiceInput();
    return;
  }

  if (!SpeechRecognition) {
    voiceStatus.textContent = "Voice input is not supported here. Open BERU in Google Chrome and allow microphone access.";
    resetVoiceButton();
    return;
  }

  finalVoiceTranscript = "";
  speechRecognition = new SpeechRecognition();
  speechRecognition.lang = ({ ar: "ar-TN", fr: "fr-FR", en: "en-US" })[localStorage.getItem("beru_language") || "en"];
  speechRecognition.interimResults = true;
  speechRecognition.continuous = false;
  speechRecognition.maxAlternatives = 1;

  speechRecognition.onstart = () => {
    isListening = true;
    voiceStatus.textContent = "Listening… speak now. Tap the microphone again to stop.";
    voiceBtn.classList.add("recording");
    voiceBtn.textContent = "■";
    voiceBtn.setAttribute("aria-label", "Stop voice input");
    voiceBtn.title = "Stop voice input";
  };

  speechRecognition.onresult = event => {
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const part = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalVoiceTranscript += part;
      else interimTranscript += part;
    }
    userInput.value = (finalVoiceTranscript + interimTranscript).trim();
  };

  speechRecognition.onerror = event => {
    const messages = {
      "not-allowed": "Microphone permission was denied. Allow microphone access in browser settings.",
      "service-not-allowed": "The browser blocked its speech service. Try Google Chrome and check your internet.",
      "network": "Speech recognition needs an internet connection. Check your connection and try again.",
      "no-speech": "No speech was detected. Tap the microphone and speak clearly.",
      "audio-capture": "No microphone was found or it is being used by another app."
    };
    voiceStatus.textContent = messages[event.error] || ("Voice input error: " + event.error);
    resetVoiceButton();
  };

  speechRecognition.onend = () => {
    resetVoiceButton();
    if (userInput.value.trim()) {
      voiceStatus.textContent = "Voice text captured. Review it, then press send.";
    } else if (!voiceStatus.textContent.startsWith("Microphone permission") &&
               !voiceStatus.textContent.startsWith("The browser") &&
               !voiceStatus.textContent.startsWith("Speech recognition") &&
               !voiceStatus.textContent.startsWith("No speech") &&
               !voiceStatus.textContent.startsWith("No microphone")) {
      voiceStatus.textContent = "Microphone stopped. No words were captured.";
    }
    speechRecognition = null;
  };

  try {
    voiceStatus.textContent = "Starting microphone…";
    speechRecognition.start();
  } catch (error) {
    resetVoiceButton();
    voiceStatus.textContent = "Could not start microphone. Please try again.";
    speechRecognition = null;
  }
});

newChat.addEventListener("click", function() {
  if (isSending) return;
  conversation = [];
  currentConversationId = null;
  messages.innerHTML = "";
  userInput.value = "";
  renderChatHistory();
  welcome.style.display = "flex";
  if (sidebar) sidebar.classList.remove("open");
});

menuBtn.addEventListener("click", function() {
  if (sidebar) sidebar.classList.toggle("open");
});

document.addEventListener("click", function(event) {
  if (sidebar && sidebar.classList.contains("open") &&
      !sidebar.contains(event.target) && !menuBtn.contains(event.target)) {
    sidebar.classList.remove("open");
  }
});

userInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

const mobileStyle = document.createElement("style");
mobileStyle.textContent = `
@media (max-width: 700px) {
  .sidebar.open {
    display: flex !important;
    position: fixed;
    z-index: 1000;
    top: 65px;
    bottom: 0;
    left: 0;
    width: 260px;
    min-height: auto;
    box-shadow: 10px 0 35px #000;
  }
}
`;
document.head.appendChild(mobileStyle);

console.log("BERU AI ENGINE and authentication initialized.");
