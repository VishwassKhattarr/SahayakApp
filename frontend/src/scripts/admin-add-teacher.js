document.addEventListener('DOMContentLoaded', () => {
  const uploadBtn = document.getElementById('upload-csv-btn');
  const fileInput = document.getElementById('teacher-csv');
  const statusP = document.getElementById('csv-upload-status');
  const summaryDiv = document.getElementById('csv-upload-summary');

  // ✅ Attach only if upload button exists (don’t exit early)
  if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
      const file = fileInput.files[0];
      if (!file) {
        statusP.textContent = 'Please select a CSV file first.';
        return;
      }

      statusP.textContent = 'Uploading...';
      summaryDiv.classList.add('hidden');

      const formData = new FormData();
      formData.append('csvFile', file);

      try {
        const response = await fetch('/api/teachers/upload', {
          method: 'POST',
          body: formData
        });
        const data = await response.json();

        if (!data.success) {
          statusP.textContent = 'Upload failed: ' + (data.message || data.error);
          return;
        }

        statusP.textContent = 'Upload processed successfully ✅';
        const s = data.summary || data;

        summaryDiv.classList.remove('hidden');
        summaryDiv.innerHTML = `
          <strong>Inserted:</strong> ${s.inserted ?? 0}<br>
          <strong>Updated:</strong> ${s.updated ?? 0}<br>
          <strong>Invalid rows:</strong> ${s.invalid?.length ?? 0}<br>
          <strong>Errors:</strong> ${s.errors?.length ?? 0}
        `;
      } catch (err) {
        statusP.textContent = 'Upload failed: ' + err.message;
      }
    });
  }

  // 🧑‍🏫 Add Teacher Form Submission
  const teacherForm = document.getElementById('teacher-form');
  if (teacherForm) {
    teacherForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('teacher-name').value.trim();
      const email = document.getElementById('teacher-email').value.trim();
      const password = document.getElementById('teacher-password').value.trim();

      if (!name || !email || !password) {
        alert('Please fill all fields.');
        return;
      }

      try {
        const res = await fetch('/api/teachers/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (!data.success) {
          alert('⚠️ ' + data.message);
          return;
        }

        alert('✅ ' + data.message);

        // Clear input fields after success
        teacherForm.reset();
      } catch (err) {
        alert('❌ Failed to add teacher: ' + err.message);
      }
    });
  }
});
