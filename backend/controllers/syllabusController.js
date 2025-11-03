// backend/controllers/syllabusController.js
import { GoogleGenAI } from '@google/genai';
import pkg from 'pg';
import nodemailer from 'nodemailer';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// --- Nodemailer Setup (Worksheet bhejne ke liye) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Your App Password
    },
});

// --- Google Form Config (Email mein link bhejne ke liye) ---
const GOOGLE_FORM_BASE_URL = process.env.GOOGLE_FORM_BASE_URL;
const EMAIL_FIELD_ID = process.env.GOOGLE_FORM_EMAIL_FIELD_ID;
const WORKSHEET_ID_FIELD_ID = process.env.GOOGLE_FORM_WORKSHEET_ID_FIELD_ID;

/**
 * Get all syllabus trackers (teacher assignments) for the logged-in teacher.
 */
export const getTrackers = async (req, res) => {
    const teacherId = req.user.id; // From verifyToken middleware

    try {
        const query = `
            SELECT
                tca.id as teacher_assignment_id,
                cls.class_name,
                sec.section_name,
                sub.subject_name,
                tca.subject_id,
                (SELECT COUNT(*) FROM completion_status cs WHERE cs.teacher_assignment_id = tca.id AND cs.is_completed = true) as chapters_completed,
                (SELECT COUNT(*) FROM chapters ch WHERE ch.subject_id = tca.subject_id) as total_chapters
            FROM teacher_class_assignments tca
            JOIN classes cls ON tca.class_id = cls.id
            JOIN sections sec ON tca.section_id = sec.id
            JOIN subjects sub ON tca.subject_id = sub.id
            WHERE tca.teacher_id = $1;
        `;
        const { rows } = await pool.query(query, [teacherId]);

        const trackers = rows.map(row => ({
            ...row,
            full_class_name: `${row.class_name}-${row.section_name}`,
            percentage: (row.total_chapters > 0) ? Math.round((row.chapters_completed / row.total_chapters) * 100) : 0
        }));

        res.json(trackers);
    } catch (error) {
        console.error('Error fetching trackers:', error);
        res.status(500).json({ message: 'Server error fetching trackers' });
    }
};

/**
 * Get details for one tracker: all chapters and their completion status.
 */
