const STORAGE_KEY = "weekly-wellness-tracker-v3";
const WEIGHT_UNIT = "lb";
const USER_NAME = "Sudheer";
const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const MEAL_FIELDS = ["breakfast", "lunch", "snack", "dinner"];
const WORKBOOK_TEMPLATE = {
  Monday: {
    breakfast: "Veg oats + egg whites",
    lunch: "Rice + veg curry + sprouts + curd",
    snack: "Coconut + tea",
    dinner: "Paneer + veggies",
  },
  Tuesday: {
    breakfast: "Ragi porridge + nuts",
    lunch: "Quinoa + veg curry + buttermilk",
    snack: "Seeds mix",
    dinner: "Chicken soup",
  },
  Wednesday: {
    breakfast: "Smoothie (almond milk + berries)",
    lunch: "Rice + sambar + sprouts",
    snack: "Avocado",
    dinner: "Egg omelette + veggies",
  },
  Thursday: {
    breakfast: "Oats + coconut milk",
    lunch: "Millet + veg kootu + curd",
    snack: "Nuts + tea",
    dinner: "Paneer + veggies",
  },
  Friday: {
    breakfast: "Millet upma",
    lunch: "Rice + rasam + veg + buttermilk",
    snack: "Seeds + tea",
    dinner: "Fish + veggies",
  },
  Saturday: {
    breakfast: "Egg whites + avocado",
    lunch: "Quinoa + veg curry + sprouts",
    snack: "Coconut water + nuts",
    dinner: "Soup + paneer",
  },
  Sunday: {
    breakfast: "Smoothie bowl",
    lunch: "Rice + dal + veg",
    snack: "Nuts",
    dinner: "Light soup/veggies",
  },
};
const FOOD_GUIDE = {
  include: [
    {
      title: "Gluten free cereals",
      description: "Rice, Oats, Millets, Quinoa, Buckwheat, Amaranth",
      icon: "grass",
    },
    {
      title: "Milk substitutes",
      description: "Almond milk, Coconut milk, Rice milk",
      icon: "water_full",
    },
    {
      title: "Vegetables & Fruits",
      description: "All vegetables; Avocados, Fresh berries, Java plum (Jamun)",
      icon: "nutrition",
    },
    {
      title: "Healthy Fats & Proteins",
      description: "Ghee, Butter, Olive oil, Avocado oil; Sprouted lentils; Sea food, Chicken, Egg white",
      icon: "restaurant",
    },
    {
      title: "Dairy & Nuts",
      description: "Curd, Buttermilk, Paneer; All nuts except peanuts and cashews",
      icon: "egg_alt",
    },
  ],
  avoid: [
    {
      title: "Gluten",
      description: "Wheat, Noodles, Pasta, Breads, Biscuits, Cakes, Sooji",
      icon: "block",
    },
    {
      title: "Milk & Milk Products",
      description: "Cow's milk, Soy milk, Ice creams, Puddings, Processed Cheese",
      icon: "dangerous",
    },
    {
      title: "Oils & Processed Fats",
      description: "Corn, Canola, Palm oil; Mayonnaise, Spreads, Trans-fats",
      icon: "warning",
    },
    {
      title: "Sweeteners & Factory Made",
      description: "Sugar, Jaggery, Honey; Anything made in factories",
      icon: "cancel",
    },
    {
      title: "GMOs & Misc",
      description: "Corn and soy products; Alcohols, Outside food, Peanuts, Cashews",
      icon: "priority_high",
    },
  ],
};
const MEAL_ICONS = {
  breakfast: "breakfast_dining",
  lunch: "lunch_dining",
  snack: "bakery_dining",
  dinner: "dinner_dining",
};

const state = loadState();
const uiState = {
  currentView: "status",
  selectedHabitDate: todayISO(),
  foodQuery: "",
};
let deferredInstallPrompt = null;

const elements = {
  statusView: document.getElementById("view-status"),
  mealsView: document.getElementById("view-meals"),
  foodsView: document.getElementById("view-foods"),
  habitsView: document.getElementById("view-habits"),
  weightView: document.getElementById("view-weight"),
  installButton: document.getElementById("installButton"),
  toast: document.getElementById("toast"),
  navButtons: Array.from(document.querySelectorAll("[data-view-target]")),
};

wireEvents();
renderApp();
registerServiceWorker();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      cleanEntries: Array.isArray(saved.cleanEntries)
        ? saved.cleanEntries.map((entry, index) => normalizeCleanEntry(entry, index))
        : [],
      weightEntries: Array.isArray(saved.weightEntries) ? saved.weightEntries : [],
    };
  } catch (error) {
    return {
      cleanEntries: [],
      weightEntries: [],
    };
  }
}

function normalizeCleanEntry(entry, index = 0) {
  if ("followedDiet" in entry || "noOutsideFood" in entry || "dayLabel" in entry) {
    return {
      id: entry.id || crypto.randomUUID(),
      date: entry.date || "",
      dayLabel: entry.dayLabel || "",
      followedDiet: Boolean(entry.followedDiet),
      noSugar: Boolean(entry.noSugar),
      noOutsideFood: Boolean(entry.noOutsideFood),
      note: entry.note || "",
    };
  }

  return {
    id: entry.id || crypto.randomUUID(),
    date: entry.date || "",
    dayLabel: `Day ${index + 1}`,
    followedDiet: Number(entry.mealsOnPlan || 0) >= 3,
    noSugar: Boolean(entry.noSugar),
    noOutsideFood: false,
    note: entry.note || "",
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function wireEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("input", handleInput);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    elements.installButton.classList.remove("hidden");
  });
}

