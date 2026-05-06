const STORAGE_KEY = "mindfulMomentumState";
const DAY_MS = 24 * 60 * 60 * 1000;
const CIRCLE_LENGTH = 364.42;

const defaultHabits = [
  {
    id: "morning-meditation",
    name: "Morning meditation",
    category: "Mindfulness",
    icon: "self_improvement",
    createdAt: dateKey(addDays(new Date(), -14)),
    completions: {}
  },
  {
    id: "water-intake",
    name: "Hydration check",
    category: "Health",
    icon: "water_drop",
    createdAt: dateKey(addDays(new Date(), -22)),
    completions: {}
  },
  {
    id: "deep-work",
    name: "Deep focus block",
    category: "Focus",
    icon: "timer",
    createdAt: dateKey(addDays(new Date(), -10)),
    completions: {}
  },
  {
    id: "evening-reading",
    name: "Read ten pages",
    category: "Learning",
    icon: "menu_book",
    createdAt: dateKey(addDays(new Date(), -8)),
    completions: {}
  }
];

const state = loadState();

const elements = {
  screens: document.querySelectorAll(".screen"),
  navItems: document.querySelectorAll("[data-nav-target]"),
  title: document.querySelector("#screen-title"),
  todayDate: document.querySelector("#today-date"),
  todayHabits: document.querySelector("#today-habits"),
  libraryHabits: document.querySelector("#library-habits"),
  todayRing: document.querySelector("#today-ring"),
  todayScore: document.querySelector("#today-score"),
  todaySummary: document.querySelector("#today-summary"),
  nextHabitTitle: document.querySelector("#next-habit-title"),
  nextHabitMeta: document.querySelector("#next-habit-meta"),
  weekChart: document.querySelector("#week-chart"),
  completedTotal: document.querySelector("#completed-total"),
  bestStreak: document.querySelector("#best-streak"),
  achievementCount: document.querySelector("#achievement-count"),
  wellnessScore: document.querySelector("#wellness-score"),
  achievementGrid: document.querySelector("#achievement-grid"),
  profileStreakChip: document.querySelector("#profile-streak-chip"),
  dialog: document.querySelector("#habit-dialog"),
  habitForm: document.querySelector("#habit-form"),
  reminderToggle: document.querySelector("#reminder-toggle"),
  toast: document.querySelector("#toast")
};

bootstrap();

function bootstrap() {
  seedCompletionHistory();
  saveState();
  wireEvents();
  render();
}

function wireEvents() {
  elements.navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const target = item.dataset.navTarget;
      if (target) setScreen(target);
    });
  });

  document.querySelectorAll("[data-open-add]").forEach((button) => {
    button.addEventListener("click", () => openHabitDialog());
  });

  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => closeHabitDialog());
  });

  elements.habitForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(elements.habitForm);
    addHabit({
      name: formData.get("name").toString().trim(),
      category: formData.get("category").toString(),
      icon: formData.get("icon").toString()
    });
  });

  document.querySelector("[data-toggle-reminders]").addEventListener("click", () => {
    state.remindersEnabled = !state.remindersEnabled;
    saveState();
    render();
    showToast(state.remindersEnabled ? "Daily reminder enabled." : "Daily reminder disabled.");
  });

  document.querySelector("[data-reset-demo]").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    Object.assign(state, loadState());
    seedCompletionHistory(true);
    saveState();
    render();
    showToast("Demo data reset.");
  });

  document.querySelector("[data-export]").addEventListener("click", exportData);

  document.querySelector("[data-open-notifications]").addEventListener("click", () => {
    showToast(state.remindersEnabled ? "Reminder is set for your daily ritual check-in." : "Daily reminder is off.");
  });
}

function setScreen(screenName) {
  elements.screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === screenName);
  });

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.navTarget === screenName);
  });

  const titles = {
    today: "Today",
    library: "Library",
    stats: "Stats",
    profile: "Profile"
  };
  elements.title.textContent = titles[screenName] || "Today";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openHabitDialog() {
  elements.habitForm.reset();
  elements.dialog.showModal();
  setTimeout(() => elements.habitForm.elements.name.focus(), 50);
}

function closeHabitDialog() {
  elements.dialog.close();
}

function addHabit(input) {
  if (!input.name) return;

  state.habits.unshift({
    id: `${slugify(input.name)}-${Date.now()}`,
    name: input.name,
    category: input.category,
    icon: input.icon,
    createdAt: dateKey(new Date()),
    completions: {}
  });

  saveState();
  closeHabitDialog();
  render();
  showToast(`${input.name} added.`);
}

function toggleHabit(habitId) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) return;

  const today = dateKey(new Date());
  habit.completions[today] = !habit.completions[today];
  saveState();
  render();
  showToast(habit.completions[today] ? `${habit.name} complete.` : `${habit.name} reopened.`);
}

