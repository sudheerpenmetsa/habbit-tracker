const STORAGE_KEY = "mindfulMomentumState";
const SUPABASE_URL = "https://kdomlsmuwvpppfrsaxyi.supabase.co";
const SUPABASE_KEY = "sb_publishable_-UapqZBXGgo1GOl_NOLMEA_rq2SVFNz";
const DAY_MS = 24 * 60 * 60 * 1000;
const CIRCLE_LENGTH = 364.42;
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
let currentUser = null;
let syncReady = false;
let remoteSaveTimer = null;

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
    name: "Read 10 Pages",
    category: "Learning",
    icon: "auto_stories",
    createdAt: dateKey(addDays(new Date(), -10)),
    completions: {}
  },
  {
    id: "afternoon-walk",
    name: "Afternoon Walk",
    category: "Health",
    icon: "directions_walk",
    createdAt: dateKey(addDays(new Date(), -8)),
    completions: {}
  }
];

const state = loadState();

const elements = {
  screens: document.querySelectorAll(".screen"),
  navItems: document.querySelectorAll("[data-nav-target]"),
  authForm: document.querySelector("#auth-form"),
  authEmail: document.querySelector("#auth-email"),
  syncStatus: document.querySelector("#sync-status"),
  syncDetail: document.querySelector("#sync-detail"),
  syncSignOut: document.querySelector("#sync-sign-out"),
  todayDate: document.querySelector("#today-date"),
  todayHabits: document.querySelector("#today-habits"),
  libraryHabits: document.querySelector("#library-habits"),
  todayRing: document.querySelector("#today-ring"),
  monthlyRing: document.querySelector("#monthly-ring"),
  todayScore: document.querySelector("#today-score"),
  monthlyScore: document.querySelector("#monthly-score"),
  todaySummary: document.querySelector("#today-summary"),
  goalProgressScore: document.querySelector("#goal-progress-score"),
  goalProgressCopy: document.querySelector("#goal-progress-copy"),
  monthlySummary: document.querySelector("#monthly-summary"),
  customHabitForm: document.querySelector("#custom-habit-form"),
  bookForm: document.querySelector("#book-form"),
  libraryPanelButtons: document.querySelectorAll("[data-library-panel]"),
  libraryPanels: document.querySelectorAll(".library-panel"),
  bookSearch: document.querySelector("#book-search"),
  bookFilters: document.querySelectorAll("[data-book-filter]"),
  bookTotalCount: document.querySelector("#book-total-count"),
  bookReadingCount: document.querySelector("#book-reading-count"),
  bookBacklogCount: document.querySelector("#book-backlog-count"),
  bookDoneCount: document.querySelector("#book-done-count"),
  bookDialog: document.querySelector("#book-dialog"),
  bookDetailCover: document.querySelector("#book-detail-cover"),
  bookDetailCategory: document.querySelector("#book-detail-category"),
  bookDetailTitle: document.querySelector("#book-detail-title"),
  bookDetailAuthor: document.querySelector("#book-detail-author"),
  bookDetailProgress: document.querySelector("#book-detail-progress"),
  foodForm: document.querySelector("#food-form"),
  avoidanceCurrent: document.querySelector("#avoidance-current"),
  avoidanceBest: document.querySelector("#avoidance-best"),
  avoidanceTotal: document.querySelector("#avoidance-total"),
  avoidanceDays: document.querySelector("#avoidance-days"),
  avoidanceMonthTotal: document.querySelector("#avoidance-month-total"),
  avoidanceRing: document.querySelector("#avoidance-ring"),
  avoidanceCalendar: document.querySelector("#avoidance-calendar"),
  recentActivity: document.querySelector("#recent-activity"),
  calendarTitle: document.querySelector("#calendar-title"),
  avoidanceMonthChip: document.querySelector("#avoidance-month-chip"),
  avoidanceProgressCopy: document.querySelector("#avoidance-progress-copy"),
  profileTotal: document.querySelector("#profile-total"),
  profileFocus: document.querySelector("#profile-focus"),
  profileBest: document.querySelector("#profile-best"),
  profileWellness: document.querySelector("#profile-wellness"),
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
  saveState({ localOnly: true });
  document.body.dataset.screen = "today";
  wireEvents();
  render();
  initSupabase();
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

  document.querySelector("[data-sign-out]").addEventListener("click", () => {
    signOut();
  });

  elements.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendMagicLink(elements.authEmail.value.trim());
  });

  elements.syncSignOut.addEventListener("click", () => signOut());

  document.querySelector("[data-export]").addEventListener("click", exportData);

  document.querySelector("[data-open-notifications]").addEventListener("click", () => {
    showToast(state.remindersEnabled ? "Reminder is set for your daily ritual check-in." : "Daily reminder is off.");
  });

  elements.libraryPanelButtons.forEach((button) => {
    button.addEventListener("click", () => setLibraryPanel(button.dataset.libraryPanel));
  });

  elements.customHabitForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(elements.customHabitForm);
    addHabit({
      name: formData.get("name").toString().trim(),
      category: "Custom",
      icon: "add_task"
    });
    elements.customHabitForm.reset();
  });

  elements.bookForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(elements.bookForm);
    addBook({
      title: formData.get("title").toString().trim(),
      author: formData.get("author").toString().trim(),
      category: formData.get("category").toString(),
      status: formData.get("status").toString()
    });
  });

  document.querySelectorAll("[data-recommend-habit]").forEach((button) => {
    button.addEventListener("click", () => {
      addHabit({
        name: button.dataset.recommendHabit,
        category: button.dataset.recommendCategory,
        icon: button.dataset.recommendIcon
      });
    });
  });

  elements.bookSearch.addEventListener("input", () => renderBookLibrary());

  elements.bookFilters.forEach((button) => {
    button.addEventListener("click", () => {
      elements.bookFilters.forEach((item) => item.classList.toggle("is-active", item === button));
      renderBookLibrary();
    });
  });

  document.querySelector("[data-close-book]").addEventListener("click", () => elements.bookDialog.close());
}