function handleClick(event) {
  const installButton = event.target.closest("#installButton");
  if (installButton) {
    installApp();
    return;
  }

  const navTarget = event.target.closest("[data-view-target], [data-nav-target]");
  if (navTarget) {
    uiState.currentView = navTarget.dataset.viewTarget || navTarget.dataset.navTarget;
    syncActiveView();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const habitDateButton = event.target.closest("[data-habit-date]");
  if (habitDateButton) {
    uiState.selectedHabitDate = habitDateButton.dataset.habitDate;
    renderHabitsView();
    return;
  }

  const deleteCleanButton = event.target.closest("[data-delete-clean]");
  if (deleteCleanButton) {
    state.cleanEntries = state.cleanEntries.filter(
      (entry) => entry.id !== deleteCleanButton.dataset.deleteClean
    );
    saveState();
    renderApp();
    showToast("Habit entry removed.");
    return;
  }

  const deleteWeightButton = event.target.closest("[data-delete-weight]");
  if (deleteWeightButton) {
    state.weightEntries = state.weightEntries.filter(
      (entry) => entry.id !== deleteWeightButton.dataset.deleteWeight
    );
    saveState();
    renderApp();
    showToast("Weight entry removed.");
    return;
  }

  const pasteImportButton = event.target.closest("#pasteImportButton");
  if (pasteImportButton) {
    handlePasteImport();
    return;
  }

  if (event.target.closest("#exportDailyButton")) {
    downloadCsv("daily-clean-tracker.csv", buildDailyCsv());
    showToast("Daily tracker export downloaded.");
    return;
  }

  if (event.target.closest("#exportWeightButton")) {
    downloadCsv("weight-entries.csv", buildWeightCsv());
    showToast("Weight export downloaded.");
    return;
  }

  if (event.target.closest("#exportJsonButton")) {
    downloadJson("weekly-wellness-backup.json", state);
    showToast("Full backup downloaded.");
  }
}

function handleSubmit(event) {
  if (event.target.id === "habitForm") {
    handleHabitSubmit(event);
    return;
  }

  if (event.target.id === "weightForm") {
    handleWeightSubmit(event);
  }
}

function handleInput(event) {
  if (event.target.id === "foodSearch") {
    uiState.foodQuery = event.target.value;
    renderFoodsView();
  }
}

function handleHabitSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const date = String(form.get("date") || uiState.selectedHabitDate || "").trim();

  if (!date) {
    showToast("Pick a date before saving.");
    return;
  }

  const entry = {
    id: crypto.randomUUID(),
    date,
    dayLabel: autoDayLabelFromDate(date),
    followedDiet: form.get("followedDiet") === "on",
    noSugar: form.get("noSugar") === "on",
    noOutsideFood: form.get("noOutsideFood") === "on",
    note: String(form.get("note") || "").trim(),
  };

  state.cleanEntries = upsertByKey(state.cleanEntries, "date", entry);
  saveState();
  uiState.selectedHabitDate = date;
  renderApp();
  showToast("Habit day saved.");
}

function handleWeightSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const entry = {
    id: crypto.randomUUID(),
    date: String(form.get("date") || "").trim(),
    weight: Number(form.get("weight")),
    note: String(form.get("note") || "").trim(),
  };

  if (!entry.date || Number.isNaN(entry.weight)) {
    showToast("Enter a valid date and weight.");
    return;
  }

  state.weightEntries = upsertByKey(state.weightEntries, "date", entry);
  saveState();
  renderApp();
  showToast("Weight entry saved.");
}

function handlePasteImport() {
  const pasteTypeInput = document.getElementById("pasteType");
  const pasteInput = document.getElementById("pasteInput");
  if (!pasteTypeInput || !pasteInput) {
    return;
  }

  const trackerType = pasteTypeInput.value;
  const raw = pasteInput.value.trim();

  if (!raw) {
    showToast("Paste a few rows from Excel first.");
    return;
  }

  const rows = parseDelimitedRows(raw);
  if (rows.length < 2) {
    showToast("Include a header row and at least one data row.");
    return;
  }

  const headers = rows[0].map(normalizeHeader);
  const dataRows = rows.slice(1);

  try {
    if (trackerType === "daily") {
      const imported = dataRows.map((row) => mapDailyRow(headers, row));
      state.cleanEntries = mergeDailyEntries(state.cleanEntries, imported);
    } else {
      const imported = dataRows.map((row) => mapWeightRow(headers, row));
      state.weightEntries = mergeImportedByKey(state.weightEntries, imported, "date");
    }

    saveState();
    pasteInput.value = "";
    renderApp();
    showToast(`Imported ${trackerType} data.`);
  } catch (error) {
    showToast(error.message || "Import failed. Check your column names.");
  }
}

function renderApp() {
  renderStatusView();
  renderMealsView();
  renderFoodsView();
  renderHabitsView();
  renderWeightView();
  syncActiveView();
}

function syncActiveView() {
  const sections = [
    elements.statusView,
    elements.mealsView,
    elements.foodsView,
    elements.habitsView,
    elements.weightView,
  ];

  sections.forEach((section) => {
    const inactive = section.dataset.view !== uiState.currentView;
    section.hidden = inactive;
    section.classList.toggle("hidden", inactive);
  });

  elements.navButtons.forEach((button) => {
    const active = button.dataset.viewTarget === uiState.currentView;
    button.classList.toggle("nav-active", active);
    button.classList.toggle("text-primary", active);
    button.classList.toggle("font-bold", active);
    button.classList.toggle("text-on-surface-variant", !active);
  });
}

