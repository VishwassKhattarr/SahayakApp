// frontend/src/scripts/syllabus-detail.js

// Global: Get the teacherAssignmentId from the URL
const urlParams = new URLSearchParams(window.location.search);
const teacherAssignmentId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', () => {
    if (!teacherAssignmentId) {
        document.getElementById('syllabus-header').textContent = 'Error: No tracker ID specified.';
        return;
    }
    loadChapterDetails(teacherAssignmentId);
});

async function loadChapterDetails(teacherAssignmentId) {
    const container = document.getElementById('chapter-list-container');
    const header = document.getElementById('syllabus-header');
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`/api/syllabus/tracker/${teacherAssignmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            container.innerHTML = '<p>Could not load chapter details.</p>';
            return;
        }

        const data = await response.json();
        header.textContent = `${data.className} - ${data.subjectName}`;
        
        if (data.chapters.length === 0) {
            container.innerHTML = '<p>No chapters have been added for this subject yet.</p>';
            return;
        }

        let chapterHtml = '<ul class="chapter-list">';
        data.chapters.forEach(chap => {
            chapterHtml += `<li class="chapter-item ${chap.is_completed ? 'completed' : ''}">`;
            
            // Render the checkbox
            chapterHtml += `
                <input 
                    type="checkbox" 
                    id="chap-${chap.chapter_id}" 
                    data-chapter-id="${chap.chapter_id}"
                    data-chapter-name="${chap.chapter_name}"
                    ${chap.is_completed ? 'checked disabled' : ''}
                >
                <label for="chap-${chap.chapter_id}">${chap.chapter_order}. ${chap.chapter_name}</label>
            `;

            // If chapter is complete, render download buttons
            if (chap.is_completed) {
                chapterHtml += `
                    <div class="chapter-actions" style="margin-left: auto; display: flex; gap: 10px;">
                        <button 
                            class="btn primary-btn download-worksheet-btn" 
                            data-chapter-id="${chap.chapter_id}"
                            data-assignment-id="${teacherAssignmentId}"
                        >Worksheet</button>
                        <button 
                            class="btn secondary-btn download-answerkey-btn" 
                            data-chapter-id="${chap.chapter_id}"
                            data-assignment-id="${teacherAssignmentId}"
                        >Answer Key</button>
                    </div>
                `;
            }
            chapterHtml += `</li>`;
        });
        chapterHtml += '</ul>';
        container.innerHTML = chapterHtml;

        // Add event listeners AFTER rendering
        attachAllListeners(teacherAssignmentId);

    } catch (error) {
        console.error('Failed to load chapter details:', error);
        container.innerHTML = '<p>Error loading chapter details.</p>';
    }
}

function attachAllListeners(teacherAssignmentId) {
    // 1. Add listeners for checkboxes (only those not disabled)
    const checkboxes = document.querySelectorAll('.chapter-item input[type="checkbox"]:not(:disabled)');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', (e) => {
            if (e.target.checked) {
                e.target.disabled = true;
                const chapterId = e.target.dataset.chapterId;
                const chapterName = e.target.dataset.chapterName;
                handleChapterCompletion(teacherAssignmentId, chapterId, chapterName, e.target.parentElement);
            }
        });
    });

    // 2. Add listeners for worksheet download buttons
    const worksheetBtns = document.querySelectorAll('.download-worksheet-btn');
    worksheetBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const chapterId = e.target.dataset.chapterId;
            const assignmentId = e.target.dataset.assignmentId;
            e.target.textContent = 'Loading...';
            try {
                const data = await fetchWorksheetContent(assignmentId, chapterId);
                downloadPdf(data.worksheet_content, data.chapter_name, "Worksheet");
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
            e.target.textContent = 'Worksheet';
        });
    });

    // 3. Add listeners for answer key download buttons
    const answerKeyBtns = document.querySelectorAll('.download-answerkey-btn');
    answerKeyBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const chapterId = e.target.dataset.chapterId;
            const assignmentId = e.target.dataset.assignmentId;
            e.target.textContent = 'Loading...';
            try {
                const data = await fetchWorksheetContent(assignmentId, chapterId);
                downloadPdf(data.answer_key_content, data.chapter_name, "Answer Key");
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
            e.target.textContent = 'Answer Key';
        });
    });
}

async function handleChapterCompletion(teacherAssignmentId, chapterId, chapterName, listItem) {
    const statusMsg = document.getElementById('status-message');
    statusMsg.textContent = `Processing "${chapterName}"... Generating worksheet...`;
    statusMsg.style.color = 'orange';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/syllabus/complete', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ teacherAssignmentId, chapterId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to mark complete');
        }

        // Show the success message from the backend
        statusMsg.textContent = data.message;
        statusMsg.style.color = 'green';
        
        // Refresh the entire chapter list to show new buttons
        loadChapterDetails(teacherAssignmentId);

    } catch (error) {
        console.error('Failed to complete chapter:', error);
        statusMsg.textContent = `Error: ${error.message}`;
        statusMsg.style.color = 'red';
        // Re-enable checkbox if it failed
        const checkbox = listItem.querySelector('input');
        if (checkbox) checkbox.disabled = false;
    }
}

// NEW: Helper function to fetch worksheet/answer key content
async function fetchWorksheetContent(assignmentId, chapterId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/syllabus/worksheet/${assignmentId}/${chapterId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Could not fetch worksheet content');
    }
    return response.json();
}

// NEW: Generic PDF download function
function downloadPdf(content, chapterName, type) {
    if (!content) {
        alert(`No ${type} content available to download.`);
        return;
    }
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        const fullText = `# ${type}: ${chapterName}\n\n${content}`;
        const fileName = `${chapterName}_${type.replace(' ', '_')}.pdf`;
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 15;
        const maxWidth = pageWidth - 2 * margin;
        
        pdf.setFontSize(11);
        const lines = pdf.splitTextToSize(fullText, maxWidth);
        
        let y = 20;
        lines.forEach(line => {
            if (y > 280) { // Approx margin for A4 height
                pdf.addPage();
                y = 20;
            }
            // Simple bolding for titles
            if (line.startsWith('# ')) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(14);
                pdf.text(line.substring(2), margin, y);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(11);
            } else {
                pdf.text(line, margin, y);
            }
            y += 7; // Line height
        });

        pdf.save(fileName);
    } catch (error) {
        console.error('PDF Generation Error:', error);
        alert('Failed to generate PDF: ' + error.message);
    }
}