// ===== CONFIG =====
// Replace the BACKEND_URL string with your backend URL after deploying the server.
// Examples:
// - Local testing (backend running on your machine): "http://localhost:5000"
// - Deployed Render/Heroku: "https://mychat-backend.onrender.com"
const BACKEND_URL = "https://live-chat-y7ax.onrender.com";
// ====================

const finalBackendUrl = (() => {
  if (BACKEND_URL && BACKEND_URL.trim() !== "") return BACKEND_URL.trim();
  // if frontend served from same origin as backend, use empty to connect to same host
  // For local testing with backend on localhost:5000, set BACKEND_URL above.
  return window.location.origin;
})();

const socket = io(finalBackendUrl, { transports: ["websocket", "polling"] });

const createBtn = document.getElementById("createBtn");
const showJoin = document.getElementById("showJoin");
const joinPanel = document.getElementById("joinPanel");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const cancelJoin = document.getElementById("cancelJoin");
const joinError = document.getElementById("joinError");
const usernameInput = document.getElementById("usernameInput");
const joinCodeInput = document.getElementById("joinCode");
const home = document.getElementById("home");
const roomSection = document.getElementById("roomSection");
const roomDisplay = document.getElementById("roomDisplay");
const messagesDiv = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const leaveBtn = document.getElementById("leaveBtn");
const youDisplay = document.getElementById("youDisplay");

let currentRoom = "";
let username = "";

function appendMessage(text, cls){
  const div = document.createElement("div");
  div.className = "message " + cls;
  div.innerHTML = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

createBtn.onclick = () => {
  username = usernameInput.value.trim();
  if (!username) { alert("Please enter a display name first."); return; }
  socket.emit("createRoom");
};

showJoin.onclick = () => {
  joinPanel.classList.remove("hidden");
};

cancelJoin.onclick = () => {
  joinPanel.classList.add("hidden");
  joinError.textContent = "";
};

socket.on("connect", () => {
  console.log("connected to backend", socket.id);
});

socket.on("roomCreated", (code) => {
  currentRoom = code;
  roomDisplay.textContent = code;
  youDisplay.textContent = username ? "[" + username + "]" : "";
  home.classList.add("hidden");
  joinPanel.classList.add("hidden");
  roomSection.classList.remove("hidden");
  appendMessage("🔒 Room created. Share this code to let others join: <strong>" + code + "</strong>", "msg-other");
});

joinRoomBtn.onclick = () => {
  username = usernameInput.value.trim();
  if (!username) { alert("Please enter a display name first."); return; }
  const code = joinCodeInput.value.trim().toUpperCase();
  if (!/^[A-Z]{6}$/.test(code)) { joinError.textContent = "Code must be 6 uppercase letters."; return; }
  socket.emit("joinRoom", { roomCode: code, username });
};

socket.on("joinedRoom", (data) => {
  currentRoom = data.roomCode;
  roomDisplay.textContent = currentRoom;
  youDisplay.textContent = username ? "[" + username + "]" : "";
  home.classList.add("hidden");
  joinPanel.classList.add("hidden");
  roomSection.classList.remove("hidden");
  appendMessage("🔔 Joined room: <strong>" + currentRoom + "</strong>", "msg-other");
  if (data.history && data.history.length) {
    appendMessage("— Last messages in this room —", "msg-other");
    data.history.forEach(m => appendMessage(m, "msg-other"));
  }
});

socket.on("errorMsg", (msg) => {
  joinError.textContent = msg;
});

sendBtn.onclick = () => {
  const text = msgInput.value.trim();
  if (!text) return;
  const payload = { roomCode: currentRoom, username, text, ts: Date.now() };
  socket.emit("sendMessage", payload);
  appendMessage("<strong>" + username + ":</strong> " + (text), "msg-self");
  msgInput.value = "";
};

socket.on("receiveMessage", (payload) => {
  // payload: { username, text, ts }
  if (!payload || !payload.text) return;
  appendMessage("<strong>" + (payload.username || "Anon") + ":</strong> " + payload.text, "msg-other");
});

socket.on("notification", (txt) => appendMessage("🔔 " + txt, "msg-other"));

leaveBtn.onclick = () => {
  if (!currentRoom) return;
  socket.emit("leaveRoom", currentRoom);
  location.reload();
};

window.addEventListener("beforeunload", () => {
  if (socket && socket.connected) socket.disconnect();
});
