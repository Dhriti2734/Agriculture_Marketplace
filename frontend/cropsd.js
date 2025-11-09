// cropsd.js - simple crops management (client-side)
document.addEventListener('DOMContentLoaded', () => {
  const cropsTableBody = document.querySelector('#cropsTable tbody');
  const cropSearch = document.getElementById('cropSearch');
  const btnAddCrop = document.getElementById('btnAddCrop');
  const btnExportCrops = document.getElementById('btnExportCrops');
  const selectAllCrops = document.getElementById('selectAllCrops');
  const btnBulkDeleteCrops = document.getElementById('btnBulkDeleteCrops');

  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalForm = document.getElementById('modalForm');
  const closeModalBtn = document.getElementById('closeModal');

  let crops = [
    { id: 1, name: 'Wheat', category: 'Grains', unit: 'kg', price: 0.25 },
    { id: 2, name: 'Rice', category: 'Grains', unit: 'kg', price: 0.30 },
    { id: 3, name: 'Olive Oil', category: 'Oils', unit: 'liter', price: 3.50 }
  ];

  let editingId = null;

  function renderCrops() {
    const q = (cropSearch.value || '').trim().toLowerCase();
    cropsTableBody.innerHTML = '';
    if (crops.length === 0) {
      cropsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:18px;">No crops available.</td></tr>';
      return;
    }
    crops.forEach(c => {
      if (q) {
        const hay = `${c.name} ${c.category} ${c.unit} ${c.price}`.toLowerCase();
        if (!hay.includes(q)) return;
      }
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="crop-cb" data-id="${c.id}"></td>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.category)}</td>
        <td>${escapeHtml(c.unit)}</td>
        <td>$${Number(c.price).toFixed(2)}</td>
        <td class="actions">
          <button class="edit" data-id="${c.id}">Edit</button>
          <button class="delete" data-id="${c.id}">Delete</button>
        </td>
      `;
      cropsTableBody.appendChild(tr);
    });
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }

  // open modal for create
  btnAddCrop.addEventListener('click', () => {
    editingId = null;
    modalForm.c_name.value = '';
    modalForm.c_category.value = '';
    modalForm.c_unit.value = '';
    modalForm.c_price.value = '';
    modalBackdrop.style.display = 'flex';
    modalForm.c_name.focus();
  });

  // close modal
  closeModalBtn.addEventListener('click', () => modalBackdrop.style.display = 'none');
  modalBackdrop.addEventListener('click', (e)=> { if (e.target === modalBackdrop) modalBackdrop.style.display = 'none'; });
  document.addEventListener('keydown', (e)=> { if (e.key === 'Escape' && modalBackdrop.style.display !== 'none') modalBackdrop.style.display = 'none'; });

  // save crop
  modalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = modalForm.c_name.value.trim();
    const category = modalForm.c_category.value.trim();
    const unit = modalForm.c_unit.value.trim();
    const price = parseFloat(modalForm.c_price.value) || 0;
    if (!name) return alert('Crop name required');
    if (editingId === null) {
      const id = crops.length ? Math.max(...crops.map(x => x.id)) + 1 : 1;
      crops.push({ id, name, category, unit, price });
    } else {
      const item = crops.find(c => c.id === editingId);
      if (!item) return;
      item.name = name; item.category = category; item.unit = unit; item.price = price;
    }
    modalBackdrop.style.display = 'none';
    renderCrops();
  });

  // table actions
  cropsTableBody.addEventListener('click', (e) => {
    const editBtn = e.target.closest('button.edit');
    const delBtn = e.target.closest('button.delete');
    if (editBtn) {
      const id = Number(editBtn.dataset.id);
      const c = crops.find(x => x.id === id);
      if (!c) return alert('Crop not found');
      editingId = id;
      modalForm.c_name.value = c.name;
      modalForm.c_category.value = c.category;
      modalForm.c_unit.value = c.unit;
      modalForm.c_price.value = c.price;
      modalBackdrop.style.display = 'flex';
      modalForm.c_name.focus();
    } else if (delBtn) {
      const id = Number(delBtn.dataset.id);
      if (!confirm('Delete crop?')) return;
      crops = crops.filter(x => x.id !== id);
      renderCrops();
    }
  });

  // select all
  selectAllCrops.addEventListener('change', (e) => {
    document.querySelectorAll('.crop-cb').forEach(cb => cb.checked = e.target.checked);
  });

  // bulk delete
  btnBulkDeleteCrops.addEventListener('click', () => {
    const checked = Array.from(document.querySelectorAll('.crop-cb:checked')).map(cb => Number(cb.dataset.id));
    if (checked.length === 0) return alert('No crops selected');
    if (!confirm(`Delete ${checked.length} crops?`)) return;
    crops = crops.filter(c => !checked.includes(c.id));
    renderCrops();
  });

  // export CSV
  btnExportCrops.addEventListener('click', () => {
    if (!crops.length) return alert('No crops to export');
    const headers = ['id','name','category','unit','price'];
    const rows = crops.map(c => [c.id, c.name, c.category, c.unit, c.price]);
    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'crops.csv'; document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); a.remove();
  });

  cropSearch.addEventListener('input', renderCrops);

  // initial render
  renderCrops();
});
