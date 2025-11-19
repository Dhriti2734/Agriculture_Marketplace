// gradingd.js - client-side grading reports management
document.addEventListener('DOMContentLoaded', () => {
  const gradingTableBody = document.querySelector('#gradingTable tbody');
  const gradeSearch = document.getElementById('gradeSearch');
  const gradeSelectAll = document.getElementById('gradeSelectAll');
  const gradingImport = document.getElementById('gradingImport');
  const btnBulkGrade = document.getElementById('btnBulkGrade');
  const btnExportGrades = document.getElementById('btnExportGrades');
  const btnDeleteSelectedGrades = document.getElementById('btnDeleteSelectedGrades');

  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalForm = document.getElementById('modalForm');
  const closeModalBtn = document.getElementById('closeModal');

  // sample data (replace with server fetch)
  let reports = [
    { batch: '#B-101', farmer: 'Ravi Kumar', crop: 'Wheat', grade: 'A', date: '2025-10-12' },
    { batch: '#B-102', farmer: 'Priya Sharma', crop: 'Rice', grade: 'B', date: '2025-10-13' },
    { batch: '#B-103', farmer: 'Manoj Singh', crop: 'Barley', grade: 'A', date: '2025-10-13' },
    { batch: '#B-104', farmer: 'Sita Devi', crop: 'Corn', grade: 'C', date: '2025-09-30' }
  ];

  let editingBatch = null;

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }

  function renderReports() {
    const q = (gradeSearch.value || '').trim().toLowerCase();
    gradingTableBody.innerHTML = '';
    if (reports.length === 0) {
      gradingTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:18px;">No reports yet.</td></tr>';
      return;
    }
    reports.forEach(r => {
      if (q) {
        const hay = `${r.batch} ${r.farmer} ${r.crop} ${r.grade} ${r.date}`.toLowerCase();
        if (!hay.includes(q)) return;
      }
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input class="grade-cb" data-batch="${r.batch}" type="checkbox"></td>
        <td>${escapeHtml(r.batch)}</td>
        <td>${escapeHtml(r.farmer)}</td>
        <td>${escapeHtml(r.crop)}</td>
        <td>${escapeHtml(r.grade)}</td>
        <td>${escapeHtml(r.date)}</td>
        <td class="actions">
          <button class="edit-report" data-batch="${r.batch}">Edit</button>
          <button class="delete-report" data-batch="${r.batch}">Delete</button>
        </td>
      `;
      gradingTableBody.appendChild(tr);
    });
  }

  // Open edit modal
  gradingTableBody.addEventListener('click', (e) => {
    const editBtn = e.target.closest('button.edit-report');
    const delBtn = e.target.closest('button.delete-report');
    if (editBtn) {
      const batch = editBtn.dataset.batch;
      const rep = reports.find(x => x.batch === batch);
      if (!rep) return alert('Report not found');
      editingBatch = batch;
      modalForm.g_batch.value = rep.batch;
      modalForm.g_farmer.value = rep.farmer;
      modalForm.g_crop.value = rep.crop;
      modalForm.g_grade.value = rep.grade;
      modalForm.g_date.value = rep.date;
      modalBackdrop.style.display = 'flex';
      modalForm.g_farmer.focus();
    } else if (delBtn) {
      const batch = delBtn.dataset.batch;
      if (!confirm(`Delete ${batch}?`)) return;
      reports = reports.filter(r => r.batch !== batch);
      renderReports();
    }
  });

  // modal handlers
  closeModalBtn.addEventListener('click', () => modalBackdrop.style.display = 'none');
  modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) modalBackdrop.style.display = 'none'; });
  document.addEventListener('keydown', (e)=> { if (e.key === 'Escape' && modalBackdrop.style.display !== 'none') modalBackdrop.style.display = 'none'; });

  modalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const batch = modalForm.g_batch.value;
    const idx = reports.findIndex(r => r.batch === batch);
    if (idx === -1) return alert('Report not found');
    reports[idx].farmer = modalForm.g_farmer.value.trim();
    reports[idx].crop = modalForm.g_crop.value.trim();
    reports[idx].grade = modalForm.g_grade.value;
    reports[idx].date = modalForm.g_date.value;
    modalBackdrop.style.display = 'none';
    renderReports();
  });

  // select all
  gradeSelectAll.addEventListener('change', (e) => {
    document.querySelectorAll('.grade-cb').forEach(cb => cb.checked = e.target.checked);
  });

  // delete selected
  btnDeleteSelectedGrades.addEventListener('click', () => {
    const selected = Array.from(document.querySelectorAll('.grade-cb:checked')).map(cb => cb.dataset.batch);
    if (selected.length === 0) return alert('No reports selected');
    if (!confirm(`Delete ${selected.length} reports?`)) return;
    reports = reports.filter(r => !selected.includes(r.batch));
    renderReports();
  });

  // bulk assign grade
  btnBulkGrade.addEventListener('click', () => {
    const selected = Array.from(document.querySelectorAll('.grade-cb:checked')).map(cb => cb.dataset.batch);
    if (selected.length === 0) return alert('Select reports first');
    const grade = prompt('Enter grade to assign to selected (A / B / C):', 'B');
    if (!grade) return;
    const g = grade.toUpperCase();
    if (!['A','B','C'].includes(g)) return alert('Invalid grade');
    reports.forEach(r => { if (selected.includes(r.batch)) r.grade = g; });
    renderReports();
  });

  // import CSV (batch,farmer,crop,grade,date) basic parse
  gradingImport.addEventListener('change', (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(Boolean);
      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(s => s.trim());
        if (!cols[0]) continue;
        parsed.push({ batch: cols[0], farmer: cols[1]||'', crop: cols[2]||'', grade: (cols[3]||'').toUpperCase(), date: cols[4]||'' });
      }
      if (parsed.length) {
        reports = reports.concat(parsed);
        alert(`Imported ${parsed.length} reports (client-side).`);
        renderReports();
      } else alert('No valid rows found.');
    };
    reader.readAsText(f);
    gradingImport.value = '';
  });

  // export CSV
  btnExportGrades.addEventListener('click', () => {
    if (!reports.length) return alert('No reports to export');
    const headers = ['batch','farmer','crop','grade','date'];
    const rows = reports.map(r => [r.batch, r.farmer, r.crop, r.grade, r.date]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'grading_reports.csv'; document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); a.remove();
  });

  // search
  gradeSearch.addEventListener('input', renderReports);

  // initial render
  renderReports();
});
