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
const ministryTags = document.getElementById("ministryTags");
const formStatus = document.getElementById("formStatus");
const saveButton = document.querySelector("#eventForm button[type='submit']");

const fields = {
  id: document.getElementById("eventId"),
  title: document.getElementById("title"),
  date: document.getElementById("date"),
  time: document.getElementById("time"),
  priority: document.getElementById("priority"),
  location: document.getElementById("location"),
};

const ministries = [
  "Música",
  "Jovens",
  "Intercessão",
  "Famílias",
  "Infantil",
  "Homens",
  "Mulheres",
  "Diáconos",
  "Adolescentes",
  "Capelania",
  "Evangelismo",
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

let events = [];

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
    .toLocaleDateString("pt-BR", { month: "short" })
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

function normalizeAttendees(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function getInitials(label) {
  const words = label.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function renderMinistryTags() {
  ministryTags.innerHTML = "";
  ministries.forEach((name) => {
    const tag = document.createElement("button");
    tag.type = "button";
    tag.className = "tag";
    tag.dataset.value = name;
    tag.textContent = name;
    ministryTags.appendChild(tag);
  });
}

function setSelectedMinistries(selected = []) {
  const selectedSet = new Set(selected);
  ministryTags.querySelectorAll(".tag").forEach((tag) => {
    tag.classList.toggle("selected", selectedSet.has(tag.dataset.value));
  });
}

function getSelectedMinistries() {
  return Array.from(ministryTags.querySelectorAll(".tag.selected")).map(
    (tag) => tag.dataset.value
  );
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

function setFilterDay() {
  state.filter = "day";
  updateFilterButtons();
  renderEvents();
}

function setFilterWeek() {
  state.filter = "week";
  updateFilterButtons();
  renderEvents();
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
    const attendees = normalizeAttendees(event.attendees);

    const row = document.createElement("div");
    row.className = "event-row";
    row.dataset.id = event.id;
    row.draggable = true;

    row.innerHTML = `
      <div class="event-card single">
        <div class="event-date">
          <div class="day">${day}</div>
          <span>${month}</span>
        </div>
        <div class="event-content">
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
          <div class="event-bottom">
            <div class="tag-chips">
              ${attendees.map((tag) => `<span class="tag-chip">${tag}</span>`).join("")}
            </div>
            <div class="card-actions">
              <button data-action="edit" data-id="${event.id}">Editar</button>
            </div>
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
  formStatus.textContent = "";
  formStatus.classList.remove("error");

  if (event) {
    fields.id.value = event.id;
    fields.title.value = event.title;
    fields.date.value = event.date;
    fields.time.value = event.time;
    fields.priority.value = event.priority;
    fields.location.value = event.location;
    setSelectedMinistries(normalizeAttendees(event.attendees));
  } else {
    fields.id.value = "";
    fields.title.value = "";
    fields.date.value = toISODate(state.selectedDate);
    fields.time.value = "09:00";
    fields.priority.value = "media";
    fields.location.value = "";
    setSelectedMinistries([]);
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

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const json = JSON.parse(text);
      if (json?.error) message = json.error;
    } catch (_) {
      // keep raw text
    }
    throw new Error(message || "Erro ao acessar o servidor");
  }

  if (response.status === 204) return null;
  return response.json();
}

async function fetchEvents() {
  const data = await apiRequest("/api/events");
  return Array.isArray(data) ? data : [];
}

async function refreshEvents() {
  events = await fetchEvents();
  if (events.length && state.filter === "day") {
    const selectedISO = toISODate(state.selectedDate);
    const hasSelected = events.some((event) => event.date === selectedISO);
    if (!hasSelected) {
      setSelectedDate(parseISODate(events[0].date));
    }
  }
  renderCalendar();
  renderEvents();
}

async function createEvent(formData) {
  await apiRequest("/api/events", {
    method: "POST",
    body: JSON.stringify(formData),
  });
}

async function updateEvent(formData) {
  await apiRequest("/api/events", {
    method: "PUT",
    body: JSON.stringify(formData),
  });
}

async function deleteEvent(id) {
  await apiRequest(`/api/events?id=${id}`, { method: "DELETE" });
}

async function reorderEvents(updates) {
  await apiRequest("/api/reorder", {
    method: "POST",
    body: JSON.stringify({ updates }),
  });
}

async function upsertEvent(formData) {
  if (formData.id) {
    await updateEvent(formData);
  } else {
    await createEvent(formData);
  }
  setSelectedDate(parseISODate(formData.date));
  setFilterDay();
  await refreshEvents();
}

createEventBtn.addEventListener("click", () => openModal());
closeModal.addEventListener("click", closeModalWindow);
eventModal.addEventListener("click", (event) => {
  if (event.target === eventModal) closeModalWindow();
});

filterSegment.addEventListener("click", (event) => {
  const button = event.target.closest(".seg-btn");
  if (!button) return;
  if (button.dataset.filter === "day") {
    setFilterDay();
  } else {
    setFilterWeek();
  }
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
  setFilterDay();
  renderCalendar();
});

weekStrip.addEventListener("click", (event) => {
  const day = event.target.closest(".week-day");
  if (!day) return;
  setSelectedDate(parseISODate(day.dataset.date));
  setFilterDay();
  renderCalendar();
});

eventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!eventForm.reportValidity()) return;

  const formData = {
    id: fields.id.value,
    title: fields.title.value.trim(),
    date: fields.date.value,
    time: fields.time.value,
    priority: fields.priority.value,
    location: fields.location.value.trim(),
    attendees: getSelectedMinistries(),
  };

  formStatus.textContent = "Salvando...";
  formStatus.classList.remove("error");
  saveButton.disabled = true;
  try {
    await upsertEvent(formData);
    formStatus.textContent = "Evento salvo com sucesso.";
    closeModalWindow();
  } catch (error) {
    formStatus.textContent = error.message || "Erro ao salvar o evento.";
    formStatus.classList.add("error");
  } finally {
    saveButton.disabled = false;
  }
});

deleteEventBtn.addEventListener("click", async () => {
  const id = fields.id.value;
  if (!id) return;
  await deleteEvent(id);
  await refreshEvents();
  closeModalWindow();
});

eventsContainer.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='edit']");
  if (!button) return;
  const eventId = button.dataset.id;
  const eventData = events.find((item) => item.id === eventId);
  if (eventData) openModal(eventData);
});

ministryTags.addEventListener("click", (event) => {
  const tag = event.target.closest(".tag");
  if (!tag) return;
  tag.classList.toggle("selected");
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

eventsContainer.addEventListener("drop", async (event) => {
  event.preventDefault();
  const ids = Array.from(eventsContainer.querySelectorAll(".event-row")).map((row) => row.dataset.id);
  if (!ids.length) return;

  const orderValues = ids
    .map((id) => events.find((item) => item.id === id)?.order ?? 0)
    .sort((a, b) => a - b);

  const updates = ids.map((id, index) => ({
    id,
    order: orderValues[index] ?? index + 1,
  }));

  updates.forEach((update) => {
    const eventData = events.find((item) => item.id === update.id);
    if (eventData) eventData.order = update.order;
  });

  try {
    await reorderEvents(updates);
    await refreshEvents();
  } catch (error) {
    console.error(error);
  } finally {
    clearDragging();
  }
});

eventsContainer.addEventListener("dragend", () => {
  clearDragging();
});

updateFilterButtons();
updateCalendarViewButtons();
renderMinistryTags();
renderCalendar();
renderEvents();
renderIcons();
refreshEvents().catch((error) => {
  console.error(error);
});
