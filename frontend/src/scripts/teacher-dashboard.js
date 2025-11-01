// frontend/src/scripts/teacher-dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    loadSyllabusTrackers();
});

async function loadSyllabusTrackers() {
    const container = document.getElementById('tracker-list-container');
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/api/syllabus/trackers', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            container.innerHTML = '<p>Could not load syllabus trackers.</p>';
            return;
        }

        const trackers = await response.json();

        if (trackers.length === 0) {
            container.innerHTML = '<p>You have not been assigned any syllabus trackers yet.</p>';
            return;
        }

        container.innerHTML = ''; // Clear 'loading'
        trackers.forEach(tracker => {
            // Use the new fields from the API
            container.innerHTML += `
                <a href="/pages/syllabus-detail.html?id=${tracker.teacher_assignment_id}" class="tracker-link">
                    <div class="tracker-card">
                        <div class="tracker-header">
                            <h3>${tracker.full_class_name} - ${tracker.subject_name}</h3>
                            <span>${tracker.chapters_completed} / ${tracker.total_chapters} Chapters</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${tracker.percentage}%;">
                                ${tracker.percentage}%
                            </div>
                        </div>
                    </div>
                </a>
            `;
        });

    } catch (error) {
        console.error('Failed to load trackers:', error);
        container.innerHTML = '<p>Error loading syllabus trackers.</p>';
    }
}