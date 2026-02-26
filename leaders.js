const leaderForm = document.getElementById("leaderForm");
const leaderId = document.getElementById("leaderId");
const leaderName = document.getElementById("leaderName");
const leaderPhone = document.getElementById("leaderPhone");
const leaderOptIn = document.getElementById("leaderOptIn");
const leaderTags = document.getElementById("leaderTags");
const resetLeader = document.getElementById("resetLeader");
const leadersList = document.getElementById("leadersList");
const leaderStatus = document.getElementById("leaderStatus");
const refreshLeadersBtn = document.getElementById("refreshLeaders");
const saveLeaderButton = document.querySelector("#leaderForm button[type='submit']");

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

let leaders = [];

function renderIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function renderTagButtons(container) {
  container.innerHTML = "";
  ministries.forEach((name) => {
    const tag = document.createElement("button");
    tag.type = "button";
    tag.className = "tag";
    tag.dataset.value = name;
    tag.textContent = name;
    container.appendChild(tag);
  });
}

function setSelectedTags(container, selected = []) {
  const selectedSet = new Set(selected);
  container.querySelectorAll(".tag").forEach((tag) => {
    tag.classList.toggle("selected", selectedSet.has(tag.dataset.value));
  });
}

function getSelectedTags(container) {
  return Array.from(container.querySelectorAll(".tag.selected")).map(
    (tag) => tag.dataset.value
  );
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

async function fetchLeaders() {
  const data = await apiRequest("/api/leaders");
  return Array.isArray(data) ? data : [];
}

async function refreshLeaders() {
  leaders = await fetchLeaders();
  renderLeadersList();
}

async function createLeader(formData) {
  await apiRequest("/api/leaders", {
    method: "POST",
    body: JSON.stringify(formData),
  });
}

async function updateLeader(formData) {
  await apiRequest("/api/leaders", {
    method: "PUT",
    body: JSON.stringify(formData),
  });
}

async function deleteLeader(id) {
  await apiRequest(`/api/leaders?id=${id}`, { method: "DELETE" });
}

function renderLeadersList() {
  leadersList.innerHTML = "";
  if (!leaders.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Nenhum líder cadastrado.";
    leadersList.appendChild(empty);
    return;
  }
  leaders.forEach((leader) => {
    const card = document.createElement("div");
    card.className = "leader-card";
    card.innerHTML = `
      <div class="leader-head">
        <div>
          <div class="leader-name">${leader.name}</div>
          <div class="leader-phone">${leader.phone}</div>
        </div>
        <div class="leader-actions">
          <button class="ghost" data-action="edit-leader" data-id="${leader.id}">Editar</button>
          <button class="ghost" data-action="delete-leader" data-id="${leader.id}">Excluir</button>
        </div>
      </div>
      <div class="tag-chips">
        ${(leader.ministries || []).map((tag) => `<span class="tag-chip">${tag}</span>`).join("")}
      </div>
    `;
    leadersList.appendChild(card);
  });
}

leaderTags.addEventListener("click", (event) => {
  const tag = event.target.closest(".tag");
  if (!tag) return;
  tag.classList.toggle("selected");
});

leaderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!leaderForm.reportValidity()) return;
  const data = {
    id: leaderId.value || undefined,
    name: leaderName.value.trim(),
    phone: leaderPhone.value.trim(),
    optIn: leaderOptIn.checked,
    ministries: getSelectedTags(leaderTags),
  };
  leaderStatus.textContent = "Salvando...";
  leaderStatus.classList.remove("error");
  saveLeaderButton.disabled = true;
  try {
    if (data.id) {
      await updateLeader(data);
    } else {
      await createLeader(data);
    }
    leaderStatus.textContent = "Líder salvo com sucesso.";
  } catch (error) {
    leaderStatus.textContent = error.message || "Erro ao salvar líder.";
    leaderStatus.classList.add("error");
  } finally {
    saveLeaderButton.disabled = false;
  }
});

resetLeader.addEventListener("click", () => {
  leaderForm.reset();
  leaderId.value = "";
  leaderOptIn.checked = true;
  setSelectedTags(leaderTags, []);
  leaderStatus.textContent = "";
  leaderStatus.classList.remove("error");
});

leadersList.addEventListener("click", async (event) => {
  const editBtn = event.target.closest("button[data-action='edit-leader']");
  const deleteBtn = event.target.closest("button[data-action='delete-leader']");
  if (!editBtn && !deleteBtn) return;
  const id = (editBtn || deleteBtn).dataset.id;
  const leader = leaders.find((item) => item.id === id);
  if (!leader) return;
  if (deleteBtn) {
    await deleteLeader(id);
    await refreshLeaders();
    return;
  }
  leaderId.value = leader.id;
  leaderName.value = leader.name;
  leaderPhone.value = leader.phone;
  leaderOptIn.checked = !!leader.optIn;
  setSelectedTags(leaderTags, leader.ministries || []);
});

refreshLeadersBtn.addEventListener("click", async () => {
  await refreshLeaders();
});

renderTagButtons(leaderTags);
renderIcons();
refreshLeaders().catch((error) => {
  console.error(error);
});
