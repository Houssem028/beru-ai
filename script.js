
const API_URL = "https://beru-ai-engine.mmzhoussem.workers.dev";
const AUTH_URL = "https://beru-auth-engine.mmzhoussem.workers.dev";
const GOOGLE_CLIENT_ID = "1029198003465-bs891ka49b1j2a1rm5m60cnog5vtalm3.apps.googleusercontent.com";
const SESSION_KEY = "beru_session_token";

const authScreen = document.getElementById("authScreen");
const beruApp = document.getElementById("beruApp");
const authStatus = document.getElementById("authStatus");
const googleButton = document.getElementById("googleButton");
const accountName = document.getElementById("accountName");
const logoutBtn = document.getElementById("logoutBtn");

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

function showAuthenticatedApp(user) {
  authScreen.style.display = "none";
  beruApp.classList.add("authenticated");
  accountName.textContent = user && user.name ? user.name : "Account";
}

function showLoginScreen(message) {
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

    showAuthenticatedApp(data.user);
  } catch (error) {
    localStorage.removeItem(SESSION_KEY);
    currentSessionToken = null;
    showLoginScreen("Please sign in again to continue.");
  }
}

async function handleGoogleCredential(response) {
  setAuthStatus("Verifying your Google account...");
  try {
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
    showAuthenticatedApp(data.user);
  } catch (error) {
    console.error("BERU AUTH ERROR:", error);
    setAuthStatus(error.message || "Unable to sign in. Please try again.", true);
  }
}

function initializeGoogleSignIn() {
  if (!window.google || !window.google.accounts || !googleButton) return;
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
  if (window.google && window.google.accounts) {
    clearInterval(googleWaiter);
    initializeGoogleSignIn();
  } else if (googleWaitCount > 40) {
    clearInterval(googleWaiter);
    setAuthStatus("Google sign-in could not load. Check your internet and refresh.", true);
  }
}, 250);

verifyExistingSession();

logoutBtn.addEventListener("click", async function() {
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
  conversation = [];
  messages.innerHTML = "";
  welcome.style.display = "flex";
  showLoginScreen("You have been signed out.");
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

async function sendToBeru() {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

chatForm.addEventListener("submit", async function(event) {
  event.preventDefault();
  const text = userInput.value.trim();
  if (!text || isSending || !currentSessionToken) return;

  isSending = true;
  welcome.style.display = "none";
  addMessage(text, "user");
  conversation.push({ role: "user", content: text });
  userInput.value = "";

  const loading = addMessage("BERU AI is thinking...", "beru");
  try {
    const answer = await sendToBeru();
    loading.textContent = answer;
    conversation.push({ role: "assistant", content: answer });
  } catch (error) {
    console.error("BERU AI ERROR:", error);
    loading.textContent = "عذراً، حدث خطأ: " + error.message;
    conversation.pop();
  } finally {
    isSending = false;
    userInput.focus();
  }
});

newChat.addEventListener("click", function() {
  if (isSending) return;
  conversation = [];
  messages.innerHTML = "";
  userInput.value = "";
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
