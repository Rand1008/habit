// Timer State Variables
let timerInterval, timerStart = 0, isRunning = false;
let isTimedRunning = false, timedDuration = 0;
let habitName = "", history = [], addedHabits = [];

// Save habit session to Firestore
async function saveHabitHistory(habit, duration) {
  const user = window.auth.currentUser;
  if (!user) return console.log("User not logged in");

  try {
    await window.db.collection("habitHistory").add({
      userId: user.uid,
      habitName: habit,
      duration,
      timestamp: new Date(),
    });
    console.log("History saved to Firestore!");
  } catch (error) {
    console.error("Error saving history:", error);
  }
}

// Save habit to Firestore and update list
async function saveHabitToFirestore(habitName) {
  const user = window.auth.currentUser;
  if (!user) return alert("You must be logged in to add a habit.");

  try {
    await window.db.collection("users").doc(user.uid).collection("habits").doc(habitName).set({
      name: habitName,
      streak: 0,
      addedDate: new Date().toISOString()
    });

    addedHabits.push(habitName);
    updateHabitListUI();
    console.log("Habit saved to Firestore!");
  } catch (error) {
    console.error("Error saving habit:", error);
  }
}

// Update the habit list UI
function updateHabitListUI() {
  const habitList = document.getElementById("habitList");
  habitList.innerHTML = "";

  if (!addedHabits.length) {
    const li = document.createElement("li");
    li.textContent = "No habits found.";
    habitList.appendChild(li);
    return;
  }

  addedHabits.forEach(habit => {
    const li = document.createElement("li");
    li.textContent = habit;
    habitList.appendChild(li);
  });
}

// Load user's habits from Firestore
async function loadUserHabits() {
  const user = window.auth.currentUser;
  if (!user) return;

  try {
    const snapshot = await window.db.collection("users").doc(user.uid).collection("habits").get();
    addedHabits = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data?.name) {
        addedHabits.push(data.name);
      }
    });

    console.log("Loaded habits:", addedHabits);
    updateHabitListUI();
  } catch (err) {
    console.error("Failed to load habits:", err.message);
  }
}

// Load user's past habit history from Firestore
async function loadUserHistory() {
  const user = window.auth.currentUser;
  if (!user) return;

  try {
    const snapshot = await window.db.collection("habitHistory")
      .where("userId", "==", user.uid)
      .orderBy("timestamp", "desc")
      .get();

    snapshot.forEach((doc) => {
      const data = doc.data();
      history.push(`Habit: ${data.habitName} | Time: ${data.duration}`);
    });

    updateHistoryUI();
  } catch (err) {
    console.error("Failed to load history:", err.message);
  }
}

