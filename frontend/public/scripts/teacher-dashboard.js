// frontend/src/scripts/teacher-dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    loadSyllabusTrackers();
    // --- 1. ADD NEW FUNCTION CALL ---
    checkIfClassTeacher(); 
});

// --- 2. ADD NEW FUNCTION TO CHECK CLASS TEACHER STATUS ---
async function checkIfClassTeacher() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('class-teacher-section');
    const actionsContainer = document.getElementById('class-teacher-actions-container');

    try {
        const response = await fetch('/api/teacher/class-teacher-section', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Could not verify class teacher status');

        const data = await response.json();

        if (data.success && data.isClassTeacher) {
            // Show the section
            container.style.display = 'block';
            
            // Create and add the button
            const attendanceBtn = document.createElement('a');
            attendanceBtn.className = 'btn primary-btn';
            attendanceBtn.href = `/pages/attendance.html?sectionId=${data.sectionId}&sectionName=${encodeURIComponent(data.sectionName)}`;
            attendanceBtn.textContent = `Mark Attendance for ${data.sectionName}`;
            
            actionsContainer.innerHTML = ''; // Clear any loading text
            actionsContainer.appendChild(attendanceBtn);
        } else {
            // Not a class teacher, do nothing
            container.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking class teacher status:', error);
        actionsContainer.innerHTML = '<p class="error">Could not load class teacher actions.</p>';
        container.style.display = 'block';
    }
}
// --- END OF NEW FUNCTION ---




async function loadSyllabusTrackers() {
    const syllabusContainer = document.getElementById('tracker-list-container');
    const submissionContainer = document.getElementById('submission-review-list-container');
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/api/syllabus/trackers', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorMsg = '<p>Could not load data.</p>';
            syllabusContainer.innerHTML = errorMsg;
            submissionContainer.innerHTML = errorMsg;
            return;
        }

        const trackers = await response.json();

        if (trackers.length === 0) {
            const noDataMsg = '<p>You have not been assigned any classes yet.</p>';
            syllabusContainer.innerHTML = noDataMsg;
            submissionContainer.innerHTML = noDataMsg;
            return;
        }

        // --- ✅ REFINEMENT START ---
        // 1. Create empty arrays to hold the HTML strings
        const syllabusHTML = [];
        const submissionHTML = [];

        trackers.forEach(tracker => {
            const fullClassName = `${tracker.full_class_name} - ${tracker.subject_name}`;

            // 2. Push HTML strings into the arrays (this is very fast)
            syllabusHTML.push(`
                <a href="/pages/syllabus-detail.html?id=${tracker.teacher_assignment_id}" class="tracker-link">
                    <div class="tracker-card">
                        <div class="tracker-header">
                            <h3>${fullClassName}</h3>
                            <span>${tracker.chapters_completed} / ${tracker.total_chapters} Chapters</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${tracker.percentage}%;">
                                ${tracker.percentage}%
                            </div>
                        </div>
                    </div>
                </a>
            `);

            submissionHTML.push(`
                <a href="/pages/worksheet-submissions.html?id=${tracker.teacher_assignment_id}&name=${encodeURIComponent(fullClassName)}" class="tracker-link">
                    <div class="tracker-card">
                        <div class="tracker-header">
                            <h3>${fullClassName}</h3>
                            <span>Review Submissions</span>
                        </div>
                    </div>
                </a>
            `);
        });

        // 3. Set the innerHTML *only once* after the loop is finished
        syllabusContainer.innerHTML = syllabusHTML.join('');
        submissionContainer.innerHTML = submissionHTML.join('');
        // --- ✅ REFINEMENT END ---

    } catch (error) {
        console.error('Failed to load trackers:', error);
        const errorMsg = '<p>Error loading data.</p>';
        syllabusContainer.innerHTML = errorMsg;
        submissionContainer.innerHTML = errorMsg;
    }
}