
const API_URL =
  "https://beru-ai-engine.mmzhoussem.workers.dev";

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const newChat = document.getElementById("newChat");
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.querySelector(".sidebar");

let conversation = [];
let isSending = false;

// Display a message
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

  message.scrollIntoView({
    behavior: "smooth",
    block: "end"
  });

  return message;
}

// Send message to BERU AI ENGINE
async function sendToBeru(text) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: conversation
    })
  });

  const data = await response.json();

  if (!response.ok || !data.success || !data.reply) {
    throw new Error(
      data.error || "BERU AI could not answer."
    );
  }

  return data.reply;
}

// Chat submission
chatForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  const text = userInput.value.trim();

  if (!text || isSending) return;

  isSending = true;

  welcome.style.display = "none";

  addMessage(text, "user");

  conversation.push({
    role: "user",
    content: text
  });

  userInput.value = "";

  const loading = addMessage(
    "BERU AI is thinking...",
    "beru"
  );

  try {
    const answer = await sendToBeru(text);

    loading.textContent = answer;

    conversation.push({
      role: "assistant",
      content: answer
    });

  } catch (error) {
    console.error("BERU AI:", error);

    loading.textContent =
      "عذراً، لم أتمكن من الاتصال بمحرك BERU AI. حاول مرة أخرى.";

    conversation.pop();

  } finally {
    isSending = false;
    userInput.focus();
  }
});

// Start a new conversation
newChat.addEventListener("click", function() {
  if (isSending) return;

  conversation = [];
  messages.innerHTML = "";
  userInput.value = "";

  welcome.style.display = "flex";

  if (sidebar) {
    sidebar.classList.remove("open");
  }
});

// Mobile menu
menuBtn.addEventListener("click", function() {
  if (sidebar) {
    sidebar.classList.toggle("open");
  }
});

// Close mobile sidebar
document.addEventListener("click", function(event) {
  if (
    sidebar &&
    sidebar.classList.contains("open") &&
    !sidebar.contains(event.target) &&
    !menuBtn.contains(event.target)
  ) {
    sidebar.classList.remove("open");
  }
});

// Enter to send
userInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

// Mobile sidebar styling
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

console.log("BERU AI ENGINE connected.");
