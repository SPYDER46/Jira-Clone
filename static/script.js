// Helper to safely parse JSON, returns null if parsing fails
async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// Open Create Ticket modal
document.getElementById('openModalBtn').addEventListener('click', () => {
  document.getElementById('ticketModal').style.display = 'block';
});

// Close Create Ticket modal on cancel
document.getElementById('cancelBtn').addEventListener('click', () => {
  document.getElementById('ticketModal').style.display = 'none';
});

// Open Invite User modal
document.getElementById('inviteBtn').addEventListener('click', () => {
  document.getElementById('inviteModal').style.display = 'block';
});

// Close Invite User modal on cancel
document.getElementById('inviteCancelBtn').addEventListener('click', () => {
  document.getElementById('inviteModal').style.display = 'none';
});

// Close Ticket Detail modal
document.getElementById('closeDetailBtn').addEventListener('click', () => {
  document.getElementById('ticketDetailModal').classList.add('hidden');
});

// Clear search input and filters
document.getElementById('clearSearchBtn').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  document.getElementById('filterType').value = '';
  document.getElementById('filterGame').value = '';
  loadTickets();
});

// Submit Ticket form
document.getElementById('ticketForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  try {
    const response = await fetch('/submit_ticket', {
      method: 'POST',
      body: formData
    });

    const result = await safeJson(response);

    if (response.ok) {
      // alert('Ticket created! ID: ' + result.ticket_id);
      form.reset();
      document.getElementById('ticketModal').style.display = 'none'; // close modal
      loadTickets(); // refresh ticket list
    } else {
      alert('Error: ' + (result?.error || response.statusText));
    }
  } catch (err) {
    alert('Network error: ' + err.message);
  }
});

// Invite User form submission
document.getElementById('inviteForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('inviteName').value.trim();
  const role = document.getElementById('inviteRole').value.trim();
  const email = document.getElementById('inviteEmail').value.trim();

  if (!name || !role || !email) {
    alert('Please fill all fields.');
    return;
  }

  try {
    const response = await fetch('/invite_user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, email })
    });

    const result = await safeJson(response);

    if (response.ok) {
      alert('User invited!');
      document.getElementById('inviteForm').reset();
      document.getElementById('inviteModal').style.display = 'none'; // close modal
    } else {
      alert('Error: ' + (result?.error || response.statusText));
    }
  } catch (err) {
    alert('Network error: ' + err.message);
  }
});

// Load tickets from backend
async function loadTickets() {
  const workType = document.getElementById('filterType').value;
  const gameName = document.getElementById('filterGame').value;
  const searchText = document.getElementById('searchInput').value.trim();

  let url = '/get_tickets?';
  if (workType) url += `workType=${encodeURIComponent(workType)}&`;
  if (gameName) url += `gameName=${encodeURIComponent(gameName)}&`;
  if (searchText) url += `search=${encodeURIComponent(searchText)}&`;

  try {
    const response = await fetch(url);
    const tickets = await safeJson(response);

    if (!response.ok) {
      alert('Error loading tickets: ' + (tickets?.error || response.statusText));
      return;
    }

    // Clear all columns first
    const statuses = ['todo', 'inprocess', 'inreview', 'done', 'onhold', 'suggestion'];
    statuses.forEach(id => {
      const col = document.getElementById(id);
      col.innerHTML = `<h2 class="un-column__header">${col.querySelector('h2').textContent}</h2>`;
    });

    tickets.forEach(ticket => {
      let colId = ticket.status.toLowerCase().replace(/\s+/g, '');
      if (!statuses.includes(colId)) colId = 'todo';

      const col = document.getElementById(colId);

      const ticketDiv = document.createElement('div');
      ticketDiv.classList.add('ticket');
      ticketDiv.textContent = ticket.summary;

      ticketDiv.dataset.ticketId = ticket.id;

      // Add click listener to show detail modal (optional)
      ticketDiv.addEventListener('click', () => {
        showTicketDetails(ticket);
      });

      col.appendChild(ticketDiv);
    });
  } catch (err) {
    alert('Network error: ' + err.message);
  }
}

// Load tickets on page load and filter changes
window.addEventListener('load', loadTickets);
document.getElementById('filterType').addEventListener('change', loadTickets);
document.getElementById('filterGame').addEventListener('change', loadTickets);
document.getElementById('searchInput').addEventListener('input', loadTickets);

