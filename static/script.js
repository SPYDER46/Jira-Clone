// Modal elements
const modal = document.getElementById("ticketModal");
const openModalBtn = document.getElementById("openModalBtn");
const cancelBtn = document.getElementById("cancelBtn");
const form = document.getElementById("ticketForm");

// Filters & search
const filterType = document.getElementById("filterType");
const filterGame = document.getElementById("filterGame");
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");

// Detail modal elements
const ticketDetailModal = document.getElementById('ticketDetailModal');
const detailSummary = document.getElementById('detailSummary');
const detailProject = document.getElementById('detailProject');
const detailType = document.getElementById('detailType');
const detailStatus = document.getElementById('detailStatus');
const detailDescription = document.getElementById('detailDescription');
const detailAssignee = document.getElementById('detailAssignee');
const detailTeam = document.getElementById('detailTeam');
const detailGame = document.getElementById('detailGame');
const closeDetailBtn = document.getElementById('closeDetailBtn');
const saveTicketBtn = document.getElementById('saveTicketBtn');

let currentTicket = null;

// Open create ticket modal
openModalBtn.addEventListener("click", () => {
  modal.style.display = "flex";
});

// Cancel create ticket modal
cancelBtn.addEventListener("click", () => {
  modal.style.display = "none";
  form.reset();
});

// Prevent modal close on outside click for create ticket (optional)
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    // Do nothing - keep modal open
  }
});

// Save ticket to localStorage
function saveTicket(ticket) {
  const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
  // Check if ticket with same id exists -> update else add
  const index = tickets.findIndex(t => t.id === ticket.id);
  if (index !== -1) {
    tickets[index] = ticket;
  } else {
    tickets.push(ticket);
  }
  localStorage.setItem('tickets', JSON.stringify(tickets));
}

// Load tickets from localStorage and render
function loadTickets() {
  const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');

  // Clear columns
  document.querySelectorAll(".un-column").forEach(col => {
    col.querySelectorAll(".ticket").forEach(ticket => ticket.remove());
  });

  tickets.forEach(ticket => {
    const ticketDiv = document.createElement('div');
    ticketDiv.classList.add('ticket');
    ticketDiv.dataset.type = ticket.workType || "Unknown";
    ticketDiv.dataset.game = ticket.gameName || "Unknown";
    ticketDiv.dataset.ticketId = ticket.id || "";
    ticketDiv.textContent = `${ticket.summary || 'No summary'} [${ticket.workType || 'No type'}]`;
    ticketDiv.ticketData = ticket;

    ticketDiv.addEventListener('click', () => openTicketDetail(ticketDiv.ticketData));

    const column = document.getElementById(ticket.status) || document.querySelector('.un-column');
    if (column) {
      column.appendChild(ticketDiv);
    }
  });

  updateGameFilterOptions();
  applyFilters();
  applySearchFilter();
}

// Update Game filter dynamically from tickets
function updateGameFilterOptions() {
  const gamesSet = new Set();
  document.querySelectorAll(".ticket").forEach(ticket => {
    if (ticket.dataset.game) gamesSet.add(ticket.dataset.game);
  });

  // Clear existing options except default (index 0)
  while (filterGame.options.length > 1) filterGame.remove(1);

  Array.from(gamesSet).sort().forEach(game => {
    const option = document.createElement("option");
    option.value = game;
    option.textContent = game;
    filterGame.appendChild(option);
  });
}

// Apply Type & Game filters
function applyFilters() {
  const selectedType = filterType.value;
  const selectedGame = filterGame.value;

  document.querySelectorAll(".ticket").forEach(ticket => {
    const matchType = selectedType === "" || ticket.dataset.type === selectedType;
    const matchGame = selectedGame === "" || ticket.dataset.game === selectedGame;

    ticket.style.display = (matchType && matchGame) ? "" : "none";
  });
}

// Apply Search filter
function applySearchFilter() {
  const query = searchInput.value.trim().toLowerCase();

  document.querySelectorAll(".ticket").forEach(ticket => {
    if (ticket.style.display !== "none") {
      const text = ticket.textContent.toLowerCase();
      ticket.style.display = text.includes(query) ? "" : "none";
    }
  });
}

// Filter and Search event listeners
filterType.addEventListener("change", () => {
  applyFilters();
  applySearchFilter();
});
filterGame.addEventListener("change", () => {
  applyFilters();
  applySearchFilter();
});
searchInput.addEventListener("input", () => {
  applyFilters();
  applySearchFilter();
});
clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  applyFilters();
  applySearchFilter();
});

// Submit new ticket form
form.addEventListener("submit", (e) => {
  e.preventDefault();

  // Convert form data to ticket object
  const formData = new FormData(form);
  const ticket = {};
  formData.forEach((value, key) => {
    ticket[key] = value;
  });

  ticket.id = Date.now().toString(); // simple unique ID
  if (!ticket.status) ticket.status = "todo"; // default status column ID (adjust to your column ID)
  if (!ticket.workType) ticket.workType = "General";

  saveTicket(ticket);

  form.reset();
  modal.style.display = "none";

  loadTickets();
});

// Open ticket detail modal and fill fields
function openTicketDetail(ticket) {
  currentTicket = ticket;
  ticketDetailModal.classList.remove('hidden');

  detailSummary.value = ticket.summary || '';
  detailProject.value = ticket.project || '';
  detailType.value = ticket.workType || '';
  detailStatus.value = ticket.status || '';
  detailDescription.value = ticket.description || '';
  detailAssignee.value = ticket.assignee || '';
  detailTeam.value = ticket.team || '';
  detailGame.value = ticket.gameName || '';
}

// Close detail modal
closeDetailBtn.addEventListener('click', () => {
  ticketDetailModal.classList.add('hidden');
});

// Save updates from detail modal
saveTicketBtn.addEventListener('click', () => {
  if (!currentTicket || !currentTicket.id) {
    alert("No ticket selected or missing ticket ID!");
    return;
  }

  // Update current ticket with new values
  currentTicket.summary = detailSummary.value;
  currentTicket.project = detailProject.value;
  currentTicket.workType = detailType.value;
  currentTicket.status = detailStatus.value;
  currentTicket.description = detailDescription.value;
  currentTicket.assignee = detailAssignee.value;
  currentTicket.team = detailTeam.value;
  currentTicket.gameName = detailGame.value;

  saveTicket(currentTicket);
  ticketDetailModal.classList.add('hidden');
  loadTickets();
});

// Load tickets on page load
window.onload = function() {
  loadTickets();
};
