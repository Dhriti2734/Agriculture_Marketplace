// users.js - client-side users management (add/edit/delete/search/export)
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const usersTableBody = document.querySelector('#usersTable tbody');
  const userSearch = document.getElementById('userSearch');
  const btnAddUser = document.getElementById('btnAddUser');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const closeModal = document.getElementById('closeModal');
  const modalForm = document.getElementById('modalForm');
  const modalTitle = document.getElementById('modalTitle');
  const selectAll = document.getElementById('selectAll');
  const btnBulkDelete = document.getElementById('btnBulkDelete');
  const btnExportUsers = document.getElementById('btnExportUsers');

  // Sample users (replace with server data)
  let users = [
    { id: 1, name: 'Ravi Kumar', email: 'ravi@example.com', role: 'Seller', status: 'active' },
    { id: 2, name: 'Priya Sharma', email: 'priya@example.com', role: 'Buyer', status: 'active' },
    { id: 3, name: 'Amit Patel', email: 'amit@example.com', role: 'Admin', status: 'inactive' }
  ];

  let editingId = null; // null => create, otherwise edit

  // --- Render users table
  function renderUsers() {
    const q = (userSearch.value || '').trim().toLowerCase();
    usersTableBody.innerHTML = '';
    if (users.length === 0) {
      usersTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:18px;">No users yet.</td></tr>';
      return;
    }
    users.forEach(user => {
      if (q) {
        const hay = `${user.name} ${user.email} ${user.role} ${user.status}`.toLowerCase();
        if (!hay.includes(q)) return;
      }
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="row-cb" data-id="${user.id}"></td>
        <td>${escapeHtml(user.name)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(user.role)}</td>
        <td>${escapeHtml(user.status)}</td>
        <td class="actions">
          <button class="edit" data-id="${user.id}">Edit</button>
          <button class="delete" data-id="${user.id}">Delete</button>
        </td>
      `;
      usersTableBody.appendChild(tr);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }

  // --- Modal open for create/edit
  function openModalCreate() {
    editingId = null;
    modalTitle.textContent = 'Add User';
    modalForm.u_name.value = '';
    modalForm.u_email.value = '';
    modalForm.u_role.value = 'Buyer';
    modalForm.u_status.value = 'active';
    modalBackdrop.style.display = 'flex';
    modalForm.u_name.focus();
  }

  function openModalEdit(id) {
    const user = users.find(u => u.id === id);
    if (!user) return alert('User not found');
    editingId = id;
    modalTitle.textContent = 'Edit User';
    modalForm.u_name.value = user.name;
    modalForm.u_email.value = user.email;
    modalForm.u_role.value = user.role;
    modalForm.u_status.value = user.status;
    modalBackdrop.style.display = 'flex';
    modalForm.u_name.focus();
  }

  // --- Close modal
  function doCloseModal() {
    modalBackdrop.style.display = 'none';
    editingId = null;
  }

  closeModal.addEventListener('click', doCloseModal);
  modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) doCloseModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalBackdrop.style.display !== 'none') doCloseModal(); });

  // --- Save user (create or update)
  modalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = modalForm.u_name.value.trim();
    const email = modalForm.u_email.value.trim();
    const role = modalForm.u_role.value;
    const status = modalForm.u_status.value;
    if (!name || !email) return alert('Name and email required');

    if (editingId === null) {
      const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
      users.push({ id, name, email, role, status });
    } else {
      const user = users.find(u => u.id === editingId);
      if (!user) return alert('User not found');
      user.name = name; user.email = email; user.role = role; user.status = status;
    }
    doCloseModal();
    renderUsers();
  });

  // --- Table actions (edit/delete)
  usersTableBody.addEventListener('click', (e) => {
    const editBtn = e.target.closest('button.edit');
    const delBtn = e.target.closest('button.delete');
    if (editBtn) {
      const id = Number(editBtn.dataset.id);
      openModalEdit(id);
    } else if (delBtn) {
      const id = Number(delBtn.dataset.id);
      if (confirm('Delete user?')) {
        users = users.filter(u => u.id !== id);
        renderUsers();
      }
    }
  });

  // Add user button
  btnAddUser.addEventListener('click', openModalCreate);

  // select all checkbox
  selectAll.addEventListener('change', (e) => {
    document.querySelectorAll('.row-cb').forEach(cb => cb.checked = e.target.checked);
  });

  // bulk delete
  btnBulkDelete.addEventListener('click', () => {
    const checked = Array.from(document.querySelectorAll('.row-cb:checked')).map(cb => Number(cb.dataset.id));
    if (checked.length === 0) return alert('No users selected');
    if (!confirm(`Delete ${checked.length} users?`)) return;
    users = users.filter(u => !checked.includes(u.id));
    renderUsers();
  });

  // search
  userSearch.addEventListener('input', renderUsers);

  // export CSV
  btnExportUsers.addEventListener('click', () => {
    if (!users.length) return alert('No users to export');
    const headers = ['id','name','email','role','status'];
    const rows = users.map(u => [u.id,u.name,u.email,u.role,u.status]);
    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'users.csv'; document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); a.remove();
  });

  // initial render
  renderUsers();
});
