// ordersd.js — renders buyer orders and provides view/export/delete/status change

document.addEventListener('DOMContentLoaded', () => {
  const ORDERS_KEY = 'buyerOrders';
  const ordersTableBody = document.querySelector('#ordersTable tbody');
  const orderSearch = document.getElementById('orderSearch');
  const exportBtn = document.getElementById('exportOrders');

  const viewModal = document.getElementById('viewModal');
  const viewTitle = document.getElementById('viewTitle');
  const viewDate = document.getElementById('viewDate');
  const viewItems = document.getElementById('viewItems');
  const viewTotal = document.getElementById('viewTotal');
  const closeView = document.getElementById('closeView');
  const markDelivered = document.getElementById('markDelivered');

  function loadOrders(){ try{ return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; } catch(e){ return []; } }
  function saveOrders(arr){ localStorage.setItem(ORDERS_KEY, JSON.stringify(arr)); }

  function renderOrders() {
    const q = (orderSearch.value || '').trim().toLowerCase();
    const orders = loadOrders();
    ordersTableBody.innerHTML = '';
    if (!orders.length) {
      ordersTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:18px;">No orders yet.</td></tr>';
      return;
    }
    orders.forEach(o => {
      if (q) {
        const hay = `${o.id} ${o.status} ${o.created_at}`.toLowerCase();
        if (!hay.includes(q)) return;
      }
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${o.id}</td>
        <td class="small">${new Date(o.created_at).toLocaleString()}</td>
        <td class="small">${o.items.length} item(s)</td>
        <td>₹${Number(o.total).toFixed(2)}</td>
        <td class="small">${o.status}</td>
        <td class="actions">
          <button class="btn" data-id="${o.id}" data-action="view">View</button>
          <button class="btn" data-id="${o.id}" data-action="delete">Delete</button>
        </td>
      `;
      ordersTableBody.appendChild(tr);
    });
  }

  // View or delete handlers
  ordersTableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === 'view') openView(id);
    else if (action === 'delete') doDelete(id);
  });

  function openView(id) {
    const orders = loadOrders();
    const o = orders.find(x => x.id === id);
    if (!o) return alert('Order not found');
    viewTitle.textContent = `Order ${o.id}`;
    viewDate.textContent = `Placed: ${new Date(o.created_at).toLocaleString()}`;
    viewItems.innerHTML = o.items.map(it => `<div class="small">${it.name} × ${it.qty} — ₹${(it.price*it.qty).toFixed(2)}</div>`).join('');
    viewTotal.textContent = `₹${Number(o.total).toFixed(2)}`;
    markDelivered.dataset.id = id;
    viewModal.style.display = 'flex';
  }

  function doDelete(id) {
    if (!confirm(`Delete order ${id}?`)) return;
    let orders = loadOrders();
    orders = orders.filter(o => o.id !== id);
    saveOrders(orders);
    renderOrders();
  }

  closeView.addEventListener('click', () => viewModal.style.display = 'none');

  // Mark delivered
  markDelivered.addEventListener('click', () => {
    const id = markDelivered.dataset.id;
    const orders = loadOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return alert('Order not found');
    orders[idx].status = 'delivered';
    saveOrders(orders);
    renderOrders();
    viewModal.style.display = 'none';
    alert('Order marked delivered');
  });

  // Export CSV
  exportBtn.addEventListener('click', () => {
    const orders = loadOrders();
    if (!orders.length) return alert('No orders to export');
    const headers = ['id','created_at','items','total','status'];
    const rows = orders.map(o => [o.id,o.created_at,o.items.map(i=>`${i.name}×${i.qty}`).join(';'),o.total,o.status]);
    const csv = [headers, ...rows].map(r=> r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'orders.csv'; document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); a.remove();
  });

  // search
  orderSearch.addEventListener('input', renderOrders);

  // initial render
  renderOrders();
});
