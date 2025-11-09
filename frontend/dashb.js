/* dashboard.js
   - Renders sample rows
   - Search / filter / sort
   - Modal open/close/edit/save
   - Export CSV
   - Small canvas chart
*/

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const reportsTableBody = document.querySelector('#reportsTable tbody');
  const searchInput = document.getElementById('searchInput');
  const filterGrade = document.getElementById('filterGrade');
  const sortBy = document.getElementById('sortBy');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalForm = document.getElementById('modalForm');
  const closeModalBtn = document.getElementById('closeModal');
  const exportCsvBtn = document.getElementById('exportCsv');
  const refreshBtn = document.getElementById('refreshBtn');
  const toggleSidebarBtn = document.getElementById('toggleSidebar');

  const cardUsers = document.getElementById('cardUsers');
  const cardCrops = document.getElementById('cardCrops');
  const cardTxns = document.getElementById('cardTxns');
  const cardRevenue = document.getElementById('cardRevenue');

  // Sample data
  let reports = [
    { batch: '#B-103', farmer: 'Manoj Singh', crop: 'Barley', grade: 'A', date: '2025-10-13' },
    { batch: '#B-101', farmer: 'Ravi Kumar', crop: 'Wheat', grade: 'A', date: '2025-10-12' },
    { batch: '#B-102', farmer: 'Priya Sharma', crop: 'Rice', grade: 'B', date: '2025-10-13' },
    { batch: '#B-104', farmer: 'Sita Devi', crop: 'Corn', grade: 'C', date: '2025-09-30' },
    { batch: '#B-105', farmer: 'Amit Patel', crop: 'Wheat', grade: 'B', date: '2025-10-01' }
  ];

  const summary = { users: 124, crops: 58, txns: 32, revenue: 12430 };

  // Renderers
  function renderSummary(){
    cardUsers.textContent = summary.users;
    cardCrops.textContent = summary.crops;
    cardTxns.textContent = summary.txns;
    cardRevenue.textContent = `$${summary.revenue.toLocaleString()}`;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }

  function renderTable(){
    const q = (searchInput.value || '').trim().toLowerCase();
    const gradeFilter = filterGrade.value;
    const sortVal = sortBy.value;

    let filtered = reports.filter(r => {
      if (gradeFilter && r.grade !== gradeFilter) return false;
      if (!q) return true;
      return [r.batch, r.farmer, r.crop, r.grade, r.date].some(field => String(field).toLowerCase().includes(q));
    });

    if (sortVal === 'date_asc') filtered.sort((a,b) => new Date(a.date) - new Date(b.date));
    else if (sortVal === 'date_desc') filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
    else if (sortVal === 'farmer_asc') filtered.sort((a,b) => a.farmer.localeCompare(b.farmer));

    reportsTableBody.innerHTML = '';
    if (filtered.length === 0){
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="6" style="text-align:center; padding:18px;">No reports match your filters.</td>';
      reportsTableBody.appendChild(tr);
      return;
    }

    filtered.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(r.batch)}</td>
        <td>${escapeHtml(r.farmer)}</td>
        <td>${escapeHtml(r.crop)}</td>
        <td>${escapeHtml(r.grade)}</td>
        <td>${escapeHtml(r.date)}</td>
        <td class="actions">
          <button class="view" data-batch="${r.batch}">View</button>
          <button class="delete" data-batch="${r.batch}">Delete</button>
        </td>
      `;
      reportsTableBody.appendChild(tr);
    });
  }

  // Modal logic
  function openModalForBatch(batch){
    const r = reports.find(x => x.batch === batch);
    if (!r) return;
    document.getElementById('mBatch').value = r.batch;
    document.getElementById('mFarmer').value = r.farmer;
    document.getElementById('mCrop').value = r.crop;
    document.getElementById('mGrade').value = r.grade;
    document.getElementById('mDate').value = r.date;
    modalBackdrop.style.display = 'flex';
    document.getElementById('mFarmer').focus();
  }

  function closeModal(){
    modalBackdrop.style.display = 'none';
  }

  // Attach handlers
  reportsTableBody.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('button.view');
    const delBtn = e.target.closest('button.delete');
    if (viewBtn) openModalForBatch(viewBtn.dataset.batch);
    else if (delBtn){
      const batch = delBtn.dataset.batch;
      if (confirm(`Delete report ${batch}?`)){
        reports = reports.filter(r => r.batch !== batch);
        renderTable();
      }
    }
  });

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

  // Clicking outside modal closes it
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  // Escape closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop.style.display !== 'none') closeModal();
  });

  // Save (modal form)
  if (modalForm){
    modalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const batch = document.getElementById('mBatch').value;
      const idx = reports.findIndex(r => r.batch === batch);
      if (idx !== -1){
        reports[idx].farmer = document.getElementById('mFarmer').value.trim();
        reports[idx].crop = document.getElementById('mCrop').value.trim();
        reports[idx].grade = document.getElementById('mGrade').value;
        reports[idx].date = document.getElementById('mDate').value;
      }
      closeModal();
      renderTable();
    });
  }

  // Export CSV
  exportCsvBtn.addEventListener('click', () => {
    const headers = ['Batch','Farmer','Crop','Grade','Date'];
    const rows = reports.map(r => [r.batch, r.farmer, r.crop, r.grade, r.date]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'grading_reports.csv';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  });

  // Controls
  [searchInput, filterGrade, sortBy].forEach(el => el.addEventListener('input', renderTable));
  refreshBtn.addEventListener('click', () => { alert('Refreshed (sample data).'); renderTable(); });

  // Sidebar toggle
  toggleSidebarBtn.addEventListener('click', () => {
    const sb = document.getElementById('sidebar');
    sb.classList.toggle('collapsed');
    sb.style.width = sb.classList.contains('collapsed') ? '68px' : '260px';
  });

  // Small canvas chart
  function drawRevenueChart(){
    const canvas = document.getElementById('revenueChart');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const months = ['Apr','May','Jun','Jul','Aug','Sep','Oct'];
    const values = [800,1200,1800,1500,2300,2100,2400];
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const padding = 28; const w = canvas.width - padding*2; const h = canvas.height - padding*2;
    const max = Math.max(...values) * 1.1;
    const stepX = w / (values.length - 1);
    ctx.lineWidth = 2;

    // axis
    ctx.strokeStyle = '#e6e6e6'; ctx.beginPath();
    ctx.moveTo(padding, padding + h); ctx.lineTo(padding + w, padding + h); ctx.stroke();

    // line
    ctx.strokeStyle = '#4b8f35'; ctx.beginPath();
    values.forEach((v,i) => {
      const x = padding + i * stepX;
      const y = padding + h - (v / max) * h;
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();

    // fill
    ctx.lineTo(padding + w, padding + h); ctx.lineTo(padding, padding + h); ctx.closePath();
    ctx.fillStyle = 'rgba(75,143,53,0.08)'; ctx.fill();

    // labels
    ctx.fillStyle = '#666'; ctx.font = '12px Lato, sans-serif';
    months.forEach((m,i) => {
      const x = padding + i * stepX;
      ctx.fillText(m, x - 8, padding + h + 18);
    });
  }

  // Init
  function init(){
    renderSummary();
    renderTable();
    drawRevenueChart();
  }

  init();
});