async function initSupabase() {
  if (!supabaseClient) {
    updateSyncUI("Local-only mode", "Supabase library did not load.");
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    updateSyncUI("Sync unavailable", error.message);
    return;
  }

  await applySession(data.session);

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    applySession(session);
  });
}

async function sendMagicLink(email) {
  if (!supabaseClient || !email) return;

  updateSyncUI("Sending sign-in link", "Check your email after submitting.");
  const redirectTo = window.location.href.split("#")[0];
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo }
  });

  if (error) {
    updateSyncUI("Sign-in failed", error.message);
    showToast(error.message);
    return;
  }

  updateSyncUI("Check your email", "Open the magic link on this device.");
  showToast("Magic link sent.");
}

async function signOut() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  currentUser = null;
  syncReady = false;
  updateSyncUI("Local-only mode", "Sign in to sync across devices.");
  showToast("Signed out.");
}

async function applySession(session) {
  currentUser = session?.user || null;
  syncReady = false;

  if (!currentUser) {
    updateSyncUI("Local-only mode", "Sign in to sync across devices.");
    return;
  }

  updateSyncUI("Syncing", currentUser.email || "Loading cloud data.");
  await loadRemoteState();
  syncReady = true;
  updateSyncUI("Synced", currentUser.email || "Cloud sync is active.");
}

function updateSyncUI(status, detail) {
  elements.syncStatus.textContent = status;
  elements.syncDetail.textContent = detail;
  elements.authForm.hidden = Boolean(currentUser);
  elements.syncSignOut.hidden = !currentUser;
}

async function loadRemoteState() {
  const { data, error } = await supabaseClient
    .from("app_state")
    .select("data")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    updateSyncUI("Setup needed", "Run the Supabase SQL setup, then refresh.");
    console.error(error);
    return;
  }

  if (data?.data) {
    Object.assign(state, normalizeState(data.data));
    saveState({ localOnly: true });
    render();
    return;
  }

  await saveRemoteState();
}

function queueRemoteSave() {
  clearTimeout(remoteSaveTimer);
  remoteSaveTimer = setTimeout(() => {
    saveRemoteState();
  }, 350);
}

