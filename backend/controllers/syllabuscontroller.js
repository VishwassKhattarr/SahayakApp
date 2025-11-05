// backend/controllers/syllabusController.js
import { GoogleGenAI } from '@google/genai';
import pkg from 'pg';
import nodemailer from 'nodemailer';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// --- Nodemailer Setup ---
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // <-- Are these variable names correct?
  port: process.env.SMTP_PORT, // <-- Is this a number?
  secure: false,
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- Google Form Config ---
const GOOGLE_FORM_BASE_URL = process.env.GOOGLE_FORM_BASE_URL;
const EMAIL_FIELD_ID = process.env.GOOGLE_FORM_EMAIL_FIELD_ID;
const WORKSHEET_ID_FIELD_ID = process.env.GOOGLE_FORM_WORKSHEET_ID_FIELD_ID;

export const getTrackers = async (req, res) => {
    const teacherId = req.user.id; // From verifyToken middleware

    try {
        // --- THIS QUERY IS CORRECTED ---
        const query = `
            SELECT 
                tca.id as teacher_assignment_id,
                cls.class_name,
                sec.section_name,
                sub.subject_name,
                csj.id as class_subject_id,  -- Get class_subject_id from the class_subjects table
                (
                    SELECT COUNT(*)
                    FROM completion_status cs
                    WHERE cs.teacher_assignment_id = tca.id
                    AND cs.is_completed = true
                ) as chapters_completed,
                (
                    SELECT COUNT(*)
                    FROM chapters ch
                    WHERE ch.class_subject_id = csj.id -- Use the class_subject_id from the join
                ) as total_chapters
            FROM 
                teacher_class_assignments tca
            JOIN classes cls ON tca.class_id = cls.id
            JOIN sections sec ON tca.section_id = sec.id
            JOIN subjects sub ON tca.subject_id = sub.id
            -- ADDED: Join class_subjects to find the correct class_subject_id
            LEFT JOIN class_subjects csj ON tca.class_id = csj.class_id AND tca.subject_id = csj.subject_id
            WHERE 
                tca.teacher_id = $1
            AND tca.academic_year_id = (
                SELECT MAX(id)
                FROM academic_years
            );
        `;
        
        const { rows } = await pool.query(query, [teacherId]);
        
        const trackers = rows.map(row => ({
            ...row,
            full_class_name: `${row.class_name}-${row.section_name}`,
            // Handle null total_chapters if class_subject_id wasn't found
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
        // --- THIS QUERY IS CORRECTED ---
        const assignmentCheck = await pool.query(
            `SELECT csj.id as class_subject_id, -- Get class_subject_id from the join
                tca.section_id, 
                cls.class_name, 
                sec.section_name, 
                sub.subject_name
             FROM teacher_class_assignments tca
             JOIN classes cls ON tca.class_id = cls.id
             JOIN sections sec ON tca.section_id = sec.id
             JOIN subjects sub ON tca.subject_id = sub.id
             -- ADDED: Join class_subjects to find the correct class_subject_id
             LEFT JOIN class_subjects csj ON tca.class_id = csj.class_id AND tca.subject_id = csj.subject_id
             WHERE tca.id = $1 AND tca.teacher_id = $2`,
            [teacherAssignmentId, teacherId]
        );

        if (assignmentCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { class_subject_id, class_name, section_name, subject_name } = assignmentCheck.rows[0];

        // This check is important in case the LEFT JOIN didn't find a match
        if (!class_subject_id) {
            console.error(`No class_subject_id found for assignment ${teacherAssignmentId}`);
            return res.json({
                className: `${class_name}-${section_name}`,
                subjectName: subject_name,
                chapters: [] // Return empty chapters
            });
        }

        const query = `SELECT ch.id as chapter_id, ch.chapter_name, ch.chapter_order,
    COALESCE(cs.is_completed, false) as is_completed
FROM chapters ch
LEFT JOIN completion_status cs ON ch.id = cs.chapter_id AND cs.teacher_assignment_id = $1
WHERE ch.class_subject_id = $2
ORDER BY ch.chapter_order;`;
        const { rows } = await pool.query(query, [teacherAssignmentId, class_subject_id]);

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
 */
// export const markChapterComplete = async (req, res) => {
//     const { teacherAssignmentId, chapterId } = req.body;
//     const teacherId = req.user.id;

//     // ... (AI and Form checks are the same) ...
//     if (!ai) return res.status(500).json({ message: "AI service is not configured." });
//     if (!GOOGLE_FORM_BASE_URL || !EMAIL_FIELD_ID || !WORKSHEET_ID_FIELD_ID || GOOGLE_FORM_BASE_URL.includes('YOUR_FORM_ID')) {
//          console.error("ERROR: Google Form configuration is missing or incomplete in the .env file.");
//     }

//     try {
//         // 1. Verify ownership -- THIS QUERY IS CORRECTED
//         // Cleaned query using regular spaces for indentation
// const query = `
//     SELECT 
//         tca.section_id, 
//         cls.class_name, 
//         sec.section_name, 
//         sub.subject_name
//     FROM teacher_class_assignments tca
//     JOIN classes cls ON tca.class_id = cls.id
//     JOIN sections sec ON tca.section_id = sec.id
//     JOIN subjects sub ON tca.subject_id = sub.id
//     WHERE tca.id = $1 AND tca.teacher_id = $2
// `; // <-- Make sure all indentation here is manually typed

// // Add .trim() to remove the surrounding newlines/spaces
// const assignmentCheck = await pool.query(query.trim(), [
//     teacherAssignmentId,
//     teacherId
// ]);

//         if (assignmentCheck.rows.length === 0) return res.status(403).json({ message: 'Access denied' });

//         const { section_id, class_name, section_name, subject_name } = assignmentCheck.rows[0];
//         const full_class_name = `${class_name}-${section_name}`;

//         const chapterInfo = await pool.query('SELECT chapter_name FROM chapters WHERE id = $1', [chapterId]);
//         const chapter_name = chapterInfo.rows[0]?.chapter_name;
//         if (!chapter_name) return res.status(404).json({ message: 'Chapter not found' });

//         // 2. Mark as complete
//         await pool.query(
//             `INSERT INTO completion_status (teacher_assignment_id, chapter_id, is_completed, completed_at)
//               VALUES ($1, $2, true, NOW()) ON CONFLICT (teacher_assignment_id, chapter_id) DO UPDATE SET is_completed = true, completed_at = NOW();`,
//             [teacherAssignmentId, chapterId]
//         );

//         // 3. Check if worksheet exists
//         const existingWorksheet = await pool.query(
//             'SELECT id FROM generated_worksheets WHERE teacher_assignment_id = $1 AND chapter_id = $2',
//             [teacherAssignmentId, chapterId]
//         );

//         let generatedWorksheetId;
//         if (existingWorksheet.rows.length > 0) {
//             generatedWorksheetId = existingWorksheet.rows[0].id;
//             console.log(`Worksheet already exists (ID: ${generatedWorksheetId}). Skipping generation.`);
//         } else {
//             // 4. Generate content with Gemini
//             console.log(`Generating worksheet for Chapter ID: ${chapterId}, Assignment ID: ${teacherAssignmentId}`);
//             const prompt = `
//                 You are an expert ${subject_name} teacher. Generate a worksheet with 10 questions for ${full_class_name} students based on the chapter: "${chapter_name}".
//                 Also provide a separate, detailed answer key. Format the output in Markdown with two sections: "# Worksheet: ${chapter_name}" and "# Answer Key".`;
            
//             const model = ai.getGenerativeModel({ model: "gemini-pro" }); 
//             const result = await model.generateContent(prompt);
//             const response = await result.response;
//             const fullContent = response.text().trim();

//             let worksheetContent = "Worksheet generation failed.", answerKeyContent = "No answer key generated.";
//             if (fullContent.includes("# Answer Key")) {
//                 const parts = fullContent.split("# Answer Key");
//                 worksheetContent = parts[0].replace(`# Worksheet: ${chapter_name}`, "").trim();
//                 answerKeyContent = parts[1].trim();
//             } else if (fullContent.includes("# Answer key")) {
//                  const parts = fullContent.split("# Answer key");
//                 worksheetContent = parts[0].replace(`# Worksheet: ${chapter_name}`, "").trim();
//                 answerKeyContent = parts[1].trim();
//             }
//             else { worksheetContent = fullContent; }

//             // 5. Save new worksheet
//             const worksheetRes = await pool.query(
//                 `INSERT INTO generated_worksheets (teacher_assignment_id, chapter_id, worksheet_content, answer_key_content)
//               _  VALUES ($1, $2, $3, $4) RETURNING id`,
//                 [teacherAssignmentId, chapterId, worksheetContent, answerKeyContent]
//             );
//             generatedWorksheetId = worksheetRes.rows[0].id;
//             console.log(`New worksheet generated and saved (ID: ${generatedWorksheetId}).`);
//         }

//         // 6. Get student emails
//         const studentRes = await pool.query(
//             `SELECT s.email FROM students s JOIN student_class_enrollments sce ON s.id = sce.student_id WHERE sce.section_id = $1 AND s.email IS NOT NULL AND s.email <> ''`,
//             [section_id]
//         );
//         const studentEmails = studentRes.rows.map(r => r.email);

//          // 7. Send email with Form link
//         let emailsSentCount = 0;
//         if (GOOGLE_FORM_BASE_URL && EMAIL_FIELD_ID && WORKSHEET_ID_FIELD_ID && !GOOGLE_FORM_BASE_URL.includes('YOUR_FORM_ID') && studentEmails.length > 0) {
//             const worksheetData = await pool.query('SELECT worksheet_content FROM generated_worksheets WHERE id = $1', [generatedWorksheetId]);
//             const worksheetContent = worksheetData.rows[0]?.worksheet_content || "Error: Worksheet content not found.";

//             for (const email of studentEmails) {
//                 const prefilledLink = `${GOOGLE_FORM_BASE_URL}?usp=pp_url&${EMAIL_FIELD_ID}=${encodeURIComponent(email)}&${WORKSHEET_ID_FIELD_ID}=${generatedWorksheetId}`;

//                 const mailOptions = {
//                     from: `"Sahayak App" <${process.env.EMAIL_USER}>`,
//                     to: email,
//                     subject: `New Worksheet for ${subject_name}: ${chapter_name}`,
//                     text: `Hello!\n\nPlease find your new worksheet below. Submit your answers using the Google Form link provided.\n\n--- Worksheet ---\n${worksheetContent}\n\n--- Submission Link ---\n${prefilledLink}`,
//                     html: `<p>Hello!</p><p>Please find your new worksheet below. Submit your answers using the Google Form link provided.</p><hr><h3>Worksheet: ${chapter_name}</h3><pre style="white-space: pre-wrap; word-wrap: break-word;">${worksheetContent}</pre><hr><h3><a href="${prefilledLink}">Click Here to Submit Your Answers</a></h3>`,
//                 };

//                 try {
//                     await transporter.sendMail(mailOptions);
//                     emailsSentCount++;
//                 } catch (err) {
//                     console.error(`Failed to send worksheet to ${email}:`, err);
// _               }
//             }
//              console.log(`Attempted to send worksheet emails to ${emailsSentCount}/${studentEmails.length} students.`);
//         } else {
//              if (studentEmails.length === 0) console.log("No student emails found for this section.");
//              else console.warn("Google Form URL/Field IDs not configured in .env, skipping email sending.");
//         }

//         res.status(201).json({
//             message: `Chapter marked complete. Worksheet sent to ${emailsSentCount} student(s).`
//         });

//     } catch (error) {
//         console.error('Error in markChapterComplete:', error);
//         res.status(500).json({ message: 'Server error during chapter completion' });
//     }
// };
export const markChapterComplete = async (req, res) => {
    const { teacherAssignmentId, chapterId } = req.body;
    const teacherId = req.user.id;

    if (!ai) return res.status(500).json({ message: "AI service is not configured." });
    if (!GOOGLE_FORM_BASE_URL || !EMAIL_FIELD_ID || !WORKSHEET_ID_FIELD_ID || GOOGLE_FORM_BASE_URL.includes('YOUR_FORM_ID')) {
        console.error("ERROR: Google Form configuration is missing or incomplete in the .env file.");
    }

    // Helper to extract text safely from different client result shapes
    const extractText = (result) => {
        if (!result) return '';
        // common shapes:
        // 1) { response: { text: '...' } }
        // 2) { text: '...' }
        // 3) { output: [{ content: '...' }] }  (less likely here)
        if (result.response && typeof result.response.text === 'string') return result.response.text;
        if (typeof result.text === 'string') return result.text;
        if (Array.isArray(result.output) && result.output[0] && typeof result.output[0].content === 'string') return result.output[0].content;
        // fallback to JSON stringify
        return JSON.stringify(result);
    };

    // Escape regex special chars for chapter name if used in regex
    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    try {
        // 1. Verify ownership
        const assignmentCheck = await pool.query(
            `SELECT 
                tca.section_id, 
                cls.class_name, 
                sec.section_name, 
                sub.subject_name
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
            // 4. Generate content with AI (robust multi-client handling)
            console.log(`Generating worksheet for Chapter ID: ${chapterId}, Assignment ID: ${teacherAssignmentId}`);
            const prompt = `
                You are an expert ${subject_name} teacher. Generate a worksheet with 10 questions for ${full_class_name} students based on the chapter: "${chapter_name}".
                Also provide a separate, detailed answer key. Format the output in Markdown with two sections: "# Worksheet: ${chapter_name}" and "# Answer Key".`;

            // Adaptive call depending on client API
            let fullContent = '';
            try {
                if (typeof ai.getGenerativeModel === 'function') {
                    // older/newer client exposing getGenerativeModel()
                    const model = ai.getGenerativeModel({ model: "gemini-pro" });
                    const result = await model.generateContent(prompt);
                    fullContent = extractText(result).trim();
                } else if (ai.models && typeof ai.models.generateContent === 'function') {
                    // client with models.generateContent({ model, contents })
                    const result = await ai.models.generateContent({ model: "gemini-pro", contents: prompt });
                    fullContent = extractText(result).trim();
                } else if (typeof ai.generateContent === 'function') {
                    // client with direct generateContent(prompt)
                    const result = await ai.generateContent(prompt);
                    fullContent = extractText(result).trim();
                } else if (typeof ai.generate === 'function') {
                    // fallback generic generate
                    const result = await ai.generate(prompt);
                    fullContent = extractText(result).trim();
                } else {
                    throw new Error('Unsupported AI client interface - cannot generate content');
                }
            } catch (aiErr) {
                console.error('AI generation failed:', aiErr);
                fullContent = ''; // continue but we will store fallback content
            }

            let worksheetContent = "Worksheet generation failed.", answerKeyContent = "No answer key generated.";

            if (fullContent) {
                // Case-insensitive detection of the answer-key heading
                const ansKeyRegex = /#\s*answer\s*key/i;
                if (ansKeyRegex.test(fullContent)) {
                    const parts = fullContent.split(ansKeyRegex);
                    // parts[0] contains everything before the match, parts[1] after
                    worksheetContent = parts[0].replace(new RegExp(`#\\s*Worksheet:\\s*${escapeRegex(chapter_name)}`, 'i'), '').trim();
                    answerKeyContent = parts[1].trim();
                } else {
                    // try explicit "# Answer Key" with exact casing as fallback
                    const idx = fullContent.indexOf('# Answer Key');
                    if (idx !== -1) {
                        worksheetContent = fullContent.slice(0, idx).replace(`# Worksheet: ${chapter_name}`, '').trim();
                        answerKeyContent = fullContent.slice(idx + '# Answer Key'.length).trim();
                    } else {
                        // No split found, keep full content as worksheet
                        worksheetContent = fullContent;
                    }
                }
            }

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

        // 7. Send email with Form link (if configured)
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
        // Basic validation
        if (!teacherAssignmentId || !chapterId || isNaN(parseInt(teacherAssignmentId)) || isNaN(parseInt(chapterId))) {
            return res.status(400).json({ message: 'Invalid assignment or chapter ID.' });
        }

        // 1. Verify ownership
        const ownerCheck = await pool.query(
            'SELECT 1 FROM teacher_class_assignments WHERE id = $1 AND teacher_id = $2',
            [teacherAssignmentId, teacherId]
        );
        if (ownerCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // 2. Get the worksheet - clean query string and trim to avoid stray whitespace/hidden chars
        const query = `
            SELECT
                gw.worksheet_content,
                gw.answer_key_content,
                ch.chapter_name
            FROM generated_worksheets gw
            JOIN chapters ch ON gw.chapter_id = ch.id
            WHERE gw.teacher_assignment_id = $1 AND gw.chapter_id = $2;
        `.trim();

        const result = await pool.query(query, [teacherAssignmentId, chapterId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Worksheet has not been generated for this chapter yet.' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching worksheet:', error);
        res.status(500).json({ message: 'Server error fetching worksheet' });
    }
};