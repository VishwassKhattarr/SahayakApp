document.addEventListener('DOMContentLoaded', () => {
    // Get query parameters
    const urlParams = new URLSearchParams(window.location.search);
    // --- 1. CHANGE classId to sectionId ---
    const sectionId = urlParams.get('sectionId');
    const sectionName = urlParams.get('sectionName') || 'your class';
    const date = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

    const studentListContainer = document.getElementById('student-list-container');
    const saveButton = document.getElementById('save-attendance-btn');
    const statusMessage = document.getElementById('status-message');
    const teacherData = JSON.parse(localStorage.getItem('teacherData') || '{}');
    
    // Set the page header
    const header = document.querySelector('h1');
    if (header) {
        header.textContent = `Mark Attendance for ${decodeURIComponent(sectionName)}`;
    }

    // Load students for the selected class
    async function loadStudents() {
        try {
            // --- 2. CHANGE API ENDPOINT ---
            const response = await fetch(`/api/attendance/students/${sectionId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                 const errData = await response.json();
                 throw new Error(errData.message || 'Failed to fetch students');
            }
            
            const data = await response.json();
            const students = data.students;

            // --- 3. HANDLE "ALREADY MARKED" STATE ---
            if (data.alreadyMarked) {
                studentListContainer.innerHTML = `<p class="status-message success">Attendance has already been marked for ${decodeURIComponent(sectionName)} today.</p>`;
                saveButton.style.display = 'none'; // Hide save button
                return;
            }
            
            if (students.length === 0) {
                studentListContainer.innerHTML = '<p>No students found in this class.</p>';
                saveButton.style.display = 'none';
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
                                    <input type="radio" name="attendance_${student.id}" value="Present" checked>
                                    Present
                                </label>
                                <label>
                                    <input type="radio" name="attendance_${student.id}" value="Absent">
                                    Absent
                                </label>
                            </div>
                        </div>
                    `).join('')}
                </div>`;

            studentListContainer.innerHTML = html;
        } catch (error) {
            console.error('Error loading students:', error);
            studentListContainer.innerHTML = `<p class="error">Error: ${error.message}. Please try again.</p>`;
            saveButton.style.display = 'none';
        }
    }

    // Save attendance records
    async function saveAttendance() {
        // --- 4. ADD CONFIRMATION ---
        if (!confirm('Are you sure you want to submit this attendance? This cannot be undone today.')) {
            return;
        }

        try {
            const attendanceRows = document.querySelectorAll('.attendance-row');
            const attendanceData = Array.from(attendanceRows).map(row => {
                const studentId = row.dataset.studentId;
                const status = row.querySelector('input[type="radio"]:checked').value;
                return {
                    student_id: studentId,
                    status: status,
                    date: date,
                    // Remove class_id and marked_by, backend will handle it
                };
            });

            // --- 5. CHANGE API ENDPOINT AND PAYLOAD ---
            const response = await fetch('/api/attendance/mark', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                // Send sectionId along with attendance data
                body: JSON.stringify({ 
                    attendance: attendanceData,
                    sectionId: sectionId 
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                // Handle "already marked" conflict
                if (response.status === 409) {
                    throw new Error(errData.message || 'Attendance was just marked by someone else.');
                }
                throw new Error(errData.message || 'Failed to save attendance');
            }

            const result = await response.json();
            statusMessage.textContent = 'Attendance saved successfully!';
            statusMessage.className = 'status-message success';
            
            // Disable save button and reload to show "already marked"
            saveButton.disabled = true;
            saveButton.textContent = 'Saved!';
            setTimeout(() => {
                // Reload the page to show the "already marked" status
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Error saving attendance:', error);
            statusMessage.textContent = `Error: ${error.message}`;
            statusMessage.className = 'status-message error';
        }
    }

    // Event Listeners
    if (saveButton) {
        saveButton.addEventListener('click', saveAttendance);
    }

    // Initial load
    // --- 6. CHECK FOR sectionId ---
    if (sectionId) {
        loadStudents();
    } else {
        studentListContainer.innerHTML = '<p class="error">No class section selected. Please go back to the dashboard.</p>';
        if (saveButton) saveButton.style.display = 'none';
    }
});