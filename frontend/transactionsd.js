// transactionsd.js - simple transactions management (client-side)
document.addEventListener('DOMContentLoaded', () => {
  const txTableBody = document.querySelector('#txTable tbody');
  const txSearch = document.getElementById('txSearch');
  const txStatusFilter = document.getElementById('txStatusFilter');
  const btnExportTx = document.getElementById('btnExportTx');
  const btnMarkComplete = document.getElementById('btnMarkComplete');
  const btnDeleteTx = document.getElementById('btnDeleteTx');

  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalForm = document.getElementById('modalForm');
  const closeModalBtn = document.getElementById('closeModal');

  // sample transactions
  let transactions = [
    { id: 'T-201', buyer: 'Company A', seller: 'Farmer X', amount: 2500, status: 'completed', date: '2025-10-11' },
    { id: 'T-202', buyer: 'Company B', seller: 'Farmer Y', amount: 3000, status: 'pending', date: '2025-10-12' },
    { id: 'T-203', buyer: 'Company C', seller: 'Farmer Z', amount: 1500, status: 'failed', date: '2025-10-13' }
  ];

  let editingId = null;

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }

  function renderTransactions() {
    const q = (txSearch.value || '').trim().toLowerCase();
    const st = txStatusFilter.value;
    txTableBody.innerHTML = '';
    if (!transactions.length) {
      txTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:18px;">No transactions.</td></tr>';
      return;
    }
    transactions.forEach(t => {
      if (st && t.status !== st) return;
      if (q && !`${t.id} ${t.buyer} ${t.seller} ${t.status}`.toLowerCase().includes(q)) return;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="tx-cb" data-id="${t.id}"></td>
        <td>${escapeHtml(t.id)}</td>
        <td>${escapeHtml(t.buyer)}</td>
        <td>${escapeHtml(t.seller)}</td>
        <td>$${Number(t.amount).toLocaleString()}</td>
        <td class="small">${escapeHtml(t.status)}</td>
        <td>${escapeHtml(t.date)}</td>
        <td class="actions">
          <button class="view-tx" data-id="${t.id}">View</button>
          <button class="delete-tx" data-id="${t.id}">Delete</button>
        </td>
      `;
      txTableBody.appendChild(tr);
    });
  }

  // open modal to view/edit
  txTableBody.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('button.view-tx');
    const delBtn = e.target.closest('button.delete-tx');
    if (viewBtn) {
      const id = viewBtn.dataset.id;
      const tx = transactions.find(t => t.id === id);
      if (!tx) return alert('Transaction not found');
      editingId = id;
      modalForm.t_id.value = tx.id;
      modalForm.t_buyer.value = tx.buyer;
      modalForm.t_seller.value = tx.seller;
      modalForm.t_amount.value = tx.amount;
      modalForm.t_status.value = tx.status;
      modalForm.t_date.value = tx.date;
      modalBackdrop.style.display = 'flex';
      modalForm.t_buyer.focus();
    } else if (delBtn) {
      const id = delBtn.dataset.id;
      if (!confirm(`Delete transaction ${id}?`)) return;
      transactions = transactions.filter(t => t.id !== id);
      renderTransactions();
    }
  });

  // modal handlers
  closeModalBtn.addEventListener('click', () => modalBackdrop.style.display = 'none');
  modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) modalBackdrop.style.display = 'none'; });
  document.addEventListener('keydown', (e)=> { if (e.key === 'Escape' && modalBackdrop.style.display !== 'none') modalBackdrop.style.display = 'none'; });

  modalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = modalForm.t_id.value;
    const idx = transactions.findIndex(t => t.id === id);
    if (idx === -1) return alert('Transaction not found');
    transactions[idx].buyer = modalForm.t_buyer.value.trim();
    transactions[idx].seller = modalForm.t_seller.value.trim();
    transactions[idx].amount = Number(modalForm.t_amount.value) || 0;
    transactions[idx].status = modalForm.t_status.value;
    transactions[idx].date = modalForm.t_date.value;
    modalBackdrop.style.display = 'none';
    renderTransactions();
  });

  // bulk actions
  btnMarkComplete.addEventListener('click', () => {
    const checked = Array.from(document.querySelectorAll('.tx-cb:checked')).map(cb => cb.dataset.id);
    if (!checked.length) return alert('No transactions selected');
    transactions.forEach(t => { if (checked.includes(t.id)) t.status = 'completed'; });
    renderTransactions();
  });

  btnDeleteTx.addEventListener('click', () => {
    const checked = Array.from(document.querySelectorAll('.tx-cb:checked')).map(cb => cb.dataset.id);
    if (!checked.length) return alert('No transactions selected');
    if (!confirm(`Delete ${checked.length} transactions?`)) return;
    transactions = transactions.filter(t => !checked.includes(t.id));
    renderTransactions();
  });

  // export CSV
  btnExportTx.addEventListener('click', () => {
    if (!transactions.length) return alert('No transactions to export');
    const headers = ['id','buyer','seller','amount','status','date'];
    const rows = transactions.map(t => [t.id,t.buyer,t.seller,t.amount,t.status,t.date]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'transactions.csv'; document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); a.remove();
  });

  // filters
  [txSearch, txStatusFilter].forEach(el => el.addEventListener('input', renderTransactions));

  // initial render
  renderTransactions();
});
