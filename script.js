/**
 * MARUTHAM - Smart Agri-Tech Platform
 * Handlers for Dynamic Greetings, Profile State, AI Chat, Disease Scanner & Local Database
 */

// ==========================================
// 1. Initial State & In-Memory / Local Storage Database
// ==========================================
const DEFAULT_FARM_DATA = [
  { id: 1, date: "2026-11-08 07:30", plot: "Plot A - Paddy", type: "Irrigation", notes: "Drip irrigation active for 2.5 hrs" },
  { id: 2, date: "2026-11-07 16:15", plot: "Plot C - Groundnut", type: "Fertilizer", notes: "Applied gypsum & micronutrient spray" }
];

const DEFAULT_PROFILE = {
  name: "Ramanathan K.",
  farm: "Kaveri Delta Agro Farm",
  crop: "Paddy & Groundnut"
};

// Agricultural knowledge base for offline AI assistance
const AGRI_KNOWLEDGE_BASE = [
  { keywords: ["yellow", "chlorosis", "leaf", "leaves"], response: "Yellowing leaves often indicate nitrogen deficiency or root saturation. Check soil moisture and consider applying foliar spray of 1% urea or chelated iron." },
  { keywords: ["blast", "fungus", "spot", "brown"], response: "For brown leaf spots and blast disease, apply Tricyclazole 75 WP @ 0.6g/liter or Pseudomonas fluorescens biological culture (10g/L)." },
  { keywords: ["fertilizer", "npk", "urea", "dose"], response: "Standard basal application for paddy is 50:25:25 kg NPK/ha, split-applying Nitrogen at tillering and panicle initiation stages." },
  { keywords: ["price", "market", "mandi", "rate"], response: "Current estimated Mandi rate: Grade-A Paddy is trading around ₹2,320/quintal; Groundnut around ₹6,600/quintal." }
];

// Load records and profile from LocalStorage or initialize
let farmDatabase = JSON.parse(localStorage.getItem("marutham_records")) || DEFAULT_FARM_DATA;
let farmerProfile = JSON.parse(localStorage.getItem("marutham_profile")) || DEFAULT_PROFILE;

// ==========================================
// 2. Dynamic Greetings Engine (Top Header)
// ==========================================
function updateGreeting() {
  const greetingTextEl = document.getElementById("greeting-text");
  const greetingSubEl = document.getElementById("greeting-sub");
  const greetingIconEl = document.getElementById("greeting-icon");

  const hour = new Date().getHours();
  let greeting = "Good Evening";
  let subText = "Reviewing evening soil humidity & sensor alerts";
  let iconClass = "ph-moon";

  if (hour >= 5 && hour < 12) {
    greeting = "Good Morning";
    subText = "Favorable morning dew levels for field inspection";
    iconClass = "ph-sun-dim";
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good Afternoon";
    subText = "Peak sunlight hours: monitor irrigation channels";
    iconClass = "ph-sun";
  }

  greetingTextEl.textContent = `${greeting}, ${farmerProfile.name.split(" ")[0]}!`;
  greetingSubEl.textContent = subText;
  greetingIconEl.className = `ph ${iconClass}`;
}

// ==========================================
// 3. Farmer Profile State & Dropdown
// ==========================================
const profileToggleBtn = document.getElementById("profile-toggle-btn");
const profileModal = document.getElementById("profile-modal");
const closeProfileBtn = document.getElementById("close-profile-modal");
const saveProfileBtn = document.getElementById("save-profile-btn");

function applyProfileUI() {
  document.getElementById("nav-user-name").textContent = farmerProfile.name;
  document.querySelector(".profile-role").textContent = farmerProfile.farm;
  document.getElementById("farmer-name-input").value = farmerProfile.name;
  document.getElementById("farm-name-input").value = farmerProfile.farm;
  document.getElementById("primary-crop-input").value = farmerProfile.crop;
}

profileToggleBtn.addEventListener("click", () => {
  profileModal.classList.toggle("hidden");
});

closeProfileBtn.addEventListener("click", () => {
  profileModal.classList.add("hidden");
});

saveProfileBtn.addEventListener("click", () => {
  farmerProfile.name = document.getElementById("farmer-name-input").value.trim() || farmerProfile.name;
  farmerProfile.farm = document.getElementById("farm-name-input").value.trim() || farmerProfile.farm;
  farmerProfile.crop = document.getElementById("primary-crop-input").value.trim() || farmerProfile.crop;
  
  localStorage.setItem("marutham_profile", JSON.stringify(farmerProfile));
  applyProfileUI();
  updateGreeting();
  profileModal.classList.add("hidden");
});

