const eventsContainer = document.getElementById("events");
const eventModal = document.getElementById("eventModal");
const eventForm = document.getElementById("eventForm");
const createEventBtn = document.getElementById("createEventBtn");
const closeModal = document.getElementById("closeModal");
const deleteEventBtn = document.getElementById("deleteEvent");
const searchInput = document.getElementById("searchInput");
const filterSegment = document.getElementById("filterSegment");
const calendarGrid = document.getElementById("calendarGrid");
const weekStrip = document.getElementById("weekStrip");
const calendarTitle = document.getElementById("calendarTitle");
const calendarView = document.getElementById("calendarView");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");

const fields = {
  id: document.getElementById("eventId"),
  title: document.getElementById("title"),
  date: document.getElementById("date"),
  time: document.getElementById("time"),
  priority: document.getElementById("priority"),
  location: document.getElementById("location"),
  attendees: document.getElementById("attendees"),
};

const defaultEvents = [
  {
    id: crypto.randomUUID(),
    title: "Treino",
    date: "2026-02-17",
    time: "08:30",
    location: "Academia Green Fit",
    priority: "alta",
    attendees: ["GM"],
  },
  {
    id: crypto.randomUUID(),
    title: "Reunião com o time",
    date: "2026-02-22",
    time: "09:45",
    location: "Escritório Green Leaf",
    priority: "media",
    attendees: ["J", "B"],
  },
  {
    id: crypto.randomUUID(),
    title: "Almoço com Stephanie",
    date: "2026-02-27",
    time: "13:00",
    location: "Café Mallota",
    priority: "baixa",
    attendees: ["S"],
  },
];

const state = {
  filter: "day",
  calendarView: "month",
  selectedDate: new Date(),
  currentMonth: new Date(),
  search: "",
};

state.selectedDate.setHours(0, 0, 0, 0);
state.currentMonth = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), 1);

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(dateStr) {
  return new Date(`${dateStr}T00:00:00`);
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDateParts(dateStr) {
  const date = parseISODate(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const month = date
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();
  return { day, month };
}

function formatMonthTitle(date) {
  const text = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getEventsOnDate(dateStr) {
  return events.filter((event) => event.date === dateStr);
}

function normalizeEvents(list) {
  const hasOrder = list.every((event) => typeof event.order === "number");
  if (!hasOrder) {
    const sorted = [...list].sort((a, b) => {
      if (a.date === b.date) return a.time.localeCompare(b.time);
      return a.date.localeCompare(b.date);
    });
    sorted.forEach((event, index) => {
      event.order = index + 1;
    });
    return sorted;
  }
  return list;
}

function loadEvents() {
  const stored = localStorage.getItem("agenda-events");
  if (stored) {
    return normalizeEvents(JSON.parse(stored));
  }
  const seeded = normalizeEvents(defaultEvents);
  localStorage.setItem("agenda-events", JSON.stringify(seeded));
  return seeded;
}

let events = loadEvents();

function saveEvents() {
  localStorage.setItem("agenda-events", JSON.stringify(events));
}

function updateFilterButtons() {
  filterSegment.querySelectorAll(".seg-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.filter);
  });
}

function updateCalendarViewButtons() {
  calendarView.querySelectorAll(".seg-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.calendarView);
  });
}

function setSelectedDate(date) {
  state.selectedDate = new Date(date);
  state.selectedDate.setHours(0, 0, 0, 0);
  state.currentMonth = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), 1);
}

