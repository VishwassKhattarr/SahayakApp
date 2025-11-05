document.addEventListener('DOMContentLoaded', () => {
    // Get query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('classId');
    const date = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

    const studentListContainer = document.getElementById('student-list-container');
    const saveButton = document.getElementById('save-attendance-btn');
    const statusMessage = document.getElementById('status-message');
    const teacherData = JSON.parse(localStorage.getItem('teacherData') || '{}');

    // Load students for the selected class
    async function loadStudents() {
        try {
            const response = await fetch(`/api/students/class/${classId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch students');
            
            const students = await response.json();
            
            if (students.length === 0) {
                studentListContainer.innerHTML = '<p>No students found in this class.</p>';
                return;
            }

            // Create attendance form
            const html = `
                <h3>Date: ${new Date().toLocaleDateString()}</h3>
                <div class="attendance-grid">
                    <div class="attendance-header">
                        <span>Roll No</span>
                        <span>Student Name</span>
                        <span>Attendance</span>
                    </div>
                    ${students.map(student => `
                        <div class="attendance-row" data-student-id="${student.id}">
                            <span>${student.roll_number || '-'}</span>
                            <span>${student.name}</span>
                            <div class="attendance-options">
                                <label>
                                    <input type="radio" name="attendance_${student.id}" value="present" checked>
                                    Present
                                </label>
                                <label>
                                    <input type="radio" name="attendance_${student.id}" value="absent">
                                    Absent
                                </label>
                            </div>
                        </div>
                    `).join('')}
                </div>`;

            studentListContainer.innerHTML = html;
        } catch (error) {
            console.error('Error loading students:', error);
            studentListContainer.innerHTML = '<p class="error">Error loading students. Please try again.</p>';
        }
    }

    // Save attendance records
    async function saveAttendance() {
        try {
            const attendanceRows = document.querySelectorAll('.attendance-row');
            const attendanceData = Array.from(attendanceRows).map(row => {
                const studentId = row.dataset.studentId;
                const status = row.querySelector('input[type="radio"]:checked').value;
                return {
                    student_id: studentId,
                    status: status,
                    date: date,
                    class_id: classId,
                    marked_by: teacherData.id
                };
            });

            const response = await fetch('/api/attendance/mark', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ attendance: attendanceData })
            });

            if (!response.ok) throw new Error('Failed to save attendance');

            const result = await response.json();
            statusMessage.textContent = 'Attendance saved successfully!';
            statusMessage.className = 'status-message success';
            
            // Disable save button temporarily
            saveButton.disabled = true;
            setTimeout(() => {
                saveButton.disabled = false;
            }, 3000);

        } catch (error) {
            console.error('Error saving attendance:', error);
            statusMessage.textContent = 'Failed to save attendance. Please try again.';
            statusMessage.className = 'status-message error';
        }
    }

    // Event Listeners
    if (saveButton) {
        saveButton.addEventListener('click', saveAttendance);
    }

    // Initial load
    if (classId) {
        loadStudents();
    } else {
        studentListContainer.innerHTML = '<p class="error">No class selected. Please go back and select a class.</p>';
        if (saveButton) saveButton.style.display = 'none';
    }
});