function renderStatusView() {
  const metrics = getWeightMetrics();
  const weeklyScore = getWeeklyCleanScore();
  const perfectStreak = calculatePerfectStreak(state.cleanEntries);

  elements.statusView.innerHTML = `
    <section class="fade-rise space-y-6">
      <div class="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary-container via-tertiary-container to-primary p-6 text-on-primary shadow-[0_18px_44px_rgba(15,94,156,0.22)]">
        <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
        <div class="absolute -bottom-12 left-0 h-28 w-28 rounded-full bg-secondary-container/40 blur-2xl"></div>
        <div class="relative z-10">
          <p class="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-primary-container/80">Today's Overview</p>
          <h2 class="text-h1 font-h1 leading-[1.02] text-on-primary">Hello, ${escapeHtml(USER_NAME)}</h2>
          <p class="mt-3 max-w-[240px] text-[13px] leading-6 text-on-primary-container">
            ${escapeHtml(buildOverviewMessage(weeklyScore, perfectStreak, metrics.latestWeight))}
          </p>
          <div class="mt-6 grid grid-cols-2 gap-3">
            <div class="rounded-[20px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-primary-container/80">Weekly score</p>
              <p class="mt-2 text-[30px] font-semibold tracking-[-0.03em]">${weeklyScore === null ? "--" : weeklyScore}</p>
              <p class="text-[12px] text-on-primary-container/80">${weeklyScore === null ? "Add dated habits" : "Based on the last 7 days"}</p>
            </div>
            <div class="rounded-[20px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-primary-container/80">Perfect streak</p>
              <p class="mt-2 text-[30px] font-semibold tracking-[-0.03em]">${perfectStreak || "--"}</p>
              <p class="text-[12px] text-on-primary-container/80">${perfectStreak ? "Days in a row" : "Start with today"}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-gutter">
        <div class="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(26,27,35,0.05)]">
          <div class="mb-2 flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-sm">event</span>
            <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Start date</p>
          </div>
          <p class="text-h3 font-h3">${metrics.startDateLabel}</p>
          <p class="mt-1 text-[12px] text-on-surface-variant">${metrics.startWeightLabel}</p>
        </div>
        <div class="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(26,27,35,0.05)]">
          <div class="mb-2 flex items-center gap-2">
            <span class="material-symbols-outlined text-secondary text-sm">trending_down</span>
            <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Weekly</p>
          </div>
          <p class="text-h3 font-h3">${metrics.weeklyDeltaLabel}</p>
          <div class="mt-1 flex items-center gap-2">
            <span class="h-2 w-2 rounded-full ${metrics.weeklyDelta !== null && metrics.weeklyDelta <= 0 ? "bg-secondary" : "bg-tertiary-container"}"></span>
            <p class="text-[12px] font-medium uppercase tracking-[0.08em] ${metrics.weeklyDelta !== null && metrics.weeklyDelta <= 0 ? "text-secondary" : "text-on-surface-variant"}">
              ${metrics.weeklyDelta === null ? "Need two entries" : metrics.weeklyDelta <= 0 ? "On track" : "Watch this week"}
            </p>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(26,27,35,0.05)]">
        <div class="mb-6 flex items-end justify-between gap-6">
          <div>
            <p class="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Current weight</p>
            <div class="flex items-end gap-1">
              <span class="text-stat-display font-stat-display text-primary">${metrics.currentWeightValue}</span>
              <span class="pb-2 text-h3 font-h3 text-on-surface-variant">${WEIGHT_UNIT}</span>
            </div>
          </div>
          <div class="text-right">
            <p class="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Total change</p>
            <p class="text-h2 font-h2 ${metrics.totalDelta !== null && metrics.totalDelta <= 0 ? "text-secondary" : "text-primary"}">${metrics.totalDeltaLabel}</p>
          </div>
        </div>
        ${renderWeightBars()}
      </div>

      <div class="flex items-center justify-between overflow-hidden rounded-xl bg-primary-container p-6 shadow-[0_10px_32px_rgba(15,94,156,0.22)]">
        <div class="space-y-2">
          <h3 class="text-h3 font-h3 text-on-primary">Clean Eating</h3>
          <p class="max-w-[170px] text-[13px] leading-5 text-on-primary-container">
            ${escapeHtml(buildCleanScoreMessage(weeklyScore, perfectStreak))}
          </p>
          <span class="inline-flex items-center rounded-full bg-secondary-container/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-secondary-container">
            ${perfectStreak >= 5 ? "Momentum mode" : "Keep going"}
          </span>
        </div>
        ${renderCleanScoreRing(weeklyScore)}
      </div>

      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-h3 font-h3">Jump Back In</h3>
          <span class="text-[12px] text-on-surface-variant">Quick actions</span>
        </div>
        <div class="grid grid-cols-2 gap-gutter">
          ${renderQuickAction("habits", "task_alt", "Log Habits", "Track today's clean eating")}
          ${renderQuickAction("weight", "monitor_weight", "Log Weight", "Add your weekly weigh-in")}
          ${renderQuickAction("meals", "restaurant_menu", "Meal Guide", "See your weekly clean meals")}
          ${renderQuickAction("foods", "fact_check", "Food Guide", "Review foods to keep or avoid")}
        </div>
      </section>
    </section>
  `;
}

function renderMealsView() {
  const todayName = currentWeekdayName();

  elements.mealsView.innerHTML = `
    <section class="fade-rise space-y-6">
      <div class="space-y-3">
        <h2 class="text-h1 font-h1 text-on-surface">Meal Guide</h2>
        <p class="text-body-lg font-body-md text-on-surface-variant">
          Your weekly clean-eating reference from the meal plan workbook.
        </p>
        <div class="flex flex-wrap gap-2">
          <span class="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[12px] font-semibold text-primary">Balanced meals</span>
          <span class="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[12px] font-semibold text-primary">Simple prep</span>
          <span class="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[12px] font-semibold text-primary">Clean eating</span>
        </div>
      </div>

      <div class="space-y-4">
        ${WEEK_DAYS.map((day) => renderMealDayCard(day, WORKBOOK_TEMPLATE[day], day === todayName)).join("")}
      </div>

      <div class="relative overflow-hidden rounded-xl bg-primary-container p-6 text-on-primary shadow-[0_12px_28px_rgba(15,94,156,0.18)]">
        <span class="absolute -bottom-6 -right-4 text-[120px] text-white/10 material-symbols-outlined">lightbulb</span>
        <div class="relative z-10">
          <p class="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-primary-container">Pro Tip</p>
          <h3 class="text-h3 font-h3 text-on-primary">Prep once, relax all week</h3>
          <p class="mt-2 max-w-[270px] text-[14px] leading-6 text-on-primary-container">
            Batch cook grains, sprouts, and proteins over the weekend so the daily plan feels easy instead of strict.
          </p>
        </div>
      </div>
    </section>
  `;
}

function renderFoodsView() {
  const query = uiState.foodQuery.trim().toLowerCase();
  const includeItems = FOOD_GUIDE.include.filter((item) => matchesFoodQuery(item, query));
  const avoidItems = FOOD_GUIDE.avoid.filter((item) => matchesFoodQuery(item, query));

  elements.foodsView.innerHTML = `
    <section class="fade-rise space-y-6">
      <div class="space-y-3">
        <h2 class="text-h1 font-h1 text-on-surface">Food Guide</h2>
        <p class="text-body-lg font-body-md text-on-surface-variant">
          Quick reference for the foods that support your clean-eating plan.
        </p>
      </div>

      <div class="relative">
        <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
        <input
          id="foodSearch"
          class="h-14 w-full rounded-xl border-none bg-surface-container px-12 pr-4 text-body-md text-on-surface outline-none ring-0 focus:ring-2 focus:ring-primary-container"
          type="text"
          placeholder="Search foods, ingredients, categories..."
          value="${escapeHtml(uiState.foodQuery)}"
        />
      </div>

      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-h2 font-h2 text-on-surface">Foods to Include</h3>
          <span class="rounded-full bg-secondary-container/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Optimal</span>
        </div>
        <div class="space-y-4">
          ${includeItems.length
            ? includeItems.map((item) => renderFoodIncludeCard(item)).join("")
            : renderFoodEmptyState("No matching foods in the include list.")}
        </div>
      </section>

      <div class="relative overflow-hidden rounded-[24px] bg-primary-container p-6 text-on-primary shadow-[0_12px_28px_rgba(15,94,156,0.18)]">
        <div class="relative z-10">
          <p class="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-primary-container">Pro Tip</p>
          <h4 class="text-h3 font-h3 text-white">Hydration is key</h4>
          <p class="mt-2 max-w-[260px] text-[14px] leading-6 text-on-primary-container">
            Pair these foods with steady water intake so the plan feels energizing, not restrictive.
          </p>
        </div>
        <span class="material-symbols-outlined absolute -bottom-4 -right-4 text-[120px] text-white/10">water_drop</span>
      </div>

      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-h2 font-h2 text-on-surface">Foods to Avoid</h3>
          <span class="rounded-full bg-error-container/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-error">Caution</span>
        </div>
        <div class="rounded-[24px] bg-surface-container-lowest px-2 py-1 shadow-[0_4px_20px_rgba(26,27,35,0.05)]">
          ${avoidItems.length
            ? avoidItems.map((item) => renderFoodAvoidRow(item)).join("")
            : renderFoodEmptyState("No matching foods in the avoid list.")}
        </div>
      </section>
    </section>
  `;
}

