// frontend/src/scripts/worksheet-submissions.js

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const teacherAssignmentId = urlParams.get('id');
    const className = urlParams.get('name') || 'Class';

    document.getElementById('submission-header').textContent = `Review Submissions: ${decodeURIComponent(className)}`;

    if (!teacherAssignmentId) {
        document.getElementById('chapter-list-container').innerHTML = '<p>Error: No class ID specified.</p>';
        return;
    }

    loadCompletedChapters(teacherAssignmentId);
    setupEventListeners(teacherAssignmentId);
});

/**
 * Loads the list of completed chapters for this class.
 */
async function loadCompletedChapters(teacherAssignmentId) {
    const container = document.getElementById('chapter-list-container');
    const token = localStorage.getItem('token');
    container.innerHTML = '<p>Loading completed chapters...</p>';

    try {
        const response = await fetch(`/api/syllabus/tracker/${teacherAssignmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Could not fetch chapters.');

        const data = await response.json();
        const completedChapters = data.chapters.filter(chap => chap.is_completed);

        if (completedChapters.length === 0) {
            container.innerHTML = '<p>No worksheets have been generated for this class yet.</p>';
            return;
        }

        container.innerHTML = ''; // Clear loading
        completedChapters.forEach(chap => {
            const button = document.createElement('button');
            button.className = 'btn chapter-select-btn';
            button.dataset.chapterId = chap.chapter_id;
            button.dataset.chapterName = chap.chapter_name;
            button.textContent = `${chap.chapter_order}. ${chap.chapter_name}`;
            container.appendChild(button);
        });

    } catch (error) {
        container.innerHTML = `<p>${error.message}</p>`;
    }
}

/**
 * Sets up all click listeners for the page.
 */
function setupEventListeners(teacherAssignmentId) {
    const chapterContainer = document.getElementById('chapter-list-container');
    const submissionList = document.getElementById('student-submission-list');

    // --- 1. Handle Chapter Selection ---
    chapterContainer.addEventListener('click', e => {
        if (e.target.classList.contains('chapter-select-btn')) {
            const chapterId = e.target.dataset.chapterId;
            const chapterName = e.target.dataset.chapterName;

            document.querySelectorAll('.chapter-select-btn').forEach(btn => btn.classList.remove('btn-active'));
            e.target.classList.add('btn-active');

            loadSubmissionsForChapter(teacherAssignmentId, chapterId, chapterName);
        }
    });

    // --- 2. Handle Toggle Button Clicks (Answers/Remarks) ---
    submissionList.addEventListener('click', e => {
        const button = e.target;
        let targetId = null;
        let isActive = button.classList.contains('btn-active');

        if (button.classList.contains('btn-view-answers')) {
            targetId = button.dataset.targetAnswer;
        } else if (button.classList.contains('btn-view-remarks')) {
            targetId = button.dataset.targetRemark;
        }

        if (targetId) {
            const targetDiv = document.getElementById(targetId);
            if (targetDiv) {
                targetDiv.classList.toggle('hidden', isActive);
                button.classList.toggle('btn-active', !isActive);
                
                if (!isActive) {
                    button.textContent = 'Hide ' + (button.classList.contains('btn-view-answers') ? 'Answers' : 'Remarks');
                } else {
                    button.textContent = 'View ' + (button.classList.contains('btn-view-answers') ? 'Answers' : 'Remarks');
                }
            }
        }
    });
}

/**
 * Fetches all submissions for a chapter and renders the student list.
 */
async function loadSubmissionsForChapter(teacherAssignmentId, chapterId, chapterName) {
    const section = document.getElementById('worksheet-section');
    const list = document.getElementById('student-submission-list');
    const title = document.getElementById('worksheet-chapter-title');
    const submittedCountEl = document.getElementById('submitted-count');
    const totalCountEl = document.getElementById('total-count');
    const token = localStorage.getItem('token');

    section.classList.remove('hidden');
    title.textContent = `Submissions for: ${chapterName}`;
    list.innerHTML = '<p>Loading submissions...</p>';

    try {
        const response = await fetch(`/api/submissions/chapter/${teacherAssignmentId}/${chapterId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
             const errData = await response.json();
             throw new Error(errData.message || 'Could not fetch submissions.');
        }

        const submissions = await response.json();
        
        list.innerHTML = ''; // Clear loading
        if (submissions.length === 0) {
            list.innerHTML = '<p>No students are enrolled in this section.</p>';
            submittedCountEl.textContent = 0;
            totalCountEl.textContent = 0;
            return;
        }

        let submittedCount = 0;
        submissions.forEach((sub, index) => {
            const hasSubmitted = !!sub.submission_id;
            if (hasSubmitted) submittedCount++;

            // --- Create elements safely ---
            const listItem = document.createElement('div');
            listItem.className = 'list-group-item';

            // 1. Header (Name, Marks)
            const header = document.createElement('div');
            header.className = 'student-submission-header';
            
            const studentName = document.createElement('strong');
            studentName.textContent = `${sub.roll_number || 'N/A'}. ${sub.student_name}`;
            
            const badge = document.createElement('span');
            badge.className = `badge ${hasSubmitted ? 'success' : 'danger'}`;
            badge.textContent = sub.ai_assigned_marks || (hasSubmitted ? 'Processing' : 'Not Submitted');

            header.appendChild(studentName);
            header.appendChild(badge);
            listItem.appendChild(header);

            // 2. Add buttons and content *only if* submitted
            if (hasSubmitted) {
                const uniqueId = `sub-${index}`;
                const answerId = `answer-${uniqueId}`;
                const remarkId = `remark-${uniqueId}`;

                const actions = document.createElement('div');
                actions.className = 'student-submission-actions';

                const btnAnswers = document.createElement('button');
                btnAnswers.className = 'btn btn-view-answers';
                btnAnswers.dataset.targetAnswer = answerId;
                btnAnswers.textContent = 'View Answers';

                const btnRemarks = document.createElement('button');
                btnRemarks.className = 'btn btn-view-remarks';
                btnRemarks.dataset.targetRemark = remarkId;
                btnRemarks.textContent = 'View Remarks';

                actions.appendChild(btnAnswers);
                actions.appendChild(btnRemarks);
                listItem.appendChild(actions);

                // --- Answer Content (Hidden) ---
                const answerDiv = document.createElement('div');
                answerDiv.id = answerId;
                answerDiv.className = 'submission-details answers-container hidden';
                
                const answerH5 = document.createElement('h5');
                answerH5.textContent = 'Student Answers:';
                
                const answerPre = document.createElement('pre');
                
                // ✅ YEH LOGIC "BLANK" SCREEN KO FIX KAREGA
                if (sub.student_answers_raw && sub.student_answers_raw.trim() !== '') {
                    answerPre.textContent = sub.student_answers_raw;
                } else {
                    answerPre.textContent = 'Error: Student answers not found in database (data is null or empty).';
                    answerPre.style.color = 'red';
                }
                
                answerDiv.appendChild(answerH5);
                answerDiv.appendChild(answerPre);
                listItem.appendChild(answerDiv);

                // --- Remarks Content (Hidden) ---
                const remarkDiv = document.createElement('div');
                remarkDiv.id = remarkId;
                remarkDiv.className = 'submission-details remarks-container hidden';
                
                const remarkH5 = document.createElement('h5');
                remarkH5.textContent = 'Evaluation & Remarks:';
                
                const remarkPre = document.createElement('pre');

                // ✅ YEH LOGIC "BLANK" SCREEN KO FIX KAREGA
                if (sub.ai_evaluation_details && sub.ai_evaluation_details.trim() !== '') {
                    remarkPre.textContent = sub.ai_evaluation_details;
                } else if (sub.ai_assigned_marks === 'Error') {
                    remarkPre.textContent = `Evaluation failed.\nDetails: ${sub.ai_evaluation_details || 'No error details provided.'}`;
                    remarkPre.style.color = 'red';
                } else if (hasSubmitted && (!sub.ai_evaluation_details || sub.ai_evaluation_details.trim() === '')) {
                     remarkPre.textContent = 'Evaluation is in progress... (n8n is working). Please check back in a few minutes.';
                     remarkPre.style.color = 'blue';
                } else {
                    remarkPre.textContent = 'No evaluation available in database (data is null or empty).';
                }
                
                remarkDiv.appendChild(remarkH5);
                remarkDiv.appendChild(remarkPre);
                listItem.appendChild(remarkDiv);
            }

            list.appendChild(listItem);
        });

        // Update stats
        submittedCountEl.textContent = submittedCount;
        totalCountEl.textContent = submissions.length;

    } catch (error) {
        // Yahan "Server error retrieving submissions" dikhega
        list.innerHTML = `<p style="color: red; font-weight: bold;">Error: ${error.message}</p>`;
    }
}