export const getTrackerDetails = async (req, res) => {
    const { teacherAssignmentId } = req.params;
    const teacherId = req.user.id;

    try {
        const assignmentCheck = await pool.query(
            `SELECT tca.subject_id, tca.section_id, cls.class_name, sec.section_name, sub.subject_name
             FROM teacher_class_assignments tca
             JOIN classes cls ON tca.class_id = cls.id
             JOIN sections sec ON tca.section_id = sec.id
             JOIN subjects sub ON tca.subject_id = sub.id
             WHERE tca.id = $1 AND tca.teacher_id = $2`,
            [teacherAssignmentId, teacherId]
        );

        if (assignmentCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { subject_id, class_name, section_name, subject_name } = assignmentCheck.rows[0];

        const query = `
            SELECT
                ch.id as chapter_id,
                ch.chapter_name,
                ch.chapter_order,
                COALESCE(cs.is_completed, false) as is_completed
            FROM chapters ch
            LEFT JOIN completion_status cs ON ch.id = cs.chapter_id AND cs.teacher_assignment_id = $1
            WHERE ch.subject_id = $2
            ORDER BY ch.chapter_order;
        `;
        const { rows } = await pool.query(query, [teacherAssignmentId, subject_id]);

        res.json({
            className: `${class_name}-${section_name}`,
            subjectName: subject_name,
            chapters: rows
        });
    } catch (error) {
        console.error('Error fetching tracker details:', error);
        res.status(500).json({ message: 'Server error fetching details' });
    }
};

/**
 * Mark chapter complete, generate/save worksheet, send email with Form link.
 * Yeh aapke workflow ka Step 1 hai.
 */
export const markChapterComplete = async (req, res) => {
    const { teacherAssignmentId, chapterId } = req.body;
    const teacherId = req.user.id;

    if (!ai) return res.status(500).json({ message: "AI service is not configured." });
    if (!GOOGLE_FORM_BASE_URL || !EMAIL_FIELD_ID || !WORKSHEET_ID_FIELD_ID || GOOGLE_FORM_BASE_URL.includes('YOUR_FORM_ID')) {
         console.error("ERROR: Google Form configuration is missing or incomplete in the .env file.");
    }

    try {
        // 1. Verify ownership
        const assignmentCheck = await pool.query(
            `SELECT tca.section_id, cls.class_name, sec.section_name, sub.subject_name
             FROM teacher_class_assignments tca
             JOIN classes cls ON tca.class_id = cls.id
             JOIN sections sec ON tca.section_id = sec.id
             JOIN subjects sub ON tca.subject_id = sub.id
             WHERE tca.id = $1 AND tca.teacher_id = $2`,
            [teacherAssignmentId, teacherId]
        );

        if (assignmentCheck.rows.length === 0) return res.status(403).json({ message: 'Access denied' });

        const { section_id, class_name, section_name, subject_name } = assignmentCheck.rows[0];
        const full_class_name = `${class_name}-${section_name}`;

        const chapterInfo = await pool.query('SELECT chapter_name FROM chapters WHERE id = $1', [chapterId]);
        const chapter_name = chapterInfo.rows[0]?.chapter_name;
        if (!chapter_name) return res.status(404).json({ message: 'Chapter not found' });

        // 2. Mark as complete
        await pool.query(
            `INSERT INTO completion_status (teacher_assignment_id, chapter_id, is_completed, completed_at)
             VALUES ($1, $2, true, NOW()) ON CONFLICT (teacher_assignment_id, chapter_id) DO UPDATE SET is_completed = true, completed_at = NOW();`,
            [teacherAssignmentId, chapterId]
        );

        // 3. Check if worksheet exists
        const existingWorksheet = await pool.query(
            'SELECT id FROM generated_worksheets WHERE teacher_assignment_id = $1 AND chapter_id = $2',
            [teacherAssignmentId, chapterId]
        );

        let generatedWorksheetId;
        if (existingWorksheet.rows.length > 0) {
            generatedWorksheetId = existingWorksheet.rows[0].id;
            console.log(`Worksheet already exists (ID: ${generatedWorksheetId}). Skipping generation.`);
        } else {
            // 4. Generate content with Gemini
            console.log(`Generating worksheet for Chapter ID: ${chapterId}, Assignment ID: ${teacherAssignmentId}`);
            const prompt = `
                You are an expert ${subject_name} teacher. Generate a worksheet with 10 questions for ${full_class_name} students based on the chapter: "${chapter_name}".
                Also provide a separate, detailed answer key. Format the output in Markdown with two sections: "# Worksheet: ${chapter_name}" and "# Answer Key".`;

            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
            const fullContent = response.text.trim();

            let worksheetContent = "Worksheet generation failed.", answerKeyContent = "No answer key generated.";
            if (fullContent.includes("# Answer Key")) {
                const parts = fullContent.split("# Answer Key");
                worksheetContent = parts[0].replace(`# Worksheet: ${chapter_name}`, "").trim();
                answerKeyContent = parts[1].trim();
            } else if (fullContent.includes("# Answer key")) {
                 const parts = fullContent.split("# Answer key");
                worksheetContent = parts[0].replace(`# Worksheet: ${chapter_name}`, "").trim();
                answerKeyContent = parts[1].trim();
            }
            else { worksheetContent = fullContent; }

            // 5. Save new worksheet
            const worksheetRes = await pool.query(
                `INSERT INTO generated_worksheets (teacher_assignment_id, chapter_id, worksheet_content, answer_key_content)
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [teacherAssignmentId, chapterId, worksheetContent, answerKeyContent]
            );
            generatedWorksheetId = worksheetRes.rows[0].id;
            console.log(`New worksheet generated and saved (ID: ${generatedWorksheetId}).`);
        }

        // 6. Get student emails
        const studentRes = await pool.query(
            `SELECT s.email FROM students s JOIN student_class_enrollments sce ON s.id = sce.student_id WHERE sce.section_id = $1 AND s.email IS NOT NULL AND s.email <> ''`,
            [section_id]
        );
        const studentEmails = studentRes.rows.map(r => r.email);

        // 7. Send email with Form link
        let emailsSentCount = 0;
        if (GOOGLE_FORM_BASE_URL && EMAIL_FIELD_ID && WORKSHEET_ID_FIELD_ID && !GOOGLE_FORM_BASE_URL.includes('YOUR_FORM_ID') && studentEmails.length > 0) {
            const worksheetData = await pool.query('SELECT worksheet_content FROM generated_worksheets WHERE id = $1', [generatedWorksheetId]);
            const worksheetContent = worksheetData.rows[0]?.worksheet_content || "Error: Worksheet content not found.";

            for (const email of studentEmails) {
                const prefilledLink = `${GOOGLE_FORM_BASE_URL}?usp=pp_url&${EMAIL_FIELD_ID}=${encodeURIComponent(email)}&${WORKSHEET_ID_FIELD_ID}=${generatedWorksheetId}`;

                const mailOptions = {
                    from: `"Sahayak App" <${process.env.EMAIL_USER}>`,
                    to: email,
                    subject: `New Worksheet for ${subject_name}: ${chapter_name}`,
                    text: `Hello!\n\nPlease find your new worksheet below. Submit your answers using the Google Form link provided.\n\n--- Worksheet ---\n${worksheetContent}\n\n--- Submission Link ---\n${prefilledLink}`,
                    html: `<p>Hello!</p><p>Please find your new worksheet below. Submit your answers using the Google Form link provided.</p><hr><h3>Worksheet: ${chapter_name}</h3><pre style="white-space: pre-wrap; word-wrap: break-word;">${worksheetContent}</pre><hr><h3><a href="${prefilledLink}">Click Here to Submit Your Answers</a></h3>`,
                };

                try {
                    await transporter.sendMail(mailOptions);
                    emailsSentCount++;
                } catch (err) {
                    console.error(`Failed to send worksheet to ${email}:`, err);
                }
            }
             console.log(`Attempted to send worksheet emails to ${emailsSentCount}/${studentEmails.length} students.`);
        } else {
             if (studentEmails.length === 0) console.log("No student emails found for this section.");
             else console.warn("Google Form URL/Field IDs not configured in .env, skipping email sending.");
        }

        res.status(201).json({
            message: `Chapter marked complete. Worksheet sent to ${emailsSentCount} student(s).`
        });

    } catch (error) {
        console.error('Error in markChapterComplete:', error);
        res.status(500).json({ message: 'Server error during chapter completion' });
    }
};


/**
 * Get a stored worksheet and answer key from the database.
 */
export const getWorksheet = async (req, res) => {
    const { teacherAssignmentId, chapterId } = req.params;
    const teacherId = req.user.id;

    try {
        // 1. Verify ownership
        const ownerCheck = await pool.query(
            'SELECT 1 FROM teacher_class_assignments WHERE id = $1 AND teacher_id = $2',
            [teacherAssignmentId, teacherId]
        );
        if (ownerCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // 2. Get the worksheet
        const query = `
            SELECT
                gw.worksheet_content,
                gw.answer_key_content,
                ch.chapter_name
            FROM generated_worksheets gw
            JOIN chapters ch ON gw.chapter_id = ch.id
            WHERE gw.teacher_assignment_id = $1 AND gw.chapter_id = $2;
        `;
        const { rows } = await pool.query(query, [teacherAssignmentId, chapterId]);

        if (rows.length === 0) {
             return res.status(404).json({ message: 'Worksheet has not been generated for this chapter yet.' });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error('Error fetching worksheet:', error);
        res.status(500).json({ message: 'Server error fetching worksheet' });
    }
};