// Load username from Firestore
async function loadUserUsername(DOM) {
  const user = window.auth.currentUser;
  if (!user) return;

  try {
    const userRef = window.db.collection("users").doc(user.uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data();
    DOM.usernameSpan.textContent = userData?.username || user.email || "User";
  } catch (err) {
    console.error("Failed to load username:", err.message);
  }
}

// On DOM Content Loaded
document.addEventListener("DOMContentLoaded", async () => {
  const DOM = {
    addHabitBtn: document.getElementById("addHabitBtn"),
    habitNameInput: document.getElementById("habitName"),
    trackerSection: document.getElementById("trackerSection"),
    habitTitle: document.getElementById("habitTitle"),
    startStopBtn: document.getElementById("startStopBtn"),
    timeDisplay: document.getElementById("timeDisplay"),
    progress: document.getElementById("progress"),
    historyList: document.getElementById("historyList"),
    timedTrackerSection: document.getElementById("timedTrackerSection"),
    startTimedTrackerBtn: document.getElementById("startTimedTrackerBtn"),
    durationInput: document.getElementById("duration"),
    timerTypeModal: document.getElementById("timerTypeModal"),
    manualTimerRadio: document.getElementById("manualTimer"),
    timedTrackerRadio: document.getElementById("timedTracker"),
    confirmTimerChoiceBtn: document.getElementById("confirmTimerChoice"),
    cancelTimerChoiceBtn: document.getElementById("cancelTimerChoice"),
    usernameSpan: document.getElementById("usernameSpan"),
    habitList: document.getElementById("habitList")
  };

  DOM.addHabitBtn.addEventListener("click", () => {
    habitName = DOM.habitNameInput.value.trim();
    if (!habitName) return alert("Please enter a habit name.");

    console.log("Habit name:", habitName);
    DOM.habitTitle.textContent = `Tracking Habit: ${habitName}`;
    DOM.habitNameInput.value = "";

    saveHabitToFirestore(habitName);
    showTimerTypeModal();
  });

  function showTimerTypeModal() {
    DOM.timerTypeModal.style.display = "flex";
  }

  function hideTimerTypeModal() {
    DOM.timerTypeModal.style.display = "none";
  }

  DOM.confirmTimerChoiceBtn.addEventListener("click", () => {
    if (DOM.manualTimerRadio.checked) {
      DOM.trackerSection.style.display = "block";
      DOM.timedTrackerSection.style.display = "none";
      DOM.startStopBtn.style.display = "inline-block";
    } else if (DOM.timedTrackerRadio.checked) {
      DOM.trackerSection.style.display = "none";
      DOM.timedTrackerSection.style.display = "block";
    }
    hideTimerTypeModal();
  });

  DOM.cancelTimerChoiceBtn.addEventListener("click", hideTimerTypeModal);

  DOM.startStopBtn.addEventListener("click", () => {
    isRunning ? stopManualTimer() : startManualTimer();
  });

  function startManualTimer() {
    isRunning = true;
    timerStart = 0;
    DOM.startStopBtn.textContent = "Stop";
    DOM.progress.style.width = "0%";

    timerInterval = setInterval(() => {
      timerStart++;
      const minutes = Math.floor(timerStart / 60);
      const seconds = timerStart % 60;
      DOM.timeDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      DOM.progress.style.width = `${(timerStart / 60) * 100}%`;
    }, 1000);
  }

  function stopManualTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    DOM.startStopBtn.textContent = "Start";

    const minutes = Math.floor(timerStart / 60);
    const seconds = timerStart % 60;
    const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    history.push(`Habit: ${habitName} | Time: ${formatted}`);
    saveHabitHistory(habitName, formatted);
    updateHistoryUI();
  }

  function updateHistoryUI() {
    DOM.historyList.innerHTML = "";
    history.forEach(session => {
      const li = document.createElement("li");
      li.textContent = session;
      DOM.historyList.appendChild(li);
    });
  }

  DOM.startTimedTrackerBtn.addEventListener("click", () => {
    timedDuration = parseInt(DOM.durationInput.value);
    if (!timedDuration || timedDuration <= 0) return alert("Please enter a valid duration.");

    isTimedRunning = true;
    const endTime = Date.now() + timedDuration * 60000;

    DOM.trackerSection.style.display = "block";
    DOM.startStopBtn.style.display = "none";
    DOM.startTimedTrackerBtn.disabled = true;

    const timerIntervalTimed = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      DOM.timeDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      DOM.progress.style.width = `${100 - (remaining / (timedDuration * 60000)) * 100}%`;

      if (remaining === 0) {
        clearInterval(timerIntervalTimed);
        const label = `Timed Habit: ${habitName} | Duration: ${timedDuration} minutes`;
        history.push(label);
        saveHabitHistory(habitName, `${timedDuration} minutes`);
        updateHistoryUI();

        DOM.trackerSection.style.display = "none";
        DOM.startTimedTrackerBtn.disabled = false;
        DOM.timeDisplay.textContent = "00:00";
        DOM.progress.style.width = "0%";
      }
    }, 1000);
  });

  window.auth.onAuthStateChanged(async (user) => {
    if (user) {
      await loadUserHabits();
      await loadUserHistory();
      await loadUserUsername(DOM);
    } else {
      console.warn("No user signed in");
    }
  });
});
function updateTimerDisplay() {
  totalTime = Date.now() - startTime;
  const seconds = Math.floor(totalTime / 1000) % 60;
  const minutes = Math.floor(totalTime / (1000 * 60)) % 60;
  const hours = Math.floor(totalTime / (1000 * 60 * 60));
  timerDisplay.textContent = `${hours}:${minutes}:${seconds}`;

  // Update progress bar toward a goal (e.g. 3600 seconds = 1 hour)
  const goalSeconds = 3600; // 1 hour
  const progress = Math.min(totalTime / 1000, goalSeconds);
  document.getElementById('habitProgress').value = progress;

  const percent = Math.min((progress / goalSeconds) * 100, 100).toFixed(0);
  document.getElementById('progressText').textContent = `${percent}%`;
}