function getFilteredEvents() {
  const search = state.search.toLowerCase();
  const selectedISO = toISODate(state.selectedDate);
  let filtered = events;

  if (state.filter === "day") {
    filtered = filtered.filter((event) => event.date === selectedISO);
  } else {
    const weekStart = startOfWeek(state.selectedDate);
    const weekEnd = addDays(weekStart, 6);
    filtered = filtered.filter((event) => {
      const date = parseISODate(event.date);
      return date >= weekStart && date <= weekEnd;
    });
  }

  if (search) {
    filtered = filtered.filter((event) => {
      const haystack = `${event.title} ${event.location} ${event.attendees.join(" ")}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  return filtered.sort((a, b) => a.order - b.order);
}

function renderEvents() {
  eventsContainer.innerHTML = "";
  const filtered = getFilteredEvents();
  const priorityLabels = { alta: "Alta", media: "Média", baixa: "Baixa" };

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Sem eventos para este filtro.";
    eventsContainer.appendChild(empty);
    return;
  }

  filtered.forEach((event) => {
    const { day, month } = formatDateParts(event.date);

    const row = document.createElement("div");
    row.className = "event-row";
    row.dataset.id = event.id;
    row.draggable = true;

    row.innerHTML = `
      <div class="date-card">
        <div>${day}</div>
        <span>${month}</span>
      </div>
      <div class="event-card">
        <div class="event-top">
          <div class="event-title">${event.title}</div>
          <div class="event-badges">
            <span class="drag-handle"><i data-lucide="grip-vertical"></i></span>
            <span class="priority ${event.priority}">${priorityLabels[event.priority] ?? event.priority}</span>
          </div>
        </div>
        <div class="event-meta">
          <span class="meta-item"><i data-lucide="map-pin"></i>${event.location}</span>
          <span class="meta-item"><i data-lucide="clock"></i>${event.time}</span>
        </div>
        <div class="event-meta">
          <div class="attendees">
            ${event.attendees
              .slice(0, 3)
              .map((person) => `<span class="avatar-mini">${person}</span>`)
              .join("")}
            ${event.attendees.length > 3 ? `<span class="avatar-mini">+${event.attendees.length - 3}</span>` : ""}
          </div>
          <div class="card-actions">
            <button data-action="edit" data-id="${event.id}">Editar</button>
          </div>
        </div>
      </div>
    `;

    eventsContainer.appendChild(row);
  });

  renderIcons();
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  weekStrip.innerHTML = "";
  const todayISO = toISODate(new Date());

  if (state.calendarView === "month") {
    weekStrip.classList.add("hidden");
    calendarGrid.classList.remove("hidden");
    calendarTitle.textContent = formatMonthTitle(state.currentMonth);

    const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
    dayLabels.forEach((label) => {
      const cell = document.createElement("div");
      cell.className = "calendar-header-cell";
      cell.textContent = label;
      calendarGrid.appendChild(cell);
    });

    const firstDay = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = addDays(firstDay, -startOffset);

    for (let i = 0; i < 42; i += 1) {
      const current = addDays(gridStart, i);
      const iso = toISODate(current);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "calendar-cell";
      if (current.getMonth() !== state.currentMonth.getMonth()) {
        cell.classList.add("is-other");
      }
      if (iso === toISODate(state.selectedDate)) {
        cell.classList.add("is-selected");
      }
      if (iso === todayISO) {
        cell.classList.add("is-today");
      }
      if (getEventsOnDate(iso).length) {
        cell.classList.add("has-events");
      }
      cell.dataset.date = iso;
      cell.textContent = current.getDate();
      calendarGrid.appendChild(cell);
    }
  } else {
    calendarGrid.classList.add("hidden");
    weekStrip.classList.remove("hidden");

    const weekStart = startOfWeek(state.selectedDate);
    const weekEnd = addDays(weekStart, 6);
    const startLabel = weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const endLabel = weekEnd.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    calendarTitle.textContent = `Semana de ${startLabel} - ${endLabel}`;

    const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
    for (let i = 0; i < 7; i += 1) {
      const current = addDays(weekStart, i);
      const iso = toISODate(current);
      const day = document.createElement("div");
      day.className = "week-day";
      if (iso === toISODate(state.selectedDate)) {
        day.classList.add("is-selected");
      }
      if (iso === todayISO) {
        day.classList.add("is-today");
      }
      day.dataset.date = iso;
      day.innerHTML = `
        <strong>${current.getDate()}</strong>
        <small>${dayLabels[i]}</small>
      `;
      if (getEventsOnDate(iso).length) {
        day.dataset.hasEvents = "true";
      }
      weekStrip.appendChild(day);
    }
  }

  renderIcons();
}

function openModal(event = null) {
  eventModal.classList.add("open");
  eventModal.setAttribute("aria-hidden", "false");
  document.getElementById("modalTitle").textContent = event ? "Editar evento" : "Criar evento";
  deleteEventBtn.style.display = event ? "inline-flex" : "none";

  if (event) {
    fields.id.value = event.id;
    fields.title.value = event.title;
    fields.date.value = event.date;
    fields.time.value = event.time;
    fields.priority.value = event.priority;
    fields.location.value = event.location;
    fields.attendees.value = event.attendees.join(", ");
  } else {
    fields.id.value = "";
    fields.title.value = "";
    fields.date.value = toISODate(state.selectedDate);
    fields.time.value = "09:00";
    fields.priority.value = "media";
    fields.location.value = "";
    fields.attendees.value = "";
  }
}

function closeModalWindow() {
  eventModal.classList.remove("open");
  eventModal.setAttribute("aria-hidden", "true");
}

function renderIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function upsertEvent(formData) {
  if (formData.id) {
    const existing = events.find((event) => event.id === formData.id);
    const order = existing ? existing.order : formData.order;
    events = events.map((event) => (event.id === formData.id ? { ...formData, order } : event));
  } else {
    const maxOrder = events.reduce((max, event) => Math.max(max, event.order || 0), 0);
    events.push({ ...formData, id: crypto.randomUUID(), order: maxOrder + 1 });
  }
  saveEvents();
  setSelectedDate(parseISODate(formData.date));
  state.filter = "day";
  updateFilterButtons();
  renderCalendar();
  renderEvents();
  closeModalWindow();
}

function reorderFromDom() {
  const ids = Array.from(eventsContainer.querySelectorAll(".event-row")).map(
    (row) => row.dataset.id
  );
  if (!ids.length) return;

  const orderValues = ids
    .map((id) => events.find((event) => event.id === id)?.order ?? 0)
    .sort((a, b) => a - b);

  ids.forEach((id, index) => {
    const event = events.find((item) => item.id === id);
    if (event) event.order = orderValues[index] ?? index + 1;
  });

  saveEvents();
  renderEvents();
}

createEventBtn.addEventListener("click", () => openModal());
closeModal.addEventListener("click", closeModalWindow);
eventModal.addEventListener("click", (event) => {
  if (event.target === eventModal) closeModalWindow();
});

filterSegment.addEventListener("click", (event) => {
  const button = event.target.closest(".seg-btn");
  if (!button) return;
  state.filter = button.dataset.filter;
  updateFilterButtons();
  renderEvents();
});

calendarView.addEventListener("click", (event) => {
  const button = event.target.closest(".seg-btn");
  if (!button) return;
  state.calendarView = button.dataset.view;
  updateCalendarViewButtons();
  renderCalendar();
});

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value.trim();
  renderEvents();
});

prevMonthBtn.addEventListener("click", () => {
  if (state.calendarView === "month") {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
    renderCalendar();
  } else {
    setSelectedDate(addDays(state.selectedDate, -7));
    renderCalendar();
    renderEvents();
  }
});

nextMonthBtn.addEventListener("click", () => {
  if (state.calendarView === "month") {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
    renderCalendar();
  } else {
    setSelectedDate(addDays(state.selectedDate, 7));
    renderCalendar();
    renderEvents();
  }
});

calendarGrid.addEventListener("click", (event) => {
  const cell = event.target.closest("button[data-date]");
  if (!cell) return;
  setSelectedDate(parseISODate(cell.dataset.date));
  state.filter = "day";
  updateFilterButtons();
  renderCalendar();
  renderEvents();
});

weekStrip.addEventListener("click", (event) => {
  const day = event.target.closest(".week-day");
  if (!day) return;
  setSelectedDate(parseISODate(day.dataset.date));
  state.filter = "day";
  updateFilterButtons();
  renderCalendar();
  renderEvents();
});

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = {
    id: fields.id.value,
    title: fields.title.value.trim(),
    date: fields.date.value,
    time: fields.time.value,
    priority: fields.priority.value,
    location: fields.location.value.trim(),
    attendees: fields.attendees.value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.slice(0, 2).toUpperCase()),
  };

  upsertEvent(formData);
});

deleteEventBtn.addEventListener("click", () => {
  const id = fields.id.value;
  if (!id) return;
  events = events.filter((event) => event.id !== id);
  saveEvents();
  renderCalendar();
  renderEvents();
  closeModalWindow();
});

eventsContainer.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='edit']");
  if (!button) return;
  const eventId = button.dataset.id;
  const eventData = events.find((item) => item.id === eventId);
  if (eventData) openModal(eventData);
});

let draggingRow = null;

function clearDragging() {
  if (draggingRow) draggingRow.classList.remove("dragging");
  draggingRow = null;
}

eventsContainer.addEventListener("dragstart", (event) => {
  const row = event.target.closest(".event-row");
  if (!row) return;
  draggingRow = row;
  row.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
});

eventsContainer.addEventListener("dragover", (event) => {
  event.preventDefault();
  const row = event.target.closest(".event-row");
  if (!row || !draggingRow || row === draggingRow) return;
  const rect = row.getBoundingClientRect();
  const shouldInsertAfter = event.clientY > rect.top + rect.height / 2;
  eventsContainer.insertBefore(draggingRow, shouldInsertAfter ? row.nextSibling : row);
});

eventsContainer.addEventListener("drop", (event) => {
  event.preventDefault();
  reorderFromDom();
  clearDragging();
});

eventsContainer.addEventListener("dragend", () => {
  clearDragging();
});

updateFilterButtons();
updateCalendarViewButtons();
renderCalendar();
renderEvents();
renderIcons();
