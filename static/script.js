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

// Invite modal
const inviteModal = document.getElementById("inviteModal");
const inviteForm = document.getElementById("inviteForm");
const inviteCancelBtn = document.getElementById("inviteCancelBtn");
const inviteBtn = document.getElementById("inviteBtn");

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
const detailAttachmentsList = document.getElementById('detailAttachmentsList');
const closeDetailBtn = document.getElementById('closeDetailBtn');
const saveTicketBtn = document.getElementById('saveTicketBtn');

const uploadNewAttachmentsBtn = document.getElementById('uploadNewAttachmentsBtn');
const newAttachmentInput = document.getElementById('newAttachmentInput');

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

// Submit new ticket form
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  try {
    const response = await fetch("/submit_ticket", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        form.reset();
        modal.style.display = "none";
        await loadTickets();
        openTicketDetail(result.ticket);
      } else {
        alert("Ticket submission failed on server.");
      }
    } else {
      alert("Failed to create ticket. Server error.");
    }
  } catch (err) {
    console.error("Error submitting ticket:", err);
    alert("An error occurred. Check console.");
  }
});

// Load tickets and render in columns
async function loadTickets() {
  const res = await fetch("/get_tickets");
  if (!res.ok) {
    alert("Failed to load tickets from server.");
    return;
  }
  const tickets = await res.json();
  console.log('Tickets fetched:', tickets);

  // Clear columns
  document.querySelectorAll(".un-column").forEach(col => {
    col.querySelectorAll(".ticket").forEach(ticket => ticket.remove());
  });

  tickets.forEach(ticket => {
    console.log('Appending ticket:', ticket.id, ticket.status);
    const ticketDiv = document.createElement('div');
    ticketDiv.classList.add('ticket');
    ticketDiv.dataset.type = ticket.workType || "Unknown";
    ticketDiv.dataset.game = ticket.gameName || "Unknown";
    ticketDiv.dataset.ticketId = ticket.id || "";
    ticketDiv.textContent = `${ticket.summary || 'No summary'} [${ticket.workType || 'No type'}]`;
    ticketDiv.ticketData = ticket;

    ticketDiv.addEventListener('click', () => openTicketDetail(ticketDiv.ticketData));

    const column = document.getElementById(ticket.status);
    if (column) {
      column.appendChild(ticketDiv);
    } else {
      console.warn(`Ticket with id=${ticket.id} has unknown status: ${ticket.status}`);
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

// Invite modal handlers
inviteBtn.addEventListener("click", () => {
  inviteModal.style.display = "flex";
});
inviteCancelBtn.addEventListener("click", () => {
  inviteModal.style.display = "none";
});
inviteForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("inviteName").value.trim();
  const role = document.getElementById("inviteRole").value.trim();
  const email = document.getElementById("inviteEmail").value.trim();

  try {
    const response = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, email })
    });

    if (response.ok) {
      alert(`Invite sent to ${name} (${email}) as ${role}`);
      inviteForm.reset();
      inviteModal.style.display = "none";
    } else {
      const error = await response.json();
      alert(`Error: ${error.message || 'Failed to send invite'}`);
    }
  } catch (err) {
    alert("Error sending invite. Check console.");
    console.error(err);
  }
});

// Open ticket detail modal and fill fields
async function openTicketDetail(ticket) {
  currentTicket = ticket;
  ticketDetailModal.classList.remove('hidden');

  try {
    const res = await fetch(`/get_ticket/${ticket.id}`);
    if (!res.ok) throw new Error('Failed to fetch ticket details');

    const fullTicket = await res.json();

    detailSummary.value = fullTicket.summary || '';
    detailProject.value = fullTicket.project || '';
    detailType.value = fullTicket.workType || fullTicket.type || '';
    detailStatus.value = fullTicket.status || '';
    detailDescription.value = fullTicket.description || '';
    detailAssignee.value = fullTicket.assignee || '';
    detailTeam.value = fullTicket.team || '';
    detailGame.value = fullTicket.gameName || fullTicket.game || '';

    // Render attachments
    if (!fullTicket.attachments || fullTicket.attachments.length === 0) {
      detailAttachmentsList.textContent = 'No attachments';
    } else {
      detailAttachmentsList.innerHTML = ''; // clear
      fullTicket.attachments.forEach(att => {
        const a = document.createElement('a');
        a.href = `/attachment/${att.id}`;
        a.textContent = att.filename;
        a.target = '_blank';
        a.style.color = '#2563eb';
        a.style.display = 'block';
        detailAttachmentsList.appendChild(a);
      });
    }
  } catch (err) {
    console.error(err);
    alert('Failed to load ticket details with attachments');
  }
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

  const updatedTicket = {
    id: currentTicket.id,
    status: detailStatus.value,
    description: detailDescription.value,
    assignee: detailAssignee.value,
    team: detailTeam.value,
    gameName: detailGame.value,
    summary: detailSummary.value,
    project: detailProject.value,
    workType: detailType.value
  };

  fetch('/update_ticket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedTicket)
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        ticketDetailModal.classList.add('hidden');
        loadTickets();
      } else {
        alert('Failed to update ticket');
      }
    })
    .catch(() => alert('Error updating ticket'));
});

// Upload new attachments button listener
uploadNewAttachmentsBtn.addEventListener('click', async () => {
  if (!currentTicket || !currentTicket.id) {
    alert('No ticket selected for uploading attachments');
    return;
  }

  const files = newAttachmentInput.files;
  if (!files.length) {
    alert('Please select files to upload');
    return;
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append('newAttachments', file);
  }

  try {
    const res = await fetch(`/add_attachments/${currentTicket.id}`, {
      method: 'POST',
      body: formData
    });

    const result = await res.json();
    if (result.success) {
      alert('Attachments added successfully');
      newAttachmentInput.value = ''; // clear file input
      openTicketDetail(currentTicket); // Refresh attachments list
    } else {
      alert('Failed to upload attachments: ' + (result.error || 'Unknown error'));
    }
  } catch (err) {
    console.error(err);
    alert('Error uploading attachments');
  }
});

// Initial load tickets on page load
window.onload = () => {
  loadTickets();
};