// Show ticket details in modal (you need to implement this function)
function showTicketDetails(ticket) {
  document.getElementById('ticketDetailModal').classList.remove('hidden');

  document.getElementById('detailSummary').value = ticket.summary || '';
  document.getElementById('detailProject').value = ticket.project || '';
  document.getElementById('detailType').value = ticket.work_type || 'Task';
  document.getElementById('detailStatus').value = ticket.status || 'To Do';
  document.getElementById('detailDescription').value = ticket.description || '';
  document.getElementById('detailAssignee').value = ticket.assignee || '';
  document.getElementById('detailTeam').value = ticket.team || '';
  document.getElementById('detailGame').value = ticket.game_name || '';
  document.getElementById('saveTicketBtn').dataset.ticketId = ticket.id;

  const attachmentsList = document.getElementById('detailAttachmentsList');
  attachmentsList.innerHTML = '';

  if (ticket.attachments && ticket.attachments.length > 0) {
    const seen = new Set();

    ticket.attachments.forEach(att => {
      if (seen.has(att.filename)) return;
      seen.add(att.filename);

      const ext = att.filename.split('.').pop().toLowerCase();
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);

      const itemDiv = document.createElement('div');
      itemDiv.classList.add('attachment-item');
      itemDiv.dataset.attachmentId = att.id;

      if (isImage) {
        const img = document.createElement('img');
        img.src = `/attachment/${att.id}`;
        img.alt = att.filename;
        itemDiv.appendChild(img);
      }

      const link = document.createElement('a');
      link.href = `/attachment/${att.id}`;
      link.textContent = att.filename;
      link.target = '_blank';
      itemDiv.appendChild(link);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.classList.add('remove-attachment-btn');
      removeBtn.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to remove "${att.filename}"?`)) {
          await removeAttachment(att.id, ticket.id);
        }
      });
      itemDiv.appendChild(removeBtn);

      attachmentsList.appendChild(itemDiv);
    });
  } else {
    attachmentsList.textContent = 'No attachments';
  }
} 

async function removeAttachment(attachmentId, ticketId) {
  try {
    const response = await fetch(`/delete_attachment/${attachmentId}`, { method: 'DELETE' });
    const result = await safeJson(response);

    if (!response.ok) {
      alert('Error deleting attachment: ' + (result?.error || response.statusText));
      return;
    }

    const updatedTicketResponse = await fetch(`/get_ticket/${ticketId}`);

    if (!updatedTicketResponse.ok) {
      document.getElementById('ticketDetailModal').classList.add('hidden');
      loadTickets();  // reload to reflect changes
      return;
    }

    const updatedTicket = await safeJson(updatedTicketResponse);
    showTicketDetails(updatedTicket);

  } catch (err) {
    alert('Network error: ' + err.message);
  }
}
// Update ticket button (with attachment upload support)
document.getElementById('saveTicketBtn').addEventListener('click', async () => {
  const ticketId = document.getElementById('saveTicketBtn').dataset.ticketId;
  if (!ticketId) {
    alert('No ticket selected');
    return;
  }

  const fileInput = document.getElementById('newAttachmentInput');

  try {
    // 1) Update ticket details (JSON)
    const payload = {
      summary: document.getElementById('detailSummary').value,
      project: document.getElementById('detailProject').value,
      work_type: document.getElementById('detailType').value,
      status: document.getElementById('detailStatus').value,
      description: document.getElementById('detailDescription').value,
      assignee: document.getElementById('detailAssignee').value,
      team: document.getElementById('detailTeam').value,
      game_name: document.getElementById('detailGame').value,
    };

    const updateResp = await fetch(`/update_ticket/${ticketId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const updateResult = await safeJson(updateResp);
    if (!updateResp.ok) {
      alert('Error updating ticket: ' + (updateResult?.error || updateResp.statusText));
      return;
    }

    // 2) Upload new attachments (if any)
    if (fileInput.files.length > 0) {
      const formData = new FormData();
      for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('attachments', fileInput.files[i]);
      }

      const attachResp = await fetch(`/upload_attachment/${ticketId}`, {
        method: 'POST',
        body: formData,
      });

      if (!attachResp.ok) {
        const attachResult = await safeJson(attachResp);
        alert('Attachment upload failed: ' + (attachResult?.message || attachResp.statusText));
        return;
      }
    }

    // 3) Final UI refresh
    loadTickets();
    document.getElementById('ticketDetailModal').classList.add('hidden');
    fileInput.value = ''; // clear the input
  } catch (err) {
    alert('Network error: ' + err.message);
  }
});
