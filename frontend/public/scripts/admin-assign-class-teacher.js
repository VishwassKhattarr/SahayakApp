document.addEventListener("DOMContentLoaded", async () => {
  const teacherSelect = document.getElementById("teacher");
  const classSelect = document.getElementById("class");
  const sectionSelect = document.getElementById("section");
  const yearSelect = document.getElementById("year");
  const form = document.getElementById("assign-form");
  const statusMsg = document.getElementById("status-message");

  // Helper function to fetch data and fill a dropdown
  const fetchAndFill = async (url, selectEl, fieldName) => {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!data.success) throw new Error(`Failed to fetch ${fieldName}`);

      const listKey = Object.keys(data).find((k) => Array.isArray(data[k]));
      const list = data[listKey] || [];

      // Clear existing options (except the first one)
      while (selectEl.options.length > 1) {
          selectEl.remove(1);
      }

      list.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.id;
        opt.textContent = item.name || item.class_name || item.section_name || item.year_name;
        selectEl.appendChild(opt);
      });
    } catch (err) {
      console.error(`Error loading ${fieldName}:`, err);
      selectEl.innerHTML = `<option disabled>Error loading data</option>`;
    }
  };

  // 1. Populate static dropdowns on page load
  fetchAndFill("/api/admin/teachers", teacherSelect, "Teachers");
  fetchAndFill("/api/admin/classes", classSelect, "Classes");
  fetchAndFill("/api/admin/academic_years", yearSelect, "Years");

  // 2. Add listener to filter sections when class changes
  classSelect.addEventListener('change', async () => {
    const className = classSelect.value ? classSelect.options[classSelect.selectedIndex].text : '';
    
    sectionSelect.innerHTML = '<option value="">-- Select Section --</option>';
    if (className) {
        sectionSelect.disabled = false;
        // Fetch sections filtered by class name
        await fetchAndFill(`/api/admin/sections?class_name=${encodeURIComponent(className)}`, sectionSelect, "Sections");
    } else {
        sectionSelect.disabled = true;
        sectionSelect.innerHTML = '<option value="">-- Select Class First --</option>';
    }
  });

  // 3. Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusMsg.textContent = "Assigning...";
    statusMsg.style.color = 'orange';

    const payload = {
      teacher_id: teacherSelect.value,
      section_id: sectionSelect.value,
      academic_year_id: yearSelect.value,
    };

    if (!payload.teacher_id || !payload.section_id || !payload.academic_year_id) {
      statusMsg.textContent = "⚠️ Please select all fields.";
      statusMsg.style.color = 'red';
      return;
    }

    try {
      const res = await fetch("/api/admin/assign-class-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        statusMsg.textContent = "✅ " + data.message;
        statusMsg.style.color = 'green';
        form.reset();
        // Reset sections dropdown
        sectionSelect.disabled = true;
        sectionSelect.innerHTML = '<option value="">-- Select Class First --</option>';
      } else {
        statusMsg.textContent = "⚠️ " + (data.message || "Assignment failed.");
        statusMsg.style.color = 'red';
      }
    } catch (err) {
      statusMsg.textContent = "❌ Error: Server error: " + err.message;
      statusMsg.style.color = 'red';
    }
  });
});