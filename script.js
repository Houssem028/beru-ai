
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const newChat = document.getElementById("newChat");
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.querySelector(".sidebar");

// Add a message to the conversation
function addMessage(text, sender) {
  const message = document.createElement("div");

  message.style.padding = "15px 18px";
  message.style.marginBottom = "14px";
  message.style.borderRadius = "14px";
  message.style.lineHeight = "1.7";
  message.style.whiteSpace = "pre-wrap";
  message.style.overflowWrap = "anywhere";

  if (sender === "user") {
    message.style.background = "#351052";
    message.style.border = "1px solid #9636d5";
    message.style.marginLeft = "auto";
  } else {
    message.style.background = "rgba(20,10,32,.95)";
    message.style.border = "1px solid #68269a";
    message.style.marginRight = "auto";
  }

  message.style.maxWidth = "85%";
  message.textContent = text;

  messages.appendChild(message);
  messages.scrollIntoView({
    behavior: "smooth",
    block: "end"
  });
}

// Send a message
chatForm.addEventListener("submit", function(event) {
  event.preventDefault();

  const text = userInput.value.trim();

  if (!text) return;

  welcome.style.display = "none";

  addMessage(text, "user");

  userInput.value = "";

  setTimeout(function() {
    addMessage(
      "مرحباً! أنا BERU AI. واجهة المحادثة تعمل بنجاح. يجري تجهيز محرك الذكاء الاصطناعي الخاص بي. قريباً سأتمكن من الإجابة عن أسئلتك.",
      "beru"
    );
  }, 500);
});

// New conversation
newChat.addEventListener("click", function() {
  messages.innerHTML = "";
  userInput.value = "";
  welcome.style.display = "flex";

  if (sidebar) sidebar.classList.remove("open");
});

// Mobile menu
menuBtn.addEventListener("click", function() {
  if (sidebar) {
    sidebar.classList.toggle("open");
  }
});

// Close mobile menu after choosing an action
document.addEventListener("click", function(event) {
  if (
    sidebar &&
    sidebar.classList.contains("open") &&
    !sidebar.contains(event.target) &&
    event.target !== menuBtn
  ) {
    sidebar.classList.remove("open");
  }
});

// Enter to send, Shift + Enter for a new line
userInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

// Mobile sidebar appearance
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

console.log("BERU AI interface initialized successfully.");
      