// ==========================================
// 4. AI Agronomist Chat Engine
// ==========================================
const chatStream = document.getElementById("chat-stream");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const clearChatBtn = document.getElementById("clear-chat-btn");

function appendChatMessage(sender, text) {
  const msgEl = document.createElement("div");
  msgEl.className = `message ${sender === "user" ? "message-user" : "message-ai"}`;
  msgEl.innerHTML = text;
  chatStream.appendChild(msgEl);
  chatStream.scrollTop = chatStream.scrollHeight;
}

function generateAIResponse(query) {
  const lower = query.toLowerCase();
  for (const item of AGRI_KNOWLEDGE_BASE) {
    if (item.keywords.some(k => lower.includes(k))) {
      return item.response;
    }
  }
  return "Query registered in agricultural records. Our agro-pathology model recommends taking a photo via the Leaf Scanner below to inspect for nutrient deficits or fungal traces.";
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  // Add User Message
  appendChatMessage("user", text);
  chatInput.value = "";

  // Simulate AI response delay
  setTimeout(() => {
    const aiAnswer = generateAIResponse(text);
    appendChatMessage("ai", aiAnswer);
  }, 500);
});

clearChatBtn.addEventListener("click", () => {
  chatStream.innerHTML = "";
  appendChatMessage("ai", `Vanakkam ${farmerProfile.name}! I am your MARUTHAM AI Agronomist. How can I help your crop today?`);
});

// ==========================================
// 5. Leaf Health Scanner
// ==========================================
const dropZone = document.getElementById("drop-zone");
const leafImageInput = document.getElementById("leaf-image-input");
const dropzoneContent = document.getElementById("dropzone-content");
const imagePreview = document.getElementById("image-preview");
const scanResults = document.getElementById("scan-results");

dropZone.addEventListener("click", () => leafImageInput.click());

leafImageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    imagePreview.src = event.target.result;
    imagePreview.classList.remove("hidden");
    dropzoneContent.classList.add("hidden");
    runScanAnalysis();
  };
  reader.readAsDataURL(file);
});

function runScanAnalysis() {
  scanResults.classList.remove("hidden");
  const resultBadge = document.getElementById("result-status");
  resultBadge.textContent = "AI Model Diagnosing...";
  resultBadge.style.color = "#f39c12";

  setTimeout(() => {
    resultBadge.textContent = "Infection Detected (Confidence: 94.2%)";
    resultBadge.style.color = "#e74c3c";
  }, 900);
}

// ==========================================
// 6. Farm Database & Activity Table Operations
// ==========================================
const recordsTbody = document.getElementById("records-tbody");
const activityForm = document.getElementById("activity-form");

function renderDatabaseTable() {
  recordsTbody.innerHTML = "";
  farmDatabase.forEach((record) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${record.date}</td>
      <td><strong>${record.plot}</strong></td>
      <td>${record.type}</td>
      <td>${record.notes}</td>
      <td><button class="btn-icon" onclick="deleteRecord(${record.id})"><i class="ph ph-trash"></i></button></td>
    `;
    recordsTbody.appendChild(tr);
  });
}

function saveDatabase() {
  localStorage.setItem("marutham_records", JSON.stringify(farmDatabase));
  renderDatabaseTable();
}

activityForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const plot = document.getElementById("activity-plot").value;
  const type = document.getElementById("activity-type").value;
  const notes = document.getElementById("activity-notes").value;

  const now = new Date();
  const dateStr = `${now.toISOString().split("T")[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  farmDatabase.unshift({
    id: Date.now(),
    date: dateStr,
    plot,
    type,
    notes
  });

  saveDatabase();
  activityForm.reset();
});

window.deleteRecord = function(id) {
  farmDatabase = farmDatabase.filter(r => r.id !== id);
  saveDatabase();
};

// ==========================================
// 7. Initialization
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
  applyProfileUI();
  updateGreeting();
  renderDatabaseTable();
  appendChatMessage("ai", `Vanakkam <strong>${farmerProfile.name}</strong>! I am your MARUTHAM AI Agronomist. How can I assist your crop management today?`);
});
                                  