async function saveRemoteState() {
  if (!supabaseClient || !currentUser) return;

  const { error } = await supabaseClient.from("app_state").upsert({
    user_id: currentUser.id,
    data: serializeState(),
    updated_at: new Date().toISOString()
  });

  if (error) {
    updateSyncUI("Sync failed", error.message);
    console.error(error);
    return;
  }

  updateSyncUI("Synced", currentUser.email || "Cloud sync is active.");
}

function setLibraryPanel(panelName) {
  elements.libraryPanelButtons.forEach((button) => {
    const active = button.dataset.libraryPanel === panelName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active.toString());
  });

  elements.libraryPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === `${panelName === "books" ? "book" : "habit"}-library-panel`);
  });
}

function setScreen(screenName) {
  document.body.dataset.screen = screenName;
  elements.screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === screenName);
  });

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.navTarget === screenName);
  });

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

function addBook(input) {
  if (!input.title || !input.author) return;

  state.books.unshift({
    id: `${slugify(input.title)}-${Date.now()}`,
    title: input.title,
    author: input.author,
    category: input.category,
    status: input.status,
    progress: input.status === "completed" ? 100 : 0,
    accent: input.category === "Fiction" ? "secondary" : "primary"
  });

  saveState();
  elements.bookForm.reset();
  renderBookLibrary();
  showToast(`${input.title} added to Books.`);
}

function addFoodToAvoid(name) {
  const normalized = name.trim();
  if (!normalized) return;

  const exists = state.foodsToAvoid.some((food) => food.toLowerCase() === normalized.toLowerCase());
  if (exists) {
    showToast(`${normalized} is already on your avoid list.`);
    return;
  }

  state.foodsToAvoid.push(normalized);
  saveState();
  render();
  showToast(`${normalized} added to Foods to Avoid.`);
}

function deleteFoodToAvoid(name) {
  state.foodsToAvoid = state.foodsToAvoid.filter((food) => food !== name);
  saveState();
  render();
  showToast(`${name} removed.`);
}

function logAvoidanceToday() {
  const today = dateKey(new Date());
  const existingLog = state.avoidanceLogs.find((log) => log.date === today);

  if (existingLog) {
    showToast("Avoidance already logged for today.");
    return;
  }

  state.avoidanceLogs.unshift({
    date: today,
    recordedAt: new Date().toISOString()
  });
  saveState();
  render();
  showToast("Avoidance logged for today.");
}

function render() {
  const today = new Date();
  const todayKey = dateKey(today);
  const completedToday = state.habits.filter((habit) => habit.completions[todayKey]).length;
  const percent = state.habits.length ? Math.round((completedToday / state.habits.length) * 100) : 0;
  const todayFocusPercent = state.habits.length ? habitProgress(state.habits[0], todayKey, 0) : 0;

  elements.todayDate.textContent = "Today's Focus";

  updateProgressRing(elements.todayRing, elements.todayScore, todayFocusPercent);
  elements.todaySummary.textContent = state.habits.length
    ? `Today's focus is ${todayFocusPercent}% complete.`
    : getTodaySummary(completedToday, state.habits.length);
  elements.goalProgressScore.textContent = `${monthlyCompletionPercent()}%`;
  elements.goalProgressCopy.textContent = `You've stayed consistent for ${completedThisMonth()} habit logs this month. Keep maintaining your momentum.`;
  renderTodayHabits(todayKey);
  renderBookLibrary();
  renderStats();
  renderAchievements();
  elements.reminderToggle.classList.toggle("is-on", state.remindersEnabled);
}

