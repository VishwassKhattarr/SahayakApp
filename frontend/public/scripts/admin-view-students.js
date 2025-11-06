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
    // ✅ This part is correct: Get the TEXT of the selected option (e.g., "10")
    const className = classFilter.value ? classFilter.options[classFilter.selectedIndex].text : '';
    console.log("📌 Class selected:", classId, "Name:", className);

    sectionFilter.innerHTML = '<option value="">All Sections</option>';
    sectionFilter.disabled = true;

    if (classId) {
      try {
        // ✅ This part is correct: Filter sections by class_name
        const url = `/api/admin/sections?class_name=${encodeURIComponent(className)}`;
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
  // ✅ FIX #1: The function signature is updated to expect 'section_id'
  async function loadStudents(className = '', section_id = '') {
    try {
      let url = `/api/admin/students`;

      // ✅ Build dynamic URL based on selected filters
      if (className || section_id) {
        const params = new URLSearchParams();
        
        // The backend controller (studentController.js) looks for 'class_name'
        if (className) params.append('class_name', className); 
        
        // ✅ FIX #2: The backend controller looks for 'section_id', not 'section_name'
        if (section_id) params.append('section_id', section_id); 
        
        url += `?${params.toString()}`;
      }
      
      console.log("🚀 Calling loadStudents with URL:", url);

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
      // Send request to backend to email the report to parent (uses Resend on server)
      const response = await fetch(`/api/reports/send/${studentId}`, { method: 'POST' });

      const contentType = response.headers.get('content-type') || '';

      // If server returned PDF (Resend not configured fallback), download it directly
      if (contentType.includes('application/pdf')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const cd = response.headers.get('content-disposition') || '';
        let filename = `Report_${studentId}.pdf`;
        const match = cd.match(/filename=\"?([^\";]+)\"?/);
        if (match && match[1]) filename = match[1];
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        alert('✅ Report downloaded (server returned PDF).');
        return;
      }

      // Otherwise expect JSON (Resend was used)
      const data = await response.json();
      if (!response.ok) {
        console.error('Error sending report:', data);
        alert('❌ Failed to send report email.');
        return;
      }
      alert(`✅ Report emailed to parent (${data.message || 'sent'})`);

      // Also trigger download of the same PDF for local copy using the existing generate endpoint
      try {
        const genRes = await fetch(`/api/reports/generate/${studentId}`);
        if (genRes.ok) {
          const blob = await genRes.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          // Try to get filename from content-disposition header
          const cd = genRes.headers.get('content-disposition') || '';
          let filename = `Report_${studentId}.pdf`;
          const match = cd.match(/filename=\"?([^\";]+)\"?/);
          if (match && match[1]) filename = match[1];

          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } else {
          console.warn('Could not download report, server returned', genRes.status);
        }
      } catch (err) {
        console.error('Error downloading report after send:', err);
      }
    } catch (err) {
      console.error('Error sending report:', err);
      alert('⚠️ Error sending report email');
    }
  }

  // Initial load
  loadStudents();

  // Filter button click
  filterBtn.addEventListener('click', () => {
    // ✅ FIX #3: Get the Class NAME (text) for the 'className' parameter
    const className = classFilter.value ? classFilter.options[classFilter.selectedIndex].text : '';
    // ✅ FIX #4: Get the Section ID (value) for the 'section_id' parameter
    const sectionId = sectionFilter.value;
    
    // Pass the correct values to loadStudents
    loadStudents(className, sectionId);
  });

});