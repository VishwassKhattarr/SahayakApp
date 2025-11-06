// frontend/src/scripts/teacher-dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    loadSyllabusTrackers();
    //loadTeacherClasses();

    // Add click handler for attendance button
    // const attendanceBtn = document.getElementById('mark-attendance-btn');
    // if (attendanceBtn) {
    //     attendanceBtn.addEventListener('click', redirectToAttendance);
    // }
});

// async function loadTeacherClasses() {
//     const classSelect = document.getElementById('attendance-class-select');
//     const token = localStorage.getItem('token');

//     try {
//         const response = await fetch('/api/teacher/classes', {
//             headers: { 'Authorization': `Bearer ${token}` }
//         });

//         if (!response.ok) throw new Error('Failed to fetch classes');

//         const classes = await response.json();

//         if (classes.length === 0) {
//             classSelect.innerHTML = '<option value="">No classes assigned</option>';
//             return;
//         }

//         classSelect.innerHTML = `
//             <option value="">Select Class</option>
//             ${classes.map(cls => `
//                 <option value="${cls.teacher_assignment_id}">${cls.class_name} ${cls.section_name} - ${cls.subject_name}</option>
//             `).join('')}
//         `;
//     } catch (error) {
//         console.error('Error loading classes:', error);
//         classSelect.innerHTML = '<option value="">Error loading classes</option>';
//     }
// }

// function redirectToAttendance() {
//     const classSelect = document.getElementById('attendance-class-select');
//     const selectedClass = classSelect.value;

//     if (!selectedClass) {
//         alert('Please select a class first');
//         return;
//     }

//     window.location.href = `/pages/attendance.html?classId=${selectedClass}`;
// }

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