function renderTodayHabits(todayKey) {
  if (!state.habits.length) {
    elements.todayHabits.innerHTML = emptyState("add_task", "No habits yet", "Create your first ritual to begin tracking.");
    return;
  }

  const [primary, second, third, fourth] = state.habits;
  const cards = [];

  if (primary) cards.push(renderLargeTodayCard(primary, todayKey, 0));
  if (second) cards.push(renderSmallTodayCard(second, todayKey, 1));
  if (third) cards.push(renderSmallTodayCard(third, todayKey, 2));
  cards.push(renderAvoidanceCard());
  if (fourth) cards.push(renderMediumTodayCard(fourth, todayKey, 3));

  elements.todayHabits.innerHTML = cards.join("");

  elements.todayHabits.querySelectorAll("[data-toggle-habit]").forEach((button) => {
    button.addEventListener("click", () => toggleHabit(button.dataset.toggleHabit));
  });

  elements.todayHabits.querySelectorAll("[data-log-avoidance]").forEach((button) => {
    button.addEventListener("click", () => logAvoidanceToday());
  });

  elements.todayHabits.querySelectorAll("[data-delete-food]").forEach((button) => {
    button.addEventListener("click", () => deleteFoodToAvoid(button.dataset.deleteFood));
  });

  const foodForm = elements.todayHabits.querySelector("#food-form");
  if (foodForm) {
    foodForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(foodForm);
      addFoodToAvoid(formData.get("food").toString());
      foodForm.reset();
    });
  }
}

function renderLargeTodayCard(habit, todayKey, index) {
  const complete = Boolean(habit.completions[todayKey]);
  const progress = habitProgress(habit, todayKey, index);
  return `
    <article class="today-card today-card-large ${complete ? "is-complete" : ""}">
      <div class="today-card-head">
        <div class="today-card-title-group">
          <div class="today-card-icon">
            <span class="material-symbols-outlined" aria-hidden="true">${habit.icon}</span>
          </div>
          <div>
            <h3>${escapeHtml(habit.name)}</h3>
            <p>${complete ? "Completed for today" : progressLabel(habit, progress)}</p>
          </div>
        </div>
        <span class="category-chip">${escapeHtml(habit.category)}</span>
      </div>
      <div class="progress-track" aria-hidden="true"><span style="width: ${progress}%"></span></div>
      <button class="today-card-action" type="button" data-toggle-habit="${habit.id}">${complete ? "Reopen" : "Log Progress"}</button>
    </article>
  `;
}

function renderSmallTodayCard(habit, todayKey, index) {
  const complete = Boolean(habit.completions[todayKey]);
  const progress = habitProgress(habit, todayKey, index);
  const tone = index % 2 === 0 ? "secondary" : "error";
  return `
    <article class="today-card today-card-small ${complete ? "is-complete" : ""}">
      <div>
        <span class="material-symbols-outlined today-inline-icon ${tone}" aria-hidden="true">${habit.icon}</span>
        <h3>${escapeHtml(habit.name)}</h3>
        <p>${complete ? "Done for today" : shortProgressLabel(habit, progress)}</p>
      </div>
      <div>
        <div class="progress-track compact" aria-hidden="true"><span class="${tone}" style="width: ${progress}%"></span></div>
        <button class="today-card-action ghost" type="button" data-toggle-habit="${habit.id}">${complete ? "Reopen" : "Complete"}</button>
      </div>
    </article>
  `;
}

function renderAvoidanceCard() {
  const foodItems = state.foodsToAvoid.length
    ? state.foodsToAvoid
        .map(
          (food) => `
            <li>
              <span>${escapeHtml(food)}</span>
              <button type="button" data-delete-food="${escapeHtml(food)}" aria-label="Remove ${escapeHtml(food)}">
                <span class="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </li>
          `
        )
        .join("")
    : `<li class="empty-food">No foods added yet</li>`;

  return `
    <article class="today-card today-card-small avoidance-card">
      <div>
        <div class="avoidance-head">
          <span class="material-symbols-outlined today-inline-icon error" aria-hidden="true">block</span>
          <span class="streak-pill"><span class="material-symbols-outlined" aria-hidden="true">bolt</span>12-Day Streak</span>
        </div>
        <h3>Foods to Avoid</h3>
        <ul>${foodItems}</ul>
      </div>
      <form class="food-form" id="food-form">
        <input name="food" type="text" placeholder="Add food" />
        <button type="submit" aria-label="Add food"><span class="material-symbols-outlined" aria-hidden="true">add</span></button>
      </form>
      <button class="today-card-action ghost" type="button" data-log-avoidance>Log Avoidance</button>
    </article>
  `;
}