function renderHabitsView() {
  const weeklyScore = getWeeklyCleanScore();
  const recentDates = getRecentDateList(7);
  const selectedEntry = state.cleanEntries.find((entry) => entry.date === uiState.selectedHabitDate);
  const selectedScore = selectedEntry ? cleanScore(selectedEntry) : 0;
  const recentEntries = [...state.cleanEntries].sort(compareDailyEntries).slice(0, 6);
  const perfectDaysThisWeek = getRecentPerfectDays(state.cleanEntries, 7);

  elements.habitsView.innerHTML = `
    <section class="fade-rise space-y-6">
      <div class="space-y-4">
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Current week</p>
            <h2 class="text-h1 font-h1 text-primary">Clean Eating</h2>
          </div>
          <div class="text-right">
            <p class="text-h2 font-h2 text-primary">${weeklyScore === null ? "--" : `${weeklyScore}%`}</p>
            <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Weekly goal</p>
          </div>
        </div>
        <div class="h-3 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div
            class="h-full rounded-full bg-primary shadow-[0_0_14px_rgba(15,94,156,0.24)] transition-all"
            style="width: ${weeklyScore === null ? 0 : weeklyScore}%"
          ></div>
        </div>
      </div>

      <div class="custom-scrollbar flex gap-4 overflow-x-auto pb-2">
        ${recentDates.map((date) => renderHabitDateChip(date, date === uiState.selectedHabitDate)).join("")}
      </div>

      <div class="space-y-4">
        <div class="rounded-[20px] bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(26,27,35,0.05)]">
          <div class="mb-5 flex items-center justify-between">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">${formatLongDate(uiState.selectedHabitDate)}</p>
              <h3 class="mt-1 text-h3 font-h3 text-on-surface">${escapeHtml(selectedEntry?.dayLabel || autoDayLabelFromDate(uiState.selectedHabitDate))}</h3>
            </div>
            <span class="rounded-full bg-secondary-container/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-secondary-container">
              ${selectedScore ? `${selectedScore}%` : "New"}
            </span>
          </div>

          <form id="habitForm" class="space-y-4">
            <input type="hidden" name="date" value="${uiState.selectedHabitDate}" />
            <div class="space-y-3">
              ${renderHabitToggle({
                name: "followedDiet",
                title: "Followed Diet",
                description: "Stayed close to the meal plan",
                icon: "restaurant",
                checked: Boolean(selectedEntry?.followedDiet),
              })}
              ${renderHabitToggle({
                name: "noSugar",
                title: "No Sugar",
                description: "Skipped refined sugar today",
                icon: "do_not_disturb_on",
                checked: Boolean(selectedEntry?.noSugar),
              })}
              ${renderHabitToggle({
                name: "noOutsideFood",
                title: "No Outside Food",
                description: "Stuck to home food only",
                icon: "home",
                checked: Boolean(selectedEntry?.noOutsideFood),
              })}
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant" for="habitNote">Notes</label>
              <textarea
                id="habitNote"
                name="note"
                rows="3"
                class="w-full resize-none rounded-xl border-none bg-surface-container-low p-4 text-body-sm text-on-surface outline-none ring-0 placeholder:text-outline focus:ring-2 focus:ring-primary-container"
                placeholder="How did the day feel? Any cravings or wins?"
              >${escapeHtml(selectedEntry?.note || "")}</textarea>
            </div>
            <div class="flex items-center justify-between gap-3">
              <p class="text-[12px] text-on-surface-variant">${selectedScore ? "You can update this day anytime." : "Save today's habits when you're done."}</p>
              <button
                class="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-[0_10px_24px_rgba(15,94,156,0.16)] transition-all hover:opacity-90 active:scale-95"
                type="submit"
              >
                Save Day
              </button>
            </div>
          </form>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="rounded-[20px] bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(26,27,35,0.05)]">
            <p class="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Streak</p>
            <div class="flex items-baseline gap-2">
              <span class="text-h1 font-h1">${calculatePerfectStreak(state.cleanEntries) || 0}</span>
              <span class="text-[13px] text-on-surface-variant">days</span>
            </div>
          </div>
          <div class="rounded-[20px] bg-primary p-5 text-on-primary shadow-[0_10px_24px_rgba(15,94,156,0.18)]">
            <p class="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-primary-container">Perfect this week</p>
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary-fixed">emoji_events</span>
              <span class="text-lg font-semibold">${perfectDaysThisWeek} day${perfectDaysThisWeek === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>
      </div>

      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-h3 font-h3">Recent Days</h3>
          <span class="text-[12px] text-on-surface-variant">Tap a date above to edit</span>
        </div>
        <div class="space-y-4">
          ${recentEntries.length
            ? recentEntries.map((entry) => renderHabitHistoryCard(entry)).join("")
            : renderEmptyPanel("No daily tracker entries yet. Start with today's habits.")}
        </div>
      </section>
    </section>
  `;
}