function deleteHabit(habitId) {
  const habit = state.habits.find((item) => item.id === habitId);
  state.habits = state.habits.filter((item) => item.id !== habitId);
  saveState();
  render();
  if (habit) showToast(`${habit.name} deleted.`);
}

function render() {
  const today = new Date();
  const todayKey = dateKey(today);
  const completedToday = state.habits.filter((habit) => habit.completions[todayKey]).length;
  const percent = state.habits.length ? Math.round((completedToday / state.habits.length) * 100) : 0;

  elements.todayDate.textContent = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  updateProgressRing(percent);
  elements.todaySummary.textContent = getTodaySummary(completedToday, state.habits.length);
  renderTodayHabits(todayKey);
  renderLibrary(todayKey);
  renderNextHabit(todayKey);
  renderStats();
  renderAchievements();
  elements.reminderToggle.classList.toggle("is-on", state.remindersEnabled);
}

function renderTodayHabits(todayKey) {
  if (!state.habits.length) {
    elements.todayHabits.innerHTML = emptyState("add_task", "No habits yet", "Create your first ritual to begin tracking.");
    return;
  }

  elements.todayHabits.innerHTML = state.habits
    .map((habit) => {
      const complete = Boolean(habit.completions[todayKey]);
      return `
        <article class="habit-card ${complete ? "is-complete" : ""}">
          <div class="habit-icon">
            <span class="material-symbols-outlined" aria-hidden="true">${habit.icon}</span>
          </div>
          <div class="habit-copy">
            <h3>${escapeHtml(habit.name)}</h3>
            <p>${escapeHtml(habit.category)} • ${currentStreak(habit)} day streak</p>
          </div>
          <button class="complete-button ${complete ? "is-complete" : ""}" type="button" data-toggle-habit="${habit.id}" aria-label="${complete ? "Mark incomplete" : "Mark complete"}">
            <span class="material-symbols-outlined" aria-hidden="true">${complete ? "check" : "radio_button_unchecked"}</span>
          </button>
        </article>
      `;
    })
    .join("");

  elements.todayHabits.querySelectorAll("[data-toggle-habit]").forEach((button) => {
    button.addEventListener("click", () => toggleHabit(button.dataset.toggleHabit));
  });
}