function renderMediumTodayCard(habit, todayKey, index) {
  const complete = Boolean(habit.completions[todayKey]);
  const progress = habitProgress(habit, todayKey, index);
  return `
    <article class="today-card today-card-medium ${complete ? "is-complete" : ""}">
      <div class="today-card-icon square">
        <span class="material-symbols-outlined" aria-hidden="true">${habit.icon}</span>
      </div>
      <div class="today-card-medium-body">
        <div class="today-card-medium-head">
          <h3>${escapeHtml(habit.name)}</h3>
          <button type="button" data-toggle-habit="${habit.id}">${complete ? "Done" : "Pending"}</button>
        </div>
        <div class="progress-track" aria-hidden="true"><span style="width: ${progress}%"></span></div>
      </div>
    </article>
  `;
}

function renderBookLibrary() {
  const query = elements.bookSearch.value.trim().toLowerCase();
  const activeFilter = document.querySelector("[data-book-filter].is-active")?.dataset.bookFilter || "all";
  updateBookStats();
  const filteredBooks = state.books.filter((book) => {
    const normalizedCategory = book.category.toLowerCase();
    const matchesFilter = activeFilter === "all" || book.status === activeFilter || normalizedCategory === activeFilter;
    const matchesQuery = [book.title, book.author, book.category].join(" ").toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });

  if (!filteredBooks.length) {
    elements.libraryHabits.innerHTML = emptyState("search_off", "No books found", "Try another search or filter.");
    return;
  }

  elements.libraryHabits.innerHTML = filteredBooks.map(renderBookCard).join("");

  elements.libraryHabits.querySelectorAll("[data-open-book]").forEach((button) => {
    button.addEventListener("click", () => openBookDetail(button.dataset.openBook));
  });
}

function renderBookCard(book, index) {
  const completed = book.status === "completed";
  const backlogged = book.status === "backlogged";
  const coverClass = `cover-${index % 4}`;
  return `
    <button class="book-card" type="button" data-open-book="${book.id}">
      <div class="book-cover ${coverClass} ${backlogged ? "muted" : ""}">
        <span>${escapeHtml(book.title.split(" ").slice(0, 2).join(" "))}</span>
        ${completed ? `<i class="material-symbols-outlined" aria-hidden="true">check</i>` : ""}
      </div>
      <div class="book-copy">
        <div>
          <span class="book-tag">${escapeHtml(book.category)}</span>
          <h3>${escapeHtml(book.title)}</h3>
          <p>${escapeHtml(book.author)}</p>
        </div>
        ${renderBookStatus(book)}
      </div>
    </button>
  `;
}

function renderBookStatus(book) {
  if (book.status === "completed") {
    return `<div class="book-status done"><span class="material-symbols-outlined" aria-hidden="true">done_all</span><span>Finished June 12</span></div>`;
  }
  if (book.status === "backlogged") {
    return `<div class="book-status"><span class="material-symbols-outlined" aria-hidden="true">schedule</span><span>Added 2 days ago</span></div>`;
  }
  return `
    <div class="book-progress">
      <div><span>Progress</span><strong>${book.progress}%</strong></div>
      <div class="progress-track compact"><span class="${book.accent === "secondary" ? "secondary" : ""}" style="width: ${book.progress}%"></span></div>
    </div>
  `;
}

function updateBookStats() {
  elements.bookTotalCount.textContent = state.books.length.toString();
  elements.bookReadingCount.textContent = state.books.filter((book) => book.status === "in-progress").length.toString();
  elements.bookBacklogCount.textContent = state.books.filter((book) => book.status === "backlogged").length.toString();
  elements.bookDoneCount.textContent = state.books.filter((book) => book.status === "completed").length.toString();
}

function openBookDetail(bookId) {
  const book = state.books.find((item) => item.id === bookId);
  if (!book) return;

  elements.bookDetailCover.className = `book-detail-cover cover-${state.books.indexOf(book) % 4}`;
  elements.bookDetailCover.textContent = book.title.split(" ").slice(0, 2).join(" ");
  elements.bookDetailCategory.textContent = book.category;
  elements.bookDetailTitle.textContent = book.title;
  elements.bookDetailAuthor.textContent = book.author;
  elements.bookDetailProgress.innerHTML = renderBookDetailProgress(book);
  elements.bookDialog.showModal();
}

