document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.querySelector('#students-table tbody');
  const classFilter = document.getElementById('class-filter');
  const filterBtn = document.getElementById('filter-btn');

  // Load all classes for dropdown
  try {
    const classRes = await fetch('/api/classes');
    const classData = await classRes.json();
    if (classData.success) {
      classData.classes.forEach((cls) => {
        const opt = document.createElement('option');
        opt.value = cls.id;
        opt.textContent = cls.class_name;
        classFilter.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Error fetching classes:', err);
  }

  // Function to fetch and render students
  async function loadStudents(classId = '') {
    try {
      const url = classId ? `/api/students?class_id=${classId}` : '/api/students';
      const res = await fetch(url);
      const data = await res.json();

      tableBody.innerHTML = '';

      if (!data.success || data.students.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No students found.</td></tr>`;
        return;
      }

      data.students.forEach((st) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${st.id}</td>
          <td>${st.name}</td>
          <td>${st.email}</td>
          <td>${st.roll_number}</td>
          <td>${st.class_name || '-'}</td>
          <td>${st.section_name || '-'}</td>
          <td>${st.parent_contact || '-'}</td>
          <td>
            <button class="btn btn-report" data-id="${st.id}">📄 Generate Report</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });

      // Add listeners for report buttons
      document.querySelectorAll('.btn-report').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const studentId = e.target.getAttribute('data-id');
          await generateReport(studentId);
        });
      });
    } catch (err) {
      console.error('Error loading students:', err);
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Error fetching students.</td></tr>`;
    }
  }

  // Generate a single student's PDF
  async function generateReport(studentId) {
    try {
      const response = await fetch(`/api/reports/generate/${studentId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        alert('❌ Failed to generate report.');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `Report_Student_${studentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      alert('✅ Report downloaded successfully!');
    } catch (err) {
      console.error('Error generating report:', err);
      alert('⚠️ Error generating report');
    }
  }

  // Load all students on page load
  loadStudents();

  // Filter button
  filterBtn.addEventListener('click', () => {
    const classId = classFilter.value;
    loadStudents(classId);
  });
});
