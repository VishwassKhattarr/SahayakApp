document.addEventListener('DOMContentLoaded', () => {
    const studentListContainer = document.getElementById('student-list-container');
    const saveBtn = document.getElementById('save-attendance-btn');
    const statusMessage = document.getElementById('status-message');

    // Function to fetch and display students
    async function fetchStudents() {
        try {
            const response = await fetch('/api/students');
            const students = await response.json();

            if (students.length === 0) {
                studentListContainer.innerHTML = '<p>No students found.</p>';
                return;
            }

            // Create the form HTML
            let formHtml = '<form id="attendance-form">';
            students.forEach(student => {
                formHtml += `
                    <div class="student-row">
                        <label>
                            <input type="checkbox" name="present" value="${student.id}" checked>
                            ${student.roll_number} - ${student.name}
                        </label>
                    </div>
                `;
            });
            formHtml += '</form>';
            studentListContainer.innerHTML = formHtml;

        } catch (error) {
            console.error('Failed to fetch students:', error);
            studentListContainer.innerHTML = '<p class="error-message">Could not load student list.</p>';
        }
    }

    // Function to save attendance
    async function saveAttendance() {
    // This line finds all checkboxes that are checked
        const checkboxes = document.querySelectorAll('#attendance-form input[name="present"]:checked');
    
    // This line converts the list of checkbox elements into an array of their ID values
        const presentStudentIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

        statusMessage.textContent = 'Saving...';
        statusMessage.style.color = 'inherit';

        try {
            const response = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ presentIds: presentStudentIds })
            });

            const result = await response.json();

            if (response.ok) {
                statusMessage.textContent = result.message;
                statusMessage.style.color = 'green';
            } else {
                throw new Error(result.message || 'Failed to save attendance.');
            }
        } catch (error) {
            console.error('Error saving attendance:', error);
            statusMessage.textContent = error.message;
            statusMessage.style.color = 'red';
        }
    }

    // Add event listener to the save button
    saveBtn.addEventListener('click', saveAttendance);

    // Initial fetch of students when page loads
    fetchStudents();
});