function renderBookDetailProgress(book) {
  if (book.status === "completed") {
    return `<p class="book-status done"><span class="material-symbols-outlined" aria-hidden="true">done_all</span><span>Finished June 12</span></p>`;
  }
  if (book.status === "backlogged") {
    return `<p class="book-status"><span class="material-symbols-outlined" aria-hidden="true">schedule</span><span>Waiting in backlog</span></p>`;
  }
  return `
    <div class="book-progress">
      <div><span>Progress</span><strong>${book.progress}%</strong></div>
      <div class="progress-track compact"><span class="${book.accent === "secondary" ? "secondary" : ""}" style="width: ${book.progress}%"></span></div>
    </div>
  `;
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
  const monthly = monthlyCompletionPercent();
  const focusHours = focusTimeHours();
  const today = new Date();
  const monthDays = daysInMonth(today);
  const avoidedDays = avoidanceLogsThisMonth(today).length;
  const avoidanceBest = bestAvoidanceStreak();
  const avoidanceTotal = state.avoidanceLogs.length;

  elements.profileStreakChip.textContent = `Streak: ${best} days`;
  elements.profileTotal.textContent = allCompleted.toString();
  elements.profileFocus.textContent = `${focusHours}h`;
  elements.profileBest.textContent = best.toString();
  elements.profileWellness.textContent = `${wellness}%`;
  updateProgressRing(elements.monthlyRing, elements.monthlyScore, monthly);
  elements.monthlySummary.textContent = monthly >= 70 ? "Momentum is high this month" : "Momentum is building this month";
  elements.avoidanceCurrent.textContent = currentAvoidanceStreak().toString();
  elements.avoidanceBest.textContent = avoidanceBest.toString();
  elements.avoidanceTotal.textContent = avoidanceTotal.toString();
  elements.avoidanceDays.textContent = avoidedDays.toString();
  elements.avoidanceMonthTotal.textContent = `/${monthDays}`;
  elements.avoidanceProgressCopy.textContent = `You're ${Math.max(0, monthDays - avoidedDays)} days away from your goal!`;
  elements.calendarTitle.textContent = today.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  elements.avoidanceMonthChip.textContent = today.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  updateProgressRing(elements.avoidanceRing, elements.avoidanceDays, Math.round((avoidedDays / monthDays) * 100), avoidedDays.toString());
  renderAvoidanceCalendar(today);
  renderRecentActivity();
}

function renderAvoidanceCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const days = daysInMonth(date);
  const startDay = new Date(year, month, 1).getDay();
  const todayDate = date.getDate();
  const logDates = new Set(state.avoidanceLogs.map((log) => log.date));
  const cells = [];

  for (let index = 0; index < startDay; index += 1) {
    cells.push(`<span class="calendar-empty"></span>`);
  }

  for (let day = 1; day <= days; day += 1) {
    const key = dateKey(new Date(year, month, day, 12));
    const completed = logDates.has(key);
    const current = day === todayDate;
    cells.push(`
      <span class="calendar-day ${completed ? "is-complete" : ""} ${current ? "is-current" : ""}">
        ${day}
        ${completed ? `<i class="material-symbols-outlined" aria-hidden="true">${current ? "stars" : "check_circle"}</i>` : ""}
      </span>
    `);
  }

  elements.avoidanceCalendar.innerHTML = cells.join("");
}

