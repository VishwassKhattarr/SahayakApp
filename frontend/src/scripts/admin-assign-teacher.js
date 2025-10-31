document.addEventListener("DOMContentLoaded", async () => {
  const teacherSelect = document.getElementById("teacher");
  const classSelect = document.getElementById("class");
  const sectionSelect = document.getElementById("section");
  const subjectSelect = document.getElementById("subject");
  const yearSelect = document.getElementById("year");
  const form = document.getElementById("assign-form");
  const statusMsg = document.getElementById("status-message");

  const fetchAndFill = async (url, selectEl) => {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!data.success) throw new Error("Failed to fetch");

      const listKey = Object.keys(data).find((k) => Array.isArray(data[k]));
      const list = data[listKey] || [];

      list.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.id;
        opt.textContent =
          item.name ||
          item.class_name ||
          item.section_name ||
          item.subject_name ||
          item.year_name ||
          `#${item.id}`;
        selectEl.appendChild(opt);
      });
    } catch (err) {
      console.error(`Error loading ${url}:`, err);
      selectEl.innerHTML += `<option disabled>Error loading</option>`;
    }
  };

  // ✅ populate dropdowns
  await fetchAndFill("/api/teachers", teacherSelect);
  await fetchAndFill("/api/classes", classSelect);
  await fetchAndFill("/api/sections", sectionSelect);
  await fetchAndFill("/api/subjects", subjectSelect);
  await fetchAndFill("/api/academic_years", yearSelect);

  // ✅ handle form submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusMsg.textContent = "Assigning...";

    const payload = {
      teacher_id: teacherSelect.value,
      class_id: classSelect.value,
      section_id: sectionSelect.value,
      subject_id: subjectSelect.value,
      academic_year_id: yearSelect.value,
    };

    if (Object.values(payload).some((v) => !v)) {
      statusMsg.textContent = "⚠️ Please select all fields.";
      return;
    }

    try {
      const res = await fetch("/api/teachers/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        statusMsg.textContent = "✅ " + data.message;
        form.reset();
      } else {
        statusMsg.textContent = "⚠️ " + (data.message || "Assignment failed.");
      }
    } catch (err) {
      statusMsg.textContent = "❌ Server error: " + err.message;
    }
  });
});