function renderLibrary(todayKey) {
  if (!state.habits.length) {
    elements.libraryHabits.innerHTML = emptyState("folder_open", "Your library is empty", "Add habits from the Today screen.");
    return;
  }

  elements.libraryHabits.innerHTML = state.habits
    .map((habit) => {
      const complete = Boolean(habit.completions[todayKey]);
      return `
        <article class="library-card">
          <div class="habit-icon">
            <span class="material-symbols-outlined" aria-hidden="true">${habit.icon}</span>
          </div>
          <div>
            <h3>${escapeHtml(habit.name)}</h3>
            <p>${escapeHtml(habit.category)} • ${totalCompletions(habit)} total completions</p>
          </div>
          <div class="library-actions">
            <button type="button" data-toggle-habit="${habit.id}">${complete ? "Reopen Today" : "Complete Today"}</button>
            <button class="danger" type="button" data-delete-habit="${habit.id}">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");

  elements.libraryHabits.querySelectorAll("[data-toggle-habit]").forEach((button) => {
    button.addEventListener("click", () => toggleHabit(button.dataset.toggleHabit));
  });

  elements.libraryHabits.querySelectorAll("[data-delete-habit]").forEach((button) => {
    button.addEventListener("click", () => deleteHabit(button.dataset.deleteHabit));
  });
}

function renderNextHabit(todayKey) {
  const nextHabit = state.habits.find((habit) => !habit.completions[todayKey]);
  if (!nextHabit) {
    elements.nextHabitTitle.textContent = "All rituals complete";
    elements.nextHabitMeta.textContent = "Today's list is clear.";
    return;
  }
  elements.nextHabitTitle.textContent = nextHabit.name;
  elements.nextHabitMeta.textContent = `${nextHabit.category} • ${currentStreak(nextHabit)} day streak`;
}

function renderStats() {
  const allCompleted = state.habits.reduce((sum, habit) => sum + totalCompletions(habit), 0);
  const best = state.habits.reduce((max, habit) => Math.max(max, bestStreakForHabit(habit)), 0);
  const week = lastSevenDays().map((day) => completionPercentForDay(dateKey(day)));
  const wellness = week.length ? Math.round(week.reduce((sum, value) => sum + value, 0) / week.length) : 0;
  const achievements = getAchievements().filter((achievement) => achievement.unlocked).length;

  elements.completedTotal.textContent = allCompleted.toString();
  elements.bestStreak.textContent = best.toString();
  elements.achievementCount.textContent = achievements.toString();
  elements.wellnessScore.textContent = `${wellness}%`;
  elements.profileStreakChip.textContent = `Streak: ${best} days`;

  elements.weekChart.innerHTML = lastSevenDays()
    .map((day) => {
      const percent = completionPercentForDay(dateKey(day));
      const label = day.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3);
      const isToday = dateKey(day) === dateKey(new Date());
      return `
        <div class="day-bar ${isToday ? "is-today" : ""}" title="${percent}% complete">
          <i class="day-bar-fill" style="height: ${Math.max(12, percent * 1.3)}px"></i>
          <span>${label}</span>
        </div>
      `;
    })
    .join("");
}

function renderAchievements() {
  elements.achievementGrid.innerHTML = getAchievements()
    .map((achievement) => {
      return `
        <article class="achievement-card ${achievement.unlocked ? "" : "is-locked"}">
          <div class="achievement-icon">
            <span class="material-symbols-outlined" aria-hidden="true">${achievement.unlocked ? achievement.icon : "lock"}</span>
          </div>
          <h3>${escapeHtml(achievement.title)}</h3>
          <p>${escapeHtml(achievement.description)}</p>
        </article>
      `;
    })
    .join("");
}

function updateProgressRing(percent) {
  const offset = CIRCLE_LENGTH - (percent / 100) * CIRCLE_LENGTH;
  elements.todayRing.style.strokeDashoffset = offset.toString();
  elements.todayScore.textContent = `${percent}%`;
}

function getTodaySummary(completed, total) {
  if (!total) return "Create one ritual to begin tracking.";
  if (completed === total) return "Momentum is high. Every ritual is complete today.";
  if (completed === 0) return `${total} rituals are ready for today.`;
  return `${completed} of ${total} rituals complete today.`;
}

function getAchievements() {
  const total = state.habits.reduce((sum, habit) => sum + totalCompletions(habit), 0);
  const best = state.habits.reduce((max, habit) => Math.max(max, bestStreakForHabit(habit)), 0);
  const hasMindfulness = state.habits.some((habit) => habit.category === "Mindfulness" && totalCompletions(habit) >= 5);
  const hasHydration = state.habits.some((habit) => habit.name.toLowerCase().includes("hydration") && totalCompletions(habit) >= 7);

  return [
    {
      title: "Early Momentum",
      description: "Complete 5 habits total",
      icon: "workspace_premium",
      unlocked: total >= 5
    },
    {
      title: "Hydration Hero",
      description: "Log hydration 7 times",
      icon: "water_drop",
      unlocked: hasHydration
    },
    {
      title: "Mindful Master",
      description: "Finish 5 mindfulness sessions",
      icon: "self_improvement",
      unlocked: hasMindfulness
    },
    {
      title: "Streak Builder",
      description: "Reach a 14 day streak",
      icon: "local_fire_department",
      unlocked: best >= 14
    }
  ];
}

function completionPercentForDay(key) {
  if (!state.habits.length) return 0;
  const completed = state.habits.filter((habit) => habit.completions[key]).length;
  return Math.round((completed / state.habits.length) * 100);
}

function totalCompletions(habit) {
  return Object.values(habit.completions).filter(Boolean).length;
}

function currentStreak(habit) {
  let streak = 0;
  let cursor = new Date();

  while (habit.completions[dateKey(cursor)]) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function bestStreakForHabit(habit) {
  const dates = Object.keys(habit.completions)
    .filter((key) => habit.completions[key])
    .sort();

  let best = 0;
  let current = 0;
  let previous = null;

  dates.forEach((key) => {
    const currentDate = parseDateKey(key);
    if (previous && dateKey(addDays(previous, 1)) === key) {
      current += 1;
    } else {
      current = 1;
    }
    best = Math.max(best, current);
    previous = currentDate;
  });

  return best;
}

function lastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => addDays(new Date(), index - 6));
}

function seedCompletionHistory(force = false) {
  const hasHistory = state.habits.some((habit) => Object.keys(habit.completions).length > 0);
  if (hasHistory && !force) return;

  state.habits.forEach((habit, habitIndex) => {
    habit.completions = {};
    for (let offset = -12; offset <= -1; offset += 1) {
      const shouldComplete = (Math.abs(offset) + habitIndex) % (habitIndex + 3) !== 0;
      if (shouldComplete) {
        habit.completions[dateKey(addDays(new Date(), offset))] = true;
      }
    }
  });
}

function exportData() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `mindful-momentum-${dateKey(new Date())}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Habit data exported.");
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return {
      habits: structuredClone(defaultHabits),
      remindersEnabled: true
    };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      habits: Array.isArray(parsed.habits) ? parsed.habits : structuredClone(defaultHabits),
      remindersEnabled: parsed.remindersEnabled !== false
    };
  } catch {
    return {
      habits: structuredClone(defaultHabits),
      remindersEnabled: true
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function emptyState(icon, title, text) {
  return `
    <article class="habit-card">
      <div class="habit-icon">
        <span class="material-symbols-outlined" aria-hidden="true">${icon}</span>
      </div>
      <div class="habit-copy">
        <h3>${title}</h3>
        <p>${text}</p>
      </div>
    </article>
  `;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2400);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