function renderRecentActivity() {
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
  const logs = [...state.avoidanceLogs]
    .sort((first, second) => second.date.localeCompare(first.date))
    .slice(0, 3);

  if (!logs.length) {
    elements.recentActivity.innerHTML = emptyState("task_alt", "No avoidance logs yet", "Use Log Avoidance on Today after you avoid your list.");
    return;
  }

  elements.recentActivity.innerHTML = logs
    .map((log) => {
      const day = parseDateKey(log.date);
      const recordedAt = log.recordedAt ? new Date(log.recordedAt) : day;
      return `
        <article class="activity-entry">
          <div>
            <span class="material-symbols-outlined" aria-hidden="true">task_alt</span>
            <div>
              <strong>${formatter.format(day)}</strong>
              <p>Success • Recorded at ${recordedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
            </div>
          </div>
          <button type="button" aria-label="Edit entry"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button>
        </article>
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

function updateProgressRing(ring, score, percent, label = `${percent}%`) {
  const length = typeof ring.getTotalLength === "function" ? ring.getTotalLength() : CIRCLE_LENGTH;
  ring.style.strokeDasharray = length.toString();
  const offset = length - (percent / 100) * length;
  ring.style.strokeDashoffset = offset.toString();
  score.textContent = label;
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

function completedThisMonth() {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  return state.habits.reduce((sum, habit) => {
    return (
      sum +
      Object.entries(habit.completions).filter(([key, complete]) => {
        if (!complete) return false;
        const date = parseDateKey(key);
        return date.getMonth() === month && date.getFullYear() === year;
      }).length
    );
  }, 0);
}

function avoidanceLogsThisMonth(date) {
  return state.avoidanceLogs.filter((log) => {
    const logDate = parseDateKey(log.date);
    return logDate.getMonth() === date.getMonth() && logDate.getFullYear() === date.getFullYear();
  });
}

function currentAvoidanceStreak() {
  const dates = new Set(state.avoidanceLogs.map((log) => log.date));
  let streak = 0;
  let cursor = new Date();

  while (dates.has(dateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function bestAvoidanceStreak() {
  const dates = state.avoidanceLogs.map((log) => log.date).sort();
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

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function habitProgress(habit, todayKey, index) {
  if (habit.completions[todayKey]) return 100;
  const presets = [75, 60, 90, 0, 45, 30];
  return presets[index % presets.length];
}

function progressLabel(habit, progress) {
  if (habit.name.toLowerCase().includes("meditation")) return "15 of 20 mins completed";
  if (habit.name.toLowerCase().includes("hydration")) return "1.5L / 2L";
  if (habit.name.toLowerCase().includes("read")) return progress >= 90 ? "Almost there" : `${progress}% complete`;
  return `${progress}% complete`;
}

function shortProgressLabel(habit, progress) {
  if (habit.name.toLowerCase().includes("hydration")) return "1.5L / 2L";
  if (habit.name.toLowerCase().includes("read")) return "Almost there";
  return `${progress}% complete`;
}

function monthlyCompletionPercent() {
  if (!state.habits.length) return 0;

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  const daysElapsed = Math.max(1, Math.floor((today - monthStart) / DAY_MS) + 1);
  let possible = 0;
  let completed = 0;

  state.habits.forEach((habit) => {
    for (let offset = 0; offset < daysElapsed; offset += 1) {
      const day = addDays(monthStart, offset);
      if (dateKey(day) >= habit.createdAt) {
        possible += 1;
        if (habit.completions[dateKey(day)]) completed += 1;
      }
    }
  });

  return possible ? Math.round((completed / possible) * 100) : 0;
}

function focusTimeHours() {
  const focusHabit = state.habits.find((habit) => habit.category === "Focus" || habit.icon === "timer");
  const focusCompletions = focusHabit
    ? totalCompletions(focusHabit)
    : Math.round(state.habits.reduce((sum, habit) => sum + totalCompletions(habit), 0) * 0.3);
  return (focusCompletions * 1.25).toFixed(1).replace(".0", "");
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
      const shouldComplete = habitIndex === 0 || (Math.abs(offset) + habitIndex) % (habitIndex + 3) !== 0;
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
    return normalizeState({});
  }

  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return normalizeState({});
  }
}

function normalizeState(input) {
  return {
    habits: Array.isArray(input.habits) ? input.habits : structuredClone(defaultHabits),
    books: Array.isArray(input.books) ? input.books : [],
    foodsToAvoid: Array.isArray(input.foodsToAvoid) ? input.foodsToAvoid : [],
    avoidanceLogs: Array.isArray(input.avoidanceLogs) ? input.avoidanceLogs : [],
    remindersEnabled: input.remindersEnabled !== false
  };
}

function serializeState() {
  return {
    habits: state.habits,
    books: state.books,
    foodsToAvoid: state.foodsToAvoid,
    avoidanceLogs: state.avoidanceLogs,
    remindersEnabled: state.remindersEnabled
  };
}

function saveState(options = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (syncReady && currentUser && !options.localOnly) {
    queueRemoteSave();
  }
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
