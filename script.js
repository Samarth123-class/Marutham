document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);

  const LOGIN_KEY = "marutham-farmer";

  function getFarmer() {
    try {
      return JSON.parse(localStorage.getItem(LOGIN_KEY)) || null;
    } catch {
      return null;
    }
  }

  function updateGreeting() {
    const farmer = getFarmer();
    const greeting = $("farmerGreeting");
    if (greeting) {
      greeting.textContent = farmer && farmer.name
        ? `Welcome, ${farmer.name}!`
        : "Healthy Soil, Better Crops.";
    }
  }

  // =====================================
  // ADMIN & PORTAL AUTHENTICATION
  // =====================================

  const ADMIN_CREDENTIALS = {
    username: "admin",
    password: "password123"
  };

  function checkAdminState() {
    const adminBtn = $("adminHeaderBtn");
    const topbarBtn = $("topbarLoginBtn");
    const session = JSON.parse(localStorage.getItem("marutham-session") || "null");

    if (session && session.role === "admin") {
      if (adminBtn) adminBtn.hidden = false;
      if (topbarBtn) {
        topbarBtn.textContent = "⚙️ Admin";
        topbarBtn.classList.add("logged-in");
      }
      if (typeof window.initRealTimeAdminMonitor === "function") {
        window.initRealTimeAdminMonitor();
      }
    } else {
      if (adminBtn) adminBtn.hidden = true;
      const farmer = getFarmer();
      if (topbarBtn) {
        if (farmer && farmer.name) {
          topbarBtn.textContent = `👤 ${farmer.name}`;
          topbarBtn.classList.add("logged-in");
        } else {
          topbarBtn.textContent = "👤 Login";
          topbarBtn.classList.remove("logged-in");
        }
      }
    }
  }

  window.handlePortalLogin = async function() {
    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value.trim();
    const role = $("loginRole").value;
    const feedback = $("loginFeedback");
    const btn = $("btnSubmitLogin");

    if (!email || !password) {
      feedback.style.color = "red";
      feedback.textContent = "Please fill in all details.";
      return;
    }

    btn.disabled = true;

    // 1. Admin Login Branch
    if (role === "admin") {
      if (email === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        feedback.style.color = "green";
        feedback.textContent = "Admin authorization successful. Loading live monitor...";

        const adminSession = {
          name: "System Admin",
          role: "admin",
          loggedInAt: new Date().toISOString()
        };
        localStorage.setItem("marutham-session", JSON.stringify(adminSession));

        setTimeout(() => {
          checkAdminState();
          showScreen("adminScreen");
          feedback.textContent = "";
          btn.disabled = false;
        }, 500);
        return;
      } else {
        feedback.style.color = "red";
        feedback.textContent = "Invalid Admin username or password.";
        btn.disabled = false;
        return;
      }
    }

    // 2. Farmer Login Branch
    try {
      const displayName = email.includes("@") ? email.split("@")[0] : email;
      const farmerProfile = {
        name: displayName,
        email: email,
        role: "farmer",
        farming: "Crop Farming"
      };

      localStorage.setItem(LOGIN_KEY, JSON.stringify(farmerProfile));
      localStorage.setItem("marutham-session", JSON.stringify(farmerProfile));

      if (window.db) {
        const { collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js");
        await addDoc(collection(window.db, "login_sessions"), {
          user: displayName,
          role: "farmer",
          timestamp: serverTimestamp()
        });
      }

      feedback.style.color = "green";
      feedback.textContent = `Welcome, ${displayName}! Redirecting...`;

      setTimeout(() => {
        updateGreeting();
        checkAdminState();
        showScreen("home");
        feedback.textContent = "";
        btn.disabled = false;
      }, 500);
    } catch (err) {
      console.error(err);
      feedback.style.color = "red";
      feedback.textContent = "Error signing in. Try again.";
      btn.disabled = false;
    }
  };

  window.logoutAdmin = function() {
    localStorage.removeItem("marutham-session");
    checkAdminState();
    showScreen("home");
  };

  // =====================================
  // SCREEN NAVIGATION & SCROLL LOCK RESET
  // =====================================

  function showScreen(screenName) {
    if (screenName === "profile") {
      editFarmerProfile();
      return;
    }

    if (screenName === "more") {
      alert("MARUTHAM\n\nSmart Agriculture Assistance\nYour Farm. Your Language. Your Smart Companion.");
      return;
    }

    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.remove("active");
    });

    const selected = $(screenName);
    if (!selected) return;

    selected.classList.add("active");

    document.querySelectorAll(".nav-item").forEach(button => {
      button.classList.toggle("active", button.dataset.screen === screenName);
    });

    // Reset both browser window & internal app container scroll
    window.scrollTo({ top: 0, behavior: "smooth" });
    const mainEl = document.querySelector("main");
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: "smooth" });
  }

  window.showScreen = showScreen;

  window.goToServices = function () {
    const services = document.querySelector(".service-grid");
    if (services) {
      services.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  function editFarmerProfile() {
    const farmer = getFarmer() || { name: "", farming: "" };
    const newName = prompt("Enter farmer name:", farmer.name);
    if (newName === null) return;
    const cleanName = newName.trim();
    if (!cleanName) return;

    const farmingOptions = ["Crop Farming", "Dairy Farming", "Poultry Farming", "Horticulture", "Organic Farming", "Other"];
    const choice = prompt("Choose farming type:\n" + farmingOptions.map((item, i) => `${i + 1}. ${item}`).join("\n"), "1");
    const index = Number(choice) - 1;
    const farming = (index >= 0 && index < farmingOptions.length) ? farmingOptions[index] : "Crop Farming";

    const updated = { name: cleanName, farming };
    localStorage.setItem(LOGIN_KEY, JSON.stringify(updated));
    updateGreeting();
    checkAdminState();
    alert("Profile updated!");
  }

  document.querySelectorAll("[data-screen]").forEach(button => {
    button.addEventListener("click", () => showScreen(button.dataset.screen));
  });

  if ($("navMic")) {
    $("navMic").addEventListener("click", () => {
      showScreen("voice");
      setTimeout(startVoice, 250);
    });
  }

  // =====================================
  // CROP DOCTOR & AI BACKEND
  // =====================================

  let selectedCropFile = null;
  let cropImageURL = null;

  if ($("cropImage")) {
    $("cropImage").addEventListener("change", event => {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        $("cropStatus").textContent = "Please select an image file.";
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        $("cropStatus").textContent = "Please choose an image smaller than 10 MB.";
        return;
      }

      selectedCropFile = file;
      if (cropImageURL) URL.revokeObjectURL(cropImageURL);
      cropImageURL = URL.createObjectURL(file);
      $("cropPreview").src = cropImageURL;
      $("cropStatus").textContent = "Image selected: " + file.name;
    });
  }

  if ($("resetCrop")) {
    $("resetCrop").addEventListener("click", () => {
      $("cropImage").value = "";
      selectedCropFile = null;
      if (cropImageURL) {
        URL.revokeObjectURL(cropImageURL);
        cropImageURL = null;
      }
      $("cropPreview").src = "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=900";
      $("cropStatus").textContent = "Select a crop image to begin.";
      $("cropResult").innerHTML = "<p>Upload a clear photo and describe the symptoms to receive basic next-step guidance.</p>";
      if ($("analyzeCrop")) $("analyzeCrop").disabled = false;
    });
  }

  const cropKnowledgeBase = {
    yellow: {
      diagnosis: "Chlorosis / Nitrogen Deficiency or Root Stress",
      action: "Check soil drainage to prevent waterlogging. If yellowing starts on older leaves, consider a balanced nitrogen feed or organic vermicompost."
    },
    spots: {
      diagnosis: "Fungal or Bacterial Leaf Spot (e.g. Cercospora or Alternaria)",
      action: "Avoid overhead irrigation that wets foliage. Prune severely affected leaves and consult your local KVK for recommended bio-fungicides."
    },
    holes: {
      diagnosis: "Chewing Insect / Caterpillar Infestation",
      action: "Examine leaf undersides for larvae. Apply neem-based crop care (Azadirachtin) or install pheromone traps."
    },
    wilting: {
      diagnosis: "Vascular Wilt or Moisture Stress",
      action: "Check root collar and moisture level near root zones. Ensure proper furrow drainage to avoid standing water."
    },
    rot: {
      diagnosis: "Collar Rot / Fungal Damping Off",
      action: "Isolate affected plants immediately. Reduce watering and apply Trichoderma-enriched compost around the base."
    },
    growth: {
      diagnosis: "Nutrient Stunting or Soil pH Imbalance",
      action: "Test soil pH and N-P-K levels before applying fertilizers. Refer to your Soil Health Card."
    },
    other: {
      diagnosis: "Unclassified Crop Stress",
      action: "Monitor for 48 hours. Take a clear close-up sample to your nearest Agriculture Extension Center or KVK."
    }
  };

  if ($("analyzeCrop")) {
    $("analyzeCrop").addEventListener("click", async () => {
      const crop = $("cropName").value.trim() || "Unspecified Crop";
      const symptom = $("cropSymptoms").value;
      const when = $("cropWhen").value;
      const status = $("cropStatus");
      const resultDiv = $("cropResult");
      const analyzeBtn = $("analyzeCrop");

      if (!selectedCropFile && !symptom) {
        status.textContent = "Please upload an image or select a symptom first.";
        return;
      }

      try {
        analyzeBtn.disabled = true;
        status.textContent = "Uploading image to Firebase Cloud Storage...";

        let downloadUrl = null;
        if (selectedCropFile && window.CropBackend) {
          downloadUrl = await window.CropBackend.uploadImage(selectedCropFile);
          status.textContent = "Recording diagnosis report in Firestore...";
        }

        const info = cropKnowledgeBase[symptom] || {
          diagnosis: "General Crop Health Inspection",
          action: "Maintain balanced irrigation and inspect crops regularly for pest activity."
        };

        if (window.CropBackend) {
          await window.CropBackend.saveDiagnosis({
            crop: crop,
            symptom: symptom || "visual_only",
            timeline: when || "Not specified",
            imageUrl: downloadUrl,
            diagnosis: info.diagnosis,
            recommendation: info.action,
            farmerProfile: getFarmer() || {}
          });
        }

        status.textContent = "✅ Analysis complete! Report saved to Firebase.";
        resultDiv.innerHTML = `
          <div style="background: #e8f5e9; padding: 12px; border-radius: 10px; border: 1px solid #c8e6c9;">
            <p style="margin: 0 0 6px 0; font-size: 13px;"><b>Crop:</b> ${crop}${when ? " · <b>First noticed:</b> " + when : ""}</p>
            <p style="margin: 0 0 6px 0; color: #064326; font-size: 13px;"><b>Diagnosis:</b> ${info.diagnosis}</p>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #183b27;"><b>Next Steps:</b> ${info.action}</p>
            ${downloadUrl ? `<p style="margin: 0; font-size: 11px;"><a href="${downloadUrl}" target="_blank" style="color: #168b3d; font-weight: bold;">View Cloud Image Backup ↗</a></p>` : ""}
          </div>
          <p class="disclaimer" style="margin-top: 8px;">General guidance. Always verify with your local agricultural officer before chemical treatments.</p>
        `;
      } catch (err) {
        console.error("AI Doctor Backend Error:", err);
        status.textContent = "Error saving diagnosis. Check internet connection.";
      } finally {
        analyzeBtn.disabled = false;
      }
    });
  }

  if ($("cropGuide")) {
    $("cropGuide").addEventListener("click", () => {
      if ($("analyzeCrop")) $("analyzeCrop").click();
    });
  }

  // =====================================
  // SOIL & VOICE LOGIC
  // =====================================

  let soilImageURL = null;
  if ($("soilImage")) {
    $("soilImage").addEventListener("change", event => {
      const file = event.target.files[0];
      if (!file) return;
      if (soilImageURL) URL.revokeObjectURL(soilImageURL);
      soilImageURL = URL.createObjectURL(file);
      $("soilPreview").src = soilImageURL;
      $("soilPreview").hidden = false;
    });
  }

  if ($("soilAnalyze")) {
    $("soilAnalyze").addEventListener("click", () => {
      const ph = $("soilPH").value.trim();
      const n = $("nitrogen").value.trim();
      const p = $("phosphorus").value.trim();
      const k = $("potassium").value.trim();

      if (!ph || !n || !p || !k) {
        $("soilOutput").innerHTML = "<h3>🌱 Soil Analysis Result</h3><p>Please enter all four values from your Soil Health Card report.</p>";
        return;
      }

      const phMessage = Number(ph) < 6.5 ? "Acidic" : Number(ph) > 7.5 ? "Alkaline" : "Near neutral";
      $("soilOutput").innerHTML = `
        <h3>🌱 Soil Report Summary</h3>
        <div class="nutrient-row">Soil pH: <b>${ph} (${phMessage})</b></div>
        <div class="nutrient-row">Nitrogen (N): <b>${n}</b></div>
        <div class="nutrient-row">Phosphorus (P): <b>${p}</b></div>
        <div class="nutrient-row">Potassium (K): <b>${k}</b></div>
      `;
    });
  }

  if ($("soilGuide")) {
    $("soilGuide").addEventListener("click", () => {
      const crop = $("soilCrop").value.trim();
      const concern = $("soilConcern").value;
      if (!crop || !concern) {
        $("soilGuideOutput").textContent = "Please enter crop and problem.";
        return;
      }
      $("soilGuideOutput").textContent = `For ${crop}: Ensure adequate drainage, use certified compost, and perform a regular soil test.`;
    });
  }

  // Voice Assistant
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;
  const chatArea = document.querySelector(".chat-area");

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = /[\u0C80-\u0CFF]/.test(text) ? "kn-IN" : "en-IN";
    window.speechSynthesis.speak(speech);
  }

  function addChatMessage(message, sender) {
    if (!chatArea) return;
    const element = document.createElement("div");
    element.className = sender === "user" ? "chat-message user-message" : "chat-message assistant-message";
    if (sender === "assistant") {
      element.innerHTML = `<span class="chat-logo">🌿</span><div>${message}</div>`;
    } else {
      element.textContent = message;
    }
    chatArea.appendChild(element);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function processQuestion(question) {
    const q = question.toLowerCase().trim();
    if (!q) return;
    const answer = "Hello! Marutham AI assistant is ready to help you with crops, soil tests, weather, and government schemes.";
    addChatMessage(question, "user");
    addChatMessage(answer, "assistant");
    speak(answer);
  }

  function sendTextMessage() {
    const input = $("messageInput");
    if (!input || !input.value.trim()) return;
    const q = input.value.trim();
    input.value = "";
    processQuestion(q);
  }

  if ($("sendMessage")) $("sendMessage").addEventListener("click", sendTextMessage);
  if ($("messageInput")) {
    $("messageInput").addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendTextMessage();
      }
    });
  }

  function startVoice() {
    if (!SpeechRecognition) {
      if ($("voiceStatus")) $("voiceStatus").textContent = "Voice not supported in this browser.";
      return;
    }
    if (listening) {
      recognition.stop();
      return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = "kn-IN";
    recognition.onstart = () => {
      listening = true;
      $("voiceStatus").textContent = "Listening...";
    };
    recognition.onresult = e => {
      const q = e.results[0][0].transcript;
      processQuestion(q);
    };
    recognition.onend = () => {
      listening = false;
      $("voiceStatus").textContent = "Tap to speak again";
    };
    recognition.start();
  }

  if ($("voiceButton")) $("voiceButton").addEventListener("click", startVoice);
  if ($("stopVoice")) {
    $("stopVoice").addEventListener("click", () => {
      if (recognition) recognition.stop();
      window.speechSynthesis?.cancel();
    });
  }

  // Initial State Check
  updateGreeting();
  checkAdminState();
  showScreen("home");
});