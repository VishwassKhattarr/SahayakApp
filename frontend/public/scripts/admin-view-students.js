console.log("✅ admin-view-students.js LOADED");


document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ DOM fully loaded and parsed");
});
document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.querySelector('#students-table tbody');
  const classFilter = document.getElementById('class-filter');
  const sectionFilter = document.getElementById('section-filter');
  const filterBtn = document.getElementById('filter-btn');

  // Load all classes for dropdown
  try {
    const classRes = await fetch('/api/admin/classes');
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

  // Load sections based on class
 classFilter.addEventListener('change', async () => {
  const classId = classFilter.value;
  console.log("📌 Class selected:", classId);

  sectionFilter.innerHTML = '<option value="">All Sections</option>';
  sectionFilter.disabled = true;

  if (classId) {
    try {
      const url = `/api/admin/sections?class_id=${classId}`;
      console.log("🌐 Fetching sections from:", url);

      const res = await fetch(url);
      console.log("🔍 API status:", res.status);

      const data = await res.json();
      console.log("📦 API response:", data);

      if (data.success && data.sections.length > 0) {
        data.sections.forEach((sec) => {
          const opt = document.createElement('option');
          opt.value = sec.id;
          opt.textContent = sec.section_name;
          sectionFilter.appendChild(opt);
        });

        console.log(`✅ ${data.sections.length} sections loaded`);
        sectionFilter.disabled = false;
      } else {
        console.warn("⚠️ API returned no sections");
      }

    } catch (err) {
      console.error('❌ Error fetching sections:', err);
    }
  }
});


  // Fetch and render students
 // Fetch and render students
// Fetch and render students
async function loadStudents(className = '', sectionName = '') {
  try {
    let url = `/api/admin/students`;

    // ✅ Build dynamic URL based on selected filters
    if (className || sectionName) {
      const params = new URLSearchParams();
      if (className) params.append('class_name', className);
      if (sectionName) params.append('section_name', sectionName);
      url += `?${params.toString()}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    tableBody.innerHTML = '';

    if (!data.success || data.students.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">No students found.</td></tr>`;
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
        <td>${st.parent_email || '-'}</td>
        <td>
          <button class="btn btn-report" data-id="${st.id}">📄 Report</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    document.querySelectorAll('.btn-report').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const studentId = e.target.getAttribute('data-id');
        await generateReport(studentId);
      });
    });
  } catch (err) {
    console.error('Error loading students:', err);
    tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Error fetching students.</td></tr>`;
  }
}



  // Generate a single student's report PDF
  async function generateReport(studentId) {
    try {
      const response = await fetch(`/api/reports/generate/${studentId}`, { method: 'GET' });
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

  // Initial load
  loadStudents();

  // Filter button click
  filterBtn.addEventListener('click', () => {
  const className = classFilter.value;
  const sectionName = sectionFilter.value;
  loadStudents(className, sectionName);
});

});
