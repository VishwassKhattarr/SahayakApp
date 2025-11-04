document.addEventListener('DOMContentLoaded', () => {
  const uploadBtn = document.getElementById('upload-student-csv-btn');
  const fileInput = document.getElementById('student-csv');
  const statusP = document.getElementById('csv-upload-status');
  const summaryDiv = document.getElementById('csv-upload-summary');

  uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) {
      statusP.textContent = 'Please select a CSV file.';
      return;
    }

    statusP.textContent = 'Uploading...';
    summaryDiv.classList.add('hidden');

    const formData = new FormData();
    formData.append('csvFile', file);

    try {
      const res = await fetch('/api/students/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!data.success) {
        statusP.textContent = '❌ ' + (data.message || data.error);
        return;
      }

      statusP.textContent = '✅ Upload processed successfully!';
      const s = data.summary || data;

      summaryDiv.classList.remove('hidden');
      summaryDiv.innerHTML = `
        <strong>Inserted:</strong> ${s.inserted ?? 0}<br>
        <strong>Updated:</strong> ${s.updated ?? 0}<br>
        <strong>Invalid Rows:</strong> ${s.invalid?.length ?? 0}<br>
        <strong>Errors:</strong> ${s.errors?.length ?? 0}
      `;
    } catch (err) {
      statusP.textContent = '❌ Upload failed: ' + err.message;
    }
  });
});
