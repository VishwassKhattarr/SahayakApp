// backend/controllers/submissionController.js
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// --- Teacher-Facing API Function ---
// Yeh function database se woh data fetch karta hai jo n8n ne daala hai.
export const getSubmissionsForChapter = async (req, res) => {
    const { teacherAssignmentId, chapterId } = req.params;
    const teacherId = req.user.id;

     // Validate inputs
    if (isNaN(parseInt(teacherAssignmentId)) || isNaN(parseInt(chapterId))) {
        return res.status(400).json({ message: 'Invalid assignment or chapter ID.' });
    }

    try {
        // 1. Security check: Teacher assignment ka maalik hai?
        // --- CORRECTED: Fetch class_id as well ---
        const ownerCheck = await pool.query('SELECT section_id, class_id FROM teacher_class_assignments WHERE id = $1 AND teacher_id = $2', [teacherAssignmentId, teacherId]);
        if (ownerCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied to this assignment.' });
        }
        // --- CORRECTED: Store both IDs ---
        const { section_id: assignedSectionId, class_id: assignedClassId } = ownerCheck.rows[0];

        // 2. Us generated_worksheet ka ID dhoondho
         const worksheetCheck = await pool.query('SELECT id FROM generated_worksheets WHERE teacher_assignment_id = $1 AND chapter_id = $2', [teacherAssignmentId, chapterId]);
         let generatedWorksheetId = null;
         if (worksheetCheck.rows.length > 0) {
             generatedWorksheetId = worksheetCheck.rows[0].id;
         } else {
             console.log(`No worksheet found for assignment ${teacherAssignmentId}, chapter ${chapterId}. Listing students only.`);
         }

        // 3. Sabhi students aur unke submissions fetch karo
        // --- CORRECTED: This query now joins with 'sections' and filters by both class_id and section_name ---
        const query = `
            SELECT
                s.id as student_id,
                s.name as student_name,
                s.roll_number,
                ws.id as submission_id,
                ws.submitted_at,
                ws.ai_assigned_marks,
                ws.is_likely_ai_generated,
                ws.student_answers_raw,      -- <<< Yeh column fetch ho raha hai
                ws.ai_evaluation_details     -- <<< Yeh column fetch ho raha hai
            FROM students s
            JOIN student_class_enrollments sce ON s.id = sce.student_id
            JOIN sections sec ON sce.section_id = sec.id
            LEFT JOIN worksheet_submissions ws ON s.id = ws.student_id AND ws.generated_worksheet_id = $2 
            WHERE 
                sec.class_id = $3
                AND sec.section_name = (SELECT section_name FROM sections WHERE id = $1)
            ORDER BY s.roll_number;
        `;
        
        // --- CORRECTED: Pass all three parameters in the correct order ($1, $2, $3) ---
        const { rows } = await pool.query(query, [assignedSectionId, generatedWorksheetId, assignedClassId]);
        
        // 4. Data frontend ko bhej do
        res.json(rows);

    } catch (error) {
        console.error(`Error getting submissions for chapter ${chapterId}, assignment ${teacherAssignmentId}:`, error);
        // Yahan error aane par "Server error" message frontend par jayega
        res.status(500).json({ message: 'Server error retrieving submissions' });
    }
};