function renderWeightView() {
  const metrics = getWeightMetrics();
  const sortedEntries = [...state.weightEntries].sort(compareDateDesc);
  const visibleEntries = sortedEntries.slice(0, 8);

  elements.weightView.innerHTML = `
    <section class="fade-rise space-y-6">
      <div class="space-y-3">
        <h2 class="text-h1 font-h1 text-on-surface">Weight Log</h2>
        <p class="text-body-lg font-body-md text-on-surface-variant">
          Track weekly measurements and keep your trend in one clean timeline.
        </p>
      </div>

      <div class="rounded-[24px] border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(26,27,35,0.05)]">
        <div class="mb-5 flex items-end justify-between gap-4">
          <div>
            <p class="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Current weight</p>
            <div class="flex items-end gap-1">
              <span class="text-stat-display font-stat-display text-primary">${metrics.currentWeightValue}</span>
              <span class="pb-2 text-h3 font-h3 text-on-surface-variant">${WEIGHT_UNIT}</span>
            </div>
          </div>
          <div class="text-right">
            <p class="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Total change</p>
            <p class="text-h2 font-h2 ${metrics.totalDelta !== null && metrics.totalDelta <= 0 ? "text-secondary" : "text-primary"}">${metrics.totalDeltaLabel}</p>
          </div>
        </div>

        <form id="weightForm" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <label class="space-y-2">
              <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Date</span>
              <input
                class="h-14 w-full rounded-xl border-none bg-surface-container px-4 text-body-md text-on-surface outline-none ring-0 focus:ring-2 focus:ring-primary-container"
                name="date"
                type="date"
                value="${todayISO()}"
                required
              />
            </label>
            <label class="space-y-2">
              <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Weight</span>
              <div class="relative">
                <input
                  class="h-14 w-full rounded-xl border-none bg-surface-container px-4 pr-12 text-body-md text-on-surface outline-none ring-0 focus:ring-2 focus:ring-primary-container"
                  name="weight"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="172.4"
                  required
                />
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-on-surface-variant">${WEIGHT_UNIT}</span>
              </div>
            </label>
          </div>
          <label class="space-y-2">
            <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Notes</span>
            <textarea
              class="w-full resize-none rounded-xl border-none bg-surface-container p-4 text-body-sm text-on-surface outline-none ring-0 placeholder:text-outline focus:ring-2 focus:ring-primary-container"
              name="note"
              rows="3"
              placeholder="Energy, sleep, travel, routine changes..."
            ></textarea>
          </label>
          <div class="flex justify-end">
            <button
              class="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-[0_10px_24px_rgba(15,94,156,0.16)] transition-all hover:opacity-90 active:scale-95"
              type="submit"
            >
              Save Weight Entry
            </button>
          </div>
        </form>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="rounded-[20px] bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(26,27,35,0.05)]">
          <p class="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Starting</p>
          <p class="text-h2 font-h2 text-primary">${metrics.startWeightValue}<span class="ml-1 text-[13px] font-normal text-on-surface-variant">${WEIGHT_UNIT}</span></p>
        </div>
        <div class="rounded-[20px] bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(26,27,35,0.05)]">
          <p class="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Weekly change</p>
          <p class="text-h2 font-h2 ${metrics.weeklyDelta !== null && metrics.weeklyDelta <= 0 ? "text-secondary" : "text-primary"}">${metrics.weeklyDeltaLabel}</p>
        </div>
      </div>

      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-h3 font-h3">History</h3>
          <span class="text-[12px] text-on-surface-variant">${sortedEntries.length ? `Last ${Math.min(sortedEntries.length, 8)} entries` : "No entries yet"}</span>
        </div>
        <div class="space-y-4">
          ${visibleEntries.length
            ? visibleEntries
                .map((entry, index) =>
                  renderWeightTimelineItem(
                    entry,
                    sortedEntries[index + 1],
                    index === 0,
                    index === visibleEntries.length - 1
                  )
                )
                .join("")
            : renderEmptyPanel("No weight entries yet. Add your first weigh-in above.")}
        </div>
      </section>

      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-h3 font-h3">Backup & Import</h3>
          <span class="text-[12px] text-on-surface-variant">Excel-friendly tools</span>
        </div>
        <div class="rounded-[24px] bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(26,27,35,0.05)] space-y-4">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-[140px_1fr_auto] sm:items-end">
            <label class="space-y-2">
              <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Dataset</span>
              <select
                id="pasteType"
                class="h-12 rounded-xl border-none bg-surface-container px-4 text-body-sm text-on-surface outline-none ring-0 focus:ring-2 focus:ring-primary-container"
              >
                <option value="daily">Daily tracker</option>
                <option value="weight">Weight</option>
              </select>
            </label>
            <label class="space-y-2">
              <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Paste rows</span>
              <textarea
                id="pasteInput"
                class="custom-scrollbar h-28 w-full resize-none rounded-xl border-none bg-surface-container p-4 text-body-sm text-on-surface outline-none ring-0 placeholder:text-outline focus:ring-2 focus:ring-primary-container"
                placeholder="Paste tab-separated rows from Excel here"
              ></textarea>
            </label>
            <button
              id="pasteImportButton"
              class="h-12 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary shadow-[0_10px_24px_rgba(15,94,156,0.16)] transition-all hover:opacity-90 active:scale-95"
              type="button"
            >
              Import
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <button id="exportDailyButton" class="rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm font-semibold text-on-surface transition-all hover:bg-surface-container" type="button">Export Daily CSV</button>
            <button id="exportWeightButton" class="rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm font-semibold text-on-surface transition-all hover:bg-surface-container" type="button">Export Weight CSV</button>
            <button id="exportJsonButton" class="rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm font-semibold text-on-surface transition-all hover:bg-surface-container" type="button">Full Backup</button>
          </div>
        </div>
      </section>
    </section>
  `;
}

function renderQuickAction(target, icon, title, subtitle) {
  return `
    <button
      class="rounded-xl bg-surface-container p-5 text-left shadow-[0_4px_20px_rgba(26,27,35,0.05)] transition-all hover:-translate-y-0.5 hover:bg-surface-container-high active:scale-[0.98]"
      data-nav-target="${target}"
      type="button"
    >
      <span class="material-symbols-outlined mb-3 text-primary" style="font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;">${icon}</span>
      <span class="block text-body-lg font-semibold text-on-surface">${title}</span>
      <span class="mt-1 block text-[12px] leading-5 text-on-surface-variant">${subtitle}</span>
    </button>
  `;
}

function renderMealDayCard(day, meals, featured) {
  if (featured) {
    return `
      <div class="overflow-hidden rounded-xl bg-surface-container-lowest shadow-[0_4px_20px_rgba(26,27,35,0.05)]">
        <div class="bg-gradient-to-br from-primary-container via-tertiary-container to-primary px-5 py-5 text-on-primary">
          <div class="flex items-center justify-between">
            <h3 class="text-h3 font-h3">${day}</h3>
            <span class="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-primary">Today</span>
          </div>
          <p class="mt-2 max-w-[250px] text-[13px] leading-5 text-on-primary-container">Use this as your anchor day and keep the rest of the week feeling easy.</p>
        </div>
        <div class="grid grid-cols-1 gap-4 p-5">
          ${MEAL_FIELDS.map((meal) => renderFeaturedMealRow(meal, meals[meal])).join("")}
        </div>
      </div>
    `;
  }

  return `
    <div class="rounded-xl bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(26,27,35,0.05)]">
      <h3 class="mb-4 text-h3 font-h3 text-on-surface">${day}</h3>
      <div class="space-y-3 opacity-90">
        ${MEAL_FIELDS.map((meal, index) => `
          <div class="flex items-center justify-between gap-4 py-2 ${index !== MEAL_FIELDS.length - 1 ? "border-b border-outline-variant/30" : ""}">
            <span class="w-24 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">${meal}</span>
            <span class="flex-1 text-right text-body-sm text-on-surface">${escapeHtml(meals[meal])}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderFeaturedMealRow(meal, content) {
  return `
    <div class="flex items-start gap-4">
      <div class="grid h-12 w-12 place-items-center rounded-xl bg-surface-container text-primary">
        <span class="material-symbols-outlined">${MEAL_ICONS[meal]}</span>
      </div>
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">${meal}</p>
        <p class="mt-1 text-body-md font-medium text-on-surface">${escapeHtml(content)}</p>
      </div>
    </div>
  `;
}

function renderFoodIncludeCard(item) {
  return `
    <div class="flex items-start gap-4 rounded-[20px] border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(26,27,35,0.05)]">
      <div class="grid h-12 w-12 place-items-center rounded-xl bg-secondary-fixed text-on-secondary-fixed-variant">
        <span class="material-symbols-outlined">${item.icon}</span>
      </div>
      <div class="flex-1">
        <h4 class="text-body-lg font-semibold text-on-surface">${escapeHtml(item.title)}</h4>
        <p class="mt-1 text-body-sm leading-6 text-on-surface-variant">${escapeHtml(item.description)}</p>
      </div>
    </div>
  `;
}

function renderFoodAvoidRow(item) {
  return `
    <div class="flex items-start justify-between gap-4 border-b border-outline-variant/50 px-2 py-4 last:border-b-0">
      <div class="flex items-start gap-4">
        <span class="material-symbols-outlined text-error">${item.icon}</span>
        <div>
          <p class="text-body-md font-semibold text-on-surface">${escapeHtml(item.title)}</p>
          <p class="mt-1 text-[13px] leading-5 text-on-surface-variant">${escapeHtml(item.description)}</p>
        </div>
      </div>
    </div>
  `;
}

function renderFoodEmptyState(message) {
  return `
    <div class="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-5 text-sm text-on-surface-variant">
      ${escapeHtml(message)}
    </div>
  `;
}

function renderHabitDateChip(date, active) {
  const label = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
  });
  const day = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    day: "2-digit",
  });

  return `
    <button
      class="min-w-[54px] rounded-xl border px-3 py-2 text-center transition-all active:scale-95 ${active
        ? "border-transparent bg-primary text-on-primary shadow-[0_12px_24px_rgba(15,94,156,0.18)]"
        : "border-outline-variant bg-surface-container-lowest text-on-surface"}"
      data-habit-date="${date}"
      type="button"
    >
      <span class="block text-[10px] font-semibold uppercase tracking-[0.12em] ${active ? "text-on-primary/80" : "text-on-surface-variant"}">${label}</span>
      <span class="mt-1 block text-h3 font-h3">${day}</span>
    </button>
  `;
}

function renderHabitToggle({ name, title, description, icon, checked }) {
  return `
    <label class="flex items-center justify-between rounded-xl bg-surface-container-low p-4 transition-all hover:bg-surface-container">
      <div class="flex items-center gap-4">
        <div class="grid h-10 w-10 place-items-center rounded-full bg-secondary-fixed text-on-secondary-fixed-variant">
          <span class="material-symbols-outlined">${icon}</span>
        </div>
        <div>
          <p class="text-body-md font-semibold text-on-surface">${title}</p>
          <p class="text-[12px] text-on-surface-variant">${description}</p>
        </div>
      </div>
      <span class="relative inline-flex items-center">
        <input class="peer sr-only" name="${name}" type="checkbox" ${checked ? "checked" : ""} />
        <span class="h-7 w-12 rounded-full bg-surface-container-highest transition peer-checked:bg-primary"></span>
        <span class="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5"></span>
      </span>
    </label>
  `;
}

function renderHabitHistoryCard(entry) {
  return `
    <div class="flex items-center justify-between rounded-xl bg-surface-container-lowest p-4 shadow-[0_4px_20px_rgba(26,27,35,0.05)]">
      <div class="flex items-center gap-4">
        <div class="grid h-12 w-12 place-items-center rounded-lg bg-surface-container text-primary font-semibold">
          ${entry.date ? new Date(`${entry.date}T12:00:00`).toLocaleDateString(undefined, { day: "2-digit" }) : escapeHtml(extractDayNumber(entry.dayLabel) || "--")}
        </div>
        <div>
          <p class="text-body-md font-semibold text-on-surface">${escapeHtml(entry.date ? new Date(`${entry.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long" }) : entry.dayLabel || "Daily log")}</p>
          <div class="mt-1 flex gap-1">
            ${renderHabitIcon(entry.followedDiet)}
            ${renderHabitIcon(entry.noSugar)}
            ${renderHabitIcon(entry.noOutsideFood)}
          </div>
          ${entry.note ? `<p class="mt-2 text-[12px] leading-5 text-on-surface-variant">${escapeHtml(entry.note)}</p>` : ""}
        </div>
      </div>
      <button
        class="rounded-xl border border-outline-variant px-3 py-2 text-[12px] font-semibold text-on-surface-variant transition-all hover:bg-surface-container"
        data-delete-clean="${entry.id}"
        type="button"
      >
        Delete
      </button>
    </div>
  `;
}

function renderHabitIcon(done) {
  return done
    ? `<span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;">check_circle</span>`
    : `<span class="material-symbols-outlined text-outline text-sm">radio_button_unchecked</span>`;
}

function renderWeightTimelineItem(entry, previousEntry, highlight, isLastVisible) {
  const delta = previousEntry ? entry.weight - previousEntry.weight : null;
  const badge = delta === null
    ? ""
    : `
      <div class="flex items-center rounded-full ${delta <= 0 ? "bg-secondary-container/30 border border-secondary-container/50" : "bg-error-container/30 border border-error-container/50"} px-3 py-1">
        <span class="material-symbols-outlined mr-1 text-lg leading-none ${delta <= 0 ? "text-secondary" : "text-error"}">${delta <= 0 ? "trending_down" : "trending_up"}</span>
        <span class="text-[11px] font-semibold uppercase tracking-[0.14em] ${delta <= 0 ? "text-secondary" : "text-error"}">${delta > 0 ? "+" : ""}${delta.toFixed(1)}${WEIGHT_UNIT}</span>
      </div>
    `;

  return `
    <div class="relative pl-8">
      ${!isLastVisible ? '<div class="absolute bottom-[-16px] left-[11px] top-6 w-[2px] bg-surface-container-highest"></div>' : ""}
      <div class="absolute left-0 top-1 z-10 grid h-6 w-6 place-items-center rounded-full ${highlight ? "bg-secondary-container" : "bg-surface-container-highest"}">
        <div class="h-2 w-2 rounded-full ${highlight ? "bg-secondary" : "bg-outline"}"></div>
      </div>
      <div class="flex items-center justify-between gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-[0_4px_20px_rgba(26,27,35,0.05)] ${highlight ? "" : "opacity-90"}">
        <div>
          <p class="text-h3 font-h3 text-primary">${entry.weight.toFixed(1)}<span class="ml-1 text-[13px] font-normal text-on-surface-variant">${WEIGHT_UNIT}</span></p>
          <p class="text-[13px] text-on-surface-variant">${formatWeekLabel(entry.date, highlight)}</p>
          ${entry.note ? `<p class="mt-2 text-[12px] leading-5 text-on-surface-variant">${escapeHtml(entry.note)}</p>` : ""}
        </div>
        <div class="flex items-center gap-2">
          ${badge}
          <button
            class="rounded-xl border border-outline-variant px-3 py-2 text-[12px] font-semibold text-on-surface-variant transition-all hover:bg-surface-container"
            data-delete-weight="${entry.id}"
            type="button"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderWeightBars() {
  const entries = [...state.weightEntries].sort(compareDateAsc).slice(-7);
  if (!entries.length) {
    return `
      <div class="grid h-40 place-items-center rounded-[20px] bg-surface-container-low text-sm text-on-surface-variant">
        Add a couple of weight entries to unlock your trend.
      </div>
    `;
  }

  const values = entries.map((entry) => entry.weight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  return `
    <div class="space-y-4">
      <div class="relative flex h-40 items-end justify-between gap-2 rounded-[22px] bg-surface-container-low px-2 pt-4">
        <div class="pointer-events-none absolute inset-0 flex flex-col justify-between px-2 py-3">
          <div class="border-b border-surface-container-high"></div>
          <div class="border-b border-surface-container-high"></div>
          <div class="border-b border-surface-container-high"></div>
        </div>
        ${entries
          .map((entry, index) => {
            const height = 18 + ((entry.weight - min) / range) * 72;
            const active = index === entries.length - 1;
            return `
              <div class="relative z-10 flex flex-1 justify-center">
                <div
                  class="w-8 rounded-t-full ${active ? "bg-primary shadow-[0_10px_20px_rgba(15,94,156,0.2)]" : "bg-surface-container-highest"}"
                  style="height: ${height}%"
                ></div>
              </div>
            `;
          })
          .join("")}
      </div>
      <div class="flex justify-between px-1 text-[10px] font-medium text-on-surface-variant">
        ${entries
          .map((entry, index) => {
            const active = index === entries.length - 1;
            return `<span class="${active ? "text-primary" : ""}">${formatMiniDate(entry.date)}</span>`;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderCleanScoreRing(score) {
  const normalizedScore = score === null ? 0 : score;
  const circumference = 301.59;
  const dashOffset = circumference - (normalizedScore / 100) * circumference;

  return `
    <div class="relative h-28 w-28">
      <svg class="h-28 w-28">
        <circle class="text-on-primary/10" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" stroke-width="10"></circle>
        <circle
          class="progress-ring-circle text-secondary-container"
          cx="56"
          cy="56"
          fill="transparent"
          r="48"
          stroke="currentColor"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${dashOffset}"
          stroke-linecap="round"
          stroke-width="10"
        ></circle>
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span class="text-h2 font-h2 text-on-primary">${score === null ? "--" : score}</span>
        <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-on-primary-container">Score</span>
      </div>
    </div>
  `;
}

function renderEmptyPanel(message) {
  return `
    <div class="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-5 text-sm text-on-surface-variant">
      ${escapeHtml(message)}
    </div>
  `;
}

function getWeightMetrics() {
  const sortedAsc = [...state.weightEntries].sort(compareDateAsc);
  const sortedDesc = [...state.weightEntries].sort(compareDateDesc);
  const first = sortedAsc[0];
  const latest = sortedDesc[0];
  const previous = sortedDesc[1];
  const totalDelta = first && latest ? latest.weight - first.weight : null;
  const weeklyDelta = latest && previous ? latest.weight - previous.weight : null;

  return {
    startDateLabel: first ? formatShortDate(first.date) : "--",
    startWeightLabel: first ? `Starting ${first.weight.toFixed(1)} ${WEIGHT_UNIT}` : "Add your first weight",
    startWeightValue: first ? first.weight.toFixed(1) : "--",
    latestWeight: latest || null,
    currentWeightValue: latest ? latest.weight.toFixed(1) : "--",
    totalDelta,
    totalDeltaLabel: totalDelta === null ? "--" : `${totalDelta > 0 ? "+" : ""}${totalDelta.toFixed(1)}${WEIGHT_UNIT}`,
    weeklyDelta,
    weeklyDeltaLabel: weeklyDelta === null ? "--" : `${weeklyDelta > 0 ? "+" : ""}${weeklyDelta.toFixed(1)}${WEIGHT_UNIT}`,
  };
}

function getWeeklyCleanScore() {
  const recentEntries = getRecentDatedEntries(state.cleanEntries, 7);
  return recentEntries.length
    ? Math.round(
        recentEntries.reduce((sum, entry) => sum + cleanScore(entry), 0) /
          recentEntries.length
      )
    : null;
}

function getRecentPerfectDays(entries, numberOfDays) {
  return getRecentDatedEntries(entries, numberOfDays).filter(
    (entry) => cleanScore(entry) === 100
  ).length;
}

function buildOverviewMessage(weeklyScore, perfectStreak, latestWeight) {
  if (!state.cleanEntries.length && !state.weightEntries.length) {
    return "Start by logging today's habits or your latest weigh-in to bring this dashboard to life.";
  }

  const scoreText = weeklyScore === null ? "No clean score yet" : `${weeklyScore}% clean score`;
  const streakText = perfectStreak ? `${perfectStreak} day streak` : "a fresh streak";
  const weightText = latestWeight ? `Current weight ${latestWeight.weight.toFixed(1)} ${WEIGHT_UNIT}.` : "Add a weight entry when you're ready.";
  return `${scoreText}, ${streakText}. ${weightText}`;
}

function buildCleanScoreMessage(weeklyScore, perfectStreak) {
  if (weeklyScore === null) {
    return "Log a few dated habit entries and this score will start reflecting your week.";
  }

  if (perfectStreak >= 5) {
    return `You're riding a ${perfectStreak}-day streak with a ${weeklyScore}% score this week.`;
  }

  return `You've maintained a ${weeklyScore}% clean-eating score this week. Keep stacking simple wins.`;
}

function currentWeekdayName() {
  return new Date().toLocaleDateString(undefined, { weekday: "long" });
}

function formatMiniDate(dateString) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatShortDate(dateString) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatLongDate(dateString) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatWeekLabel(dateString, highlight) {
  return `Week of ${formatShortDate(dateString)}${highlight ? " • Latest" : ""}`;
}

function getRecentDateList(numberOfDays) {
  const dates = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let index = numberOfDays - 1; index >= 0; index -= 1) {
    const next = new Date(cursor);
    next.setDate(cursor.getDate() - index);
    dates.push(next.toISOString().slice(0, 10));
  }

  return dates;
}

function cleanScore(entry) {
  const total = [entry.followedDiet, entry.noSugar, entry.noOutsideFood].filter(Boolean).length;
  return Math.round((total / 3) * 100);
}

function calculatePerfectStreak(entries) {
  const dated = entries.filter((entry) => entry.date).sort(compareDateDesc);
  let streak = 0;
  let expectedDate = new Date();
  expectedDate.setHours(0, 0, 0, 0);

  for (const entry of dated) {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);

    if (entryDate.getTime() === expectedDate.getTime() && cleanScore(entry) === 100) {
      streak += 1;
      expectedDate.setDate(expectedDate.getDate() - 1);
      continue;
    }

    if (entryDate.getTime() === expectedDate.getTime()) {
      break;
    }

    const yesterday = new Date(expectedDate);
    yesterday.setDate(yesterday.getDate() - 1);
    if (streak === 0 && entryDate.getTime() === yesterday.getTime() && cleanScore(entry) === 100) {
      streak += 1;
      expectedDate = yesterday;
      expectedDate.setDate(expectedDate.getDate() - 1);
      continue;
    }

    break;
  }

  return streak;
}

function getRecentDatedEntries(entries, numberOfDays) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (numberOfDays - 1));
  cutoff.setHours(0, 0, 0, 0);

  return entries.filter((entry) => entry.date && new Date(entry.date) >= cutoff);
}

function matchesFoodQuery(item, query) {
  if (!query) {
    return true;
  }

  return `${item.title} ${item.description}`.toLowerCase().includes(query);
}

function upsertByKey(entries, key, newEntry) {
  const filtered = entries.filter((entry) => entry[key] !== newEntry[key]);
  return [...filtered, newEntry];
}

function mergeImportedByKey(existingEntries, importedEntries, key) {
  let merged = [...existingEntries];
  importedEntries.forEach((entry) => {
    merged = upsertByKey(merged, key, { ...entry, id: crypto.randomUUID() });
  });
  return merged;
}

function mergeDailyEntries(existingEntries, importedEntries) {
  let merged = [...existingEntries];
  importedEntries.forEach((entry) => {
    const identity = getDailyIdentity(entry);
    merged = [
      ...merged.filter((item) => getDailyIdentity(item) !== identity),
      { ...entry, id: crypto.randomUUID() },
    ];
  });
  return merged;
}

function parseDelimitedRows(raw) {
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((row) => row.split("\t").map((value) => value.trim()));
}

function mapDailyRow(headers, row) {
  const dayLabel = getColumnValue(headers, row, ["day", "daylabel"]) || "";
  const date = getColumnValue(headers, row, ["date", "entrydate"]) || "";
  if (!dayLabel && !date) {
    throw new Error("Daily tracker import needs at least a day or date column.");
  }

  const parsedDate = date ? parseSpreadsheetDate(date) : "";

  return {
    id: crypto.randomUUID(),
    date: parsedDate,
    dayLabel: dayLabel || (parsedDate ? autoDayLabelFromDate(parsedDate) : ""),
    followedDiet: parseBooleanish(getColumnValue(headers, row, ["followeddiet", "diet"])),
    noSugar: parseBooleanish(getColumnValue(headers, row, ["nosugar", "sugarfree"])),
    noOutsideFood: parseBooleanish(
      getColumnValue(headers, row, ["nooutsidefood", "outsidefood"])
    ),
    note: getColumnValue(headers, row, ["note", "notes", "comment"]) || "",
  };
}

function mapWeightRow(headers, row) {
  const date = getColumnValue(headers, row, ["date", "weekending", "week", "entrydate"]);
  const weightValue = getColumnValue(headers, row, ["weight", "lbs", "pounds"]);
  const note = getColumnValue(headers, row, ["note", "notes", "comment"]) || "";

  if (!date || !weightValue) {
    throw new Error("Weight import needs date and weight columns.");
  }

  return {
    id: crypto.randomUUID(),
    date: parseSpreadsheetDate(date),
    weight: Number(weightValue),
    note,
  };
}

function getColumnValue(headers, row, aliases) {
  const index = headers.findIndex((header) => aliases.includes(header));
  return index === -1 ? null : row[index];
}

function normalizeHeader(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseSpreadsheetDate(value) {
  const trimmed = String(value).trim();
  if (!trimmed) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Could not read date: ${value}`);
  }

  return parsed.toISOString().slice(0, 10);
}

function parseBooleanish(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value || "").trim().toLowerCase();
  return ["yes", "y", "true", "1", "done", "checked"].includes(normalized);
}

function buildDailyCsv() {
  const rows = [["date", "dayLabel", "followedDiet", "noSugar", "noOutsideFood", "note"]];
  [...state.cleanEntries]
    .sort(compareDailyEntries)
    .forEach((entry) =>
      rows.push([
        entry.date,
        entry.dayLabel || "",
        entry.followedDiet,
        entry.noSugar,
        entry.noOutsideFood,
        entry.note || "",
      ])
    );
  return rows.map(csvRow).join("\n");
}

function buildWeightCsv() {
  const rows = [["date", "weight", "note"]];
  [...state.weightEntries]
    .sort(compareDateAsc)
    .forEach((entry) => rows.push([entry.date, entry.weight, entry.note || ""]));
  return rows.map(csvRow).join("\n");
}

function csvRow(columns) {
  return columns
    .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
    .join(",");
}

function downloadCsv(fileName, content) {
  downloadBlob(fileName, content, "text/csv;charset=utf-8;");
}

function downloadJson(fileName, content) {
  downloadBlob(fileName, JSON.stringify(content, null, 2), "application/json");
}

function downloadBlob(fileName, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function autoDayLabelFromDate(dateString) {
  const ordered = [...state.cleanEntries].filter((entry) => entry.date).sort(compareDateAsc);
  const existingIndex = ordered.findIndex((entry) => entry.date === dateString);
  if (existingIndex !== -1) {
    return `Day ${existingIndex + 1}`;
  }

  const combined = [...ordered, { date: dateString }].sort(compareDateAsc);
  return `Day ${combined.findIndex((entry) => entry.date === dateString) + 1}`;
}

function getDailyIdentity(entry) {
  return entry.date || `label:${entry.dayLabel}`;
}

function extractDayNumber(dayLabel) {
  const match = String(dayLabel || "").match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function compareDateDesc(left, right) {
  return right.date.localeCompare(left.date);
}

function compareDateAsc(left, right) {
  return left.date.localeCompare(right.date);
}

function compareDailyEntries(left, right) {
  if (left.date && right.date) {
    return right.date.localeCompare(left.date);
  }
  if (left.date) {
    return -1;
  }
  if (right.date) {
    return 1;
  }
  return (extractDayNumber(right.dayLabel) || 0) - (extractDayNumber(left.dayLabel) || 0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.add("hidden");
  }, 2400);
}

async function installApp() {
  if (!deferredInstallPrompt) {
    showToast("On iPhone, open Safari Share and tap Add to Home Screen.");
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  elements.installButton.classList.add("hidden");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // The app still works if service worker registration is unavailable.
    });
  }
}
