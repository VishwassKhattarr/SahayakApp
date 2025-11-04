// document.addEventListener('DOMContentLoaded', async () => {
//   const tableBody = document.querySelector('#teachers-table tbody');

//   try {
//     const res = await fetch('/api/teachers');
//     const data = await res.json();

//     if (!data.success) {
//       tableBody.innerHTML = `<tr><td colspan="5">Failed to fetch teachers.</td></tr>`;
//       return;
//     }

//     if (data.teachers.length === 0) {
//       tableBody.innerHTML = `<tr><td colspan="5">No teachers found.</td></tr>`;
//       return;
//     }

//     data.teachers.forEach((t) => {
//       const row = document.createElement('tr');
//       row.innerHTML = `
//         <td>${t.id}</td>
//         <td>${t.name}</td>
//         <td>${t.email}</td>
//         <td>${t.status}</td>
//         <td>${t.joined_on}</td>
//       `;
//       tableBody.appendChild(row);
//     });
//   } catch (err) {
//     console.error('Error:', err);
//     tableBody.innerHTML = `<tr><td colspan="5">Error loading data</td></tr>`;
//   }
// });


document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.querySelector('#teachers-table tbody');

  const loadTeachers = async () => {
    try {
      const res = await fetch('/api/teachers');
      const data = await res.json();

      tableBody.innerHTML = ''; // Clear old data

      if (!data.success || data.teachers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6">No teachers found.</td></tr>`;
        return;
      }

      data.teachers.forEach((t) => {
        const row = document.createElement('tr');
        const actionBtn = document.createElement('button');
        actionBtn.textContent = t.status === 'active' ? 'Deactivate' : 'Activate';
        actionBtn.className = t.status === 'active' ? 'btn danger' : 'btn success';

        actionBtn.addEventListener('click', async () => {
          if (!confirm(`Are you sure you want to ${actionBtn.textContent.toLowerCase()} ${t.name}?`)) return;

          try {
            const res = await fetch(`/api/teachers/${t.id}/status`, {
              method: 'PUT'
            });
            const result = await res.json();

            if (result.success) {
              alert(result.message);
              loadTeachers(); // Refresh table
            } else {
              alert('Failed: ' + result.message);
            }
          } catch (err) {
            alert('Error: ' + err.message);
          }
        });

        row.innerHTML = `
          <td>${t.id}</td>
          <td>${t.name}</td>
          <td>${t.email}</td>
          <td>${t.status}</td>
          <td>${t.joined_on}</td>
          <td></td> <!-- For action button -->
        `;
        row.querySelector('td:last-child').appendChild(actionBtn);
        tableBody.appendChild(row);
      });
    } catch (err) {
      console.error('Error:', err);
      tableBody.innerHTML = `<tr><td colspan="6">Error loading data</td></tr>`;
    }
  };

  loadTeachers();
});
