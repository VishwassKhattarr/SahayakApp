// backend/controllers/syllabusController.js
import { GoogleGenAI } from '@google/genai';
import pkg from 'pg';
import nodemailer from 'nodemailer';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// --- Nodemailer Setup ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Your App Password
    },
});

// --- Google Form Config from .env ---
const GOOGLE_FORM_BASE_URL = process.env.GOOGLE_FORM_BASE_URL;
const EMAIL_FIELD_ID = process.env.GOOGLE_FORM_EMAIL_FIELD_ID;
const WORKSHEET_ID_FIELD_ID = process.env.GOOGLE_FORM_WORKSHEET_ID_FIELD_ID;

/**
 * Get all syllabus trackers (teacher assignments) for the logged-in teacher.
 */
export const getTrackers = async (req, res) => {
    const teacherId = req.user.id; // From verifyToken middleware

    try {
        // Query teacher_class_assignments and join to get names
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

        // Calculate percentage and format a full class name
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
        // First, verify this teacher owns this assignment
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

        // Get all chapters for this subject and their completion status for this assignment
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
 * Mark chapter complete, generate/save worksheet if needed, send email with Form link.
 */
export const markChapterComplete = async (req, res) => {
    const { teacherAssignmentId, chapterId } = req.body;
    const teacherId = req.user.id;

    if (!ai) return res.status(500).json({ message: "AI service is not configured." });
    // Check if Google Form configuration is loaded from .env
    if (!GOOGLE_FORM_BASE_URL || !EMAIL_FIELD_ID || !WORKSHEET_ID_FIELD_ID || GOOGLE_FORM_BASE_URL.includes('YOUR_FORM_ID')) {
         console.error("ERROR: Google Form configuration is missing or incomplete in the .env file.");
         // Don't prevent marking complete, but skip sending emails.
         // You could choose to return an error here instead if sending is mandatory.
         // return res.status(500).json({ message: "Server configuration error: Google Form details missing." });
    }


    try {
        // 1. Verify ownership and get data
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

        // 2. Mark as complete in DB
        await pool.query(
            `INSERT INTO completion_status (teacher_assignment_id, chapter_id, is_completed, completed_at)
             VALUES ($1, $2, true, NOW()) ON CONFLICT (teacher_assignment_id, chapter_id) DO UPDATE SET is_completed = true, completed_at = NOW();`,
            [teacherAssignmentId, chapterId]
        );

        // 3. Check if a worksheet already exists to avoid re-generating
        const existingWorksheet = await pool.query(
            'SELECT id FROM generated_worksheets WHERE teacher_assignment_id = $1 AND chapter_id = $2',
            [teacherAssignmentId, chapterId]
        );

        let generatedWorksheetId;
        if (existingWorksheet.rows.length > 0) {
            generatedWorksheetId = existingWorksheet.rows[0].id;
            console.log(`Worksheet already exists (ID: ${generatedWorksheetId}). Skipping generation.`);
        } else {
            // 4. Generate content with Gemini if it doesn't exist
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

            // 5. Save new worksheet to DB
            const worksheetRes = await pool.query(
                `INSERT INTO generated_worksheets (teacher_assignment_id, chapter_id, worksheet_content, answer_key_content)
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [teacherAssignmentId, chapterId, worksheetContent, answerKeyContent]
            );
            generatedWorksheetId = worksheetRes.rows[0].id;
            console.log(`New worksheet generated and saved (ID: ${generatedWorksheetId}).`);
        }

        // 6. Get student emails for this section
        const studentRes = await pool.query(
            `SELECT s.email FROM students s JOIN student_class_enrollments sce ON s.id = sce.student_id WHERE sce.section_id = $1 AND s.email IS NOT NULL AND s.email <> ''`, // Added check for non-empty email
            [section_id]
        );
        const studentEmails = studentRes.rows.map(r => r.email);

        // 7. Send worksheet email with Google Form link to each student (if configured)
        let emailsSentCount = 0;
        if (GOOGLE_FORM_BASE_URL && EMAIL_FIELD_ID && WORKSHEET_ID_FIELD_ID && !GOOGLE_FORM_BASE_URL.includes('YOUR_FORM_ID') && studentEmails.length > 0) {
            const worksheetData = await pool.query('SELECT worksheet_content FROM generated_worksheets WHERE id = $1', [generatedWorksheetId]);
            const worksheetContent = worksheetData.rows[0]?.worksheet_content || "Error: Worksheet content not found.";

            for (const email of studentEmails) {
                // Construct prefilled link using variables from .env
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
             if (studentEmails.length === 0) {
                 console.log("No student emails found for this section to send worksheets to.");
             } else {
                 console.warn("Google Form URL/Field IDs not configured in .env, skipping email sending.");
             }
        }

        // 8. Return a success message to the teacher
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
        // 1. Verify this teacher owns the assignment (for security)
        const ownerCheck = await pool.query(
            'SELECT 1 FROM teacher_class_assignments WHERE id = $1 AND teacher_id = $2',
            [teacherAssignmentId, teacherId]
        );
        if (ownerCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // 2. Get the worksheet content and chapter name
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
            // Check if the chapter is complete but worksheet generation failed/pending
             const completionCheck = await pool.query(
                'SELECT 1 FROM completion_status WHERE teacher_assignment_id = $1 AND chapter_id = $2 AND is_completed = true',
                [teacherAssignmentId, chapterId]
             );
             if(completionCheck.rows.length > 0){
                 return res.status(404).json({ message: 'Worksheet exists but content is missing or generation failed previously.' });
             } else {
                 return res.status(404).json({ message: 'Worksheet has not been generated for this chapter yet.' });
             }
        }

        res.json(rows[0]);

    } catch (error) {
        console.error('Error fetching worksheet:', error);
        res.status(500).json({ message: 'Server error fetching worksheet' });
    }
};

// --- Also keep the submissionController functions below ---

// --- Main Webhook Handler ---
export const handleGoogleFormWebhook = async (req, res) => {
    // Check if body exists and has expected properties
    if (!req.body || typeof req.body !== 'object') {
        console.error('Webhook received invalid or empty body');
        return res.status(400).send('Invalid request body.');
    }

    const { studentEmail, generatedWorksheetId, answers } = req.body;

    // Validate essential fields
    if (!studentEmail || typeof studentEmail !== 'string') {
        console.error('Webhook received missing or invalid studentEmail:', studentEmail);
        return res.status(400).send('Missing or invalid studentEmail.');
    }
     if (!generatedWorksheetId || isNaN(parseInt(generatedWorksheetId))) {
        console.error('Webhook received missing or invalid generatedWorksheetId:', generatedWorksheetId);
        return res.status(400).send('Missing or invalid generatedWorksheetId.');
    }
    if (!answers || typeof answers !== 'object' || typeof answers.full_text !== 'string') { // Check if full_text is a string
         console.error('Webhook received missing or invalid answers structure:', answers);
        return res.status(400).send('Missing or invalid answers structure (expected object with full_text string).');
    }


    try {
        // 1. Find the student by email
        const studentRes = await pool.query('SELECT id FROM students WHERE email = $1', [studentEmail]);
        if (studentRes.rows.length === 0) {
            console.error(`Submission from unknown student email: ${studentEmail}`);
            // Consider creating a student record or logging more formally?
            return res.status(404).send('Student not found.');
        }
        const studentId = studentRes.rows[0].id;

        // 2. Save the initial submission (or update if re-submitting)
        const answersText = answers.full_text || ''; // Use the text from the form

        const submissionRes = await pool.query(
            `INSERT INTO worksheet_submissions (student_id, generated_worksheet_id, student_answers_raw)
             VALUES ($1, $2, $3)
             ON CONFLICT (student_id, generated_worksheet_id)
             DO UPDATE SET
                student_answers_raw = EXCLUDED.student_answers_raw,
                submitted_at = NOW(),
                is_likely_ai_generated = NULL, -- Reset flags on re-submission
                ai_detection_details = NULL,
                ai_evaluation_details = NULL,
                ai_assigned_marks = NULL,
                feedback_sent_to_student_at = NULL
             RETURNING id`,
            [studentId, parseInt(generatedWorksheetId), answersText] // Ensure ID is integer
        );
        const submissionId = submissionRes.rows[0].id;
        console.log(`Submission ${submissionId} received/updated for student ${studentId}, worksheet ${generatedWorksheetId}.`);

        // 3. Trigger the full processing asynchronously
        processSubmission(submissionId); // Fire-and-forget

        // 4. Immediately tell Google "we got it"
        console.log(`Webhook processed successfully for submission ${submissionId}.`);
        res.status(200).send('Submission received and is being processed.');

    } catch (error) {
        console.error(`Error in webhook handler for worksheet ${generatedWorksheetId}, student ${studentEmail}:`, error);
        res.status(500).send('Internal server error processing submission.');
    }
};

// --- Asynchronous Processing Function ---
async function processSubmission(submissionId) {
    console.log(`Starting background processing for submission ${submissionId}...`);
    try {
        const submissionDataRes = await pool.query('SELECT student_answers_raw FROM worksheet_submissions WHERE id = $1', [submissionId]);
         if (submissionDataRes.rows.length === 0) {
            console.error(`processSubmission: Submission ${submissionId} not found.`);
            return;
        }
        const answersText = submissionDataRes.rows[0].student_answers_raw;

        // 1. AI Content Detection
        let aiDetectionResult = { is_likely_ai_generated: null, details: 'Detection not run or failed.' };
        if (ai && answersText && answersText.length > 50) { // Basic check if text is substantial enough
             try {
                console.log(`Running AI detection for submission ${submissionId}...`);
                const detectionPrompt = `Analyze the following text and determine the likelihood that it was generated by an AI. Provide ONLY a JSON object with keys "is_likely_ai_generated" (boolean), "confidence_score" (float 0-1), "reasoning" (string).\n\nText:\n${answersText}`;
                const detectionResponse = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: detectionPrompt });
                let rawJsonResponse = detectionResponse.text.trim().replace(/```json\n?|\n?```/g, '');
                const parsedResponse = JSON.parse(rawJsonResponse);
                aiDetectionResult = {
                    is_likely_ai_generated: parsedResponse.is_likely_ai_generated ?? null,
                    details: `Confidence: ${parsedResponse.confidence_score?.toFixed(2)}. Reasoning: ${parsedResponse.reasoning}`
                };
                 console.log(`AI detection complete for submission ${submissionId}. Result: ${JSON.stringify(aiDetectionResult)}`);
            } catch (e) {
                console.error(`AI detection parsing failed for submission ${submissionId}:`, e);
                 aiDetectionResult.details = `Detection failed: ${e.message}`;
            }
        } else {
             console.log(`Skipping AI detection for submission ${submissionId} (AI not configured or text too short).`);
             aiDetectionResult.details = 'Skipped: AI not configured or text too short.';
        }


        await pool.query(
            'UPDATE worksheet_submissions SET is_likely_ai_generated = $1, ai_detection_details = $2 WHERE id = $3',
            [aiDetectionResult.is_likely_ai_generated, aiDetectionResult.details, submissionId]
        );

        // 2. AI Evaluation
        const evalData = await getEvaluationContext(submissionId);
        if (!evalData) {
             console.error(`Could not get evaluation context for submission ${submissionId}. Aborting evaluation.`);
             return;
        }

        console.log(`Running AI evaluation for submission ${submissionId}...`);
        const evaluationPrompt = createEvaluationPrompt(evalData, aiDetectionResult);
        const evalResponse = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: evaluationPrompt });
        const evaluationDetails = evalResponse.text.trim();

        let assignedMarks = "Needs Review"; // Default if parsing fails
        // Improved parsing for score: case-insensitive, allows space, optional decimal
        const scoreMatch = evaluationDetails.match(/Total Score:\s*([\d\.]+\s*\/\s*\d+)/i);
        if (scoreMatch) {
             assignedMarks = scoreMatch[1].replace(/\s+/g, ''); // Remove spaces like "8 / 10" -> "8/10"
        } else {
             console.warn(`Could not parse score from evaluation for submission ${submissionId}. Raw details: ${evaluationDetails.substring(0, 100)}...`);
        }
        console.log(`AI evaluation complete for submission ${submissionId}. Marks: ${assignedMarks}`);

        await pool.query(
            'UPDATE worksheet_submissions SET ai_evaluation_details = $1, ai_assigned_marks = $2 WHERE id = $3',
            [evaluationDetails, assignedMarks, submissionId]
        );

        // 3. Send Feedback Email
        console.log(`Triggering feedback email for submission ${submissionId}...`);
        await sendFeedbackEmail(submissionId);

    } catch (error) {
        console.error(`Background processing failed for submission ${submissionId}:`, error);
        try {
            // Attempt to mark the submission as having an error
            await pool.query(
                `UPDATE worksheet_submissions SET ai_evaluation_details = $1, ai_assigned_marks = 'Error' WHERE id = $2`,
                [`Evaluation failed: ${error.message}`, submissionId]
            );
        } catch (dbError) {
             console.error(`Failed to update submission ${submissionId} status to Error:`, dbError);
        }
    }
}

// --- Helper Functions ---

async function getEvaluationContext(submissionId) {
    try {
        const result = await pool.query(`
            SELECT ws.student_answers_raw, gw.worksheet_content, gw.answer_key_content, ch.chapter_name, sub.subject_name, s.email as student_email
            FROM worksheet_submissions ws
            JOIN generated_worksheets gw ON ws.generated_worksheet_id = gw.id
            JOIN chapters ch ON gw.chapter_id = ch.id
            JOIN subjects sub ON ch.subject_id = sub.id
            JOIN students s ON ws.student_id = s.id
            WHERE ws.id = $1
        `, [submissionId]);
         if (result.rows.length === 0) return null; // Handle case where submission might be deleted mid-process
        return result.rows[0];
    } catch(error) {
        console.error(`Error fetching evaluation context for submission ${submissionId}:`, error);
        return null;
    }
}

function createEvaluationPrompt(data, detectionResult) {
    let aiCheckInfo = `AI Content Check: ${detectionResult.details || 'Not performed or failed.'}`;

    // Ensure data properties exist before using them
    const subjectName = data.subject_name || 'the subject';
    const chapterName = data.chapter_name || 'this chapter';
    const worksheetContent = data.worksheet_content || '[Worksheet content not found]';
    const answerKeyContent = data.answer_key_content || '[Answer key not found]';
    const studentAnswers = data.student_answers_raw || '[Student answers not found]';

    return `
        Act as a helpful ${subjectName} teacher evaluating a student's worksheet submission for the chapter "${chapterName}".

        Original Questions:
        ${worksheetContent}

        Correct Answer Key:
        ${answerKeyContent}

        Student's Submitted Answers:
        ${studentAnswers}

        ${aiCheckInfo}

        Please evaluate the student's answers based on the answer key. For each question:
        1. Briefly state if the answer is correct, partially correct, or incorrect.
        2. Provide concise feedback explaining why.

        Finally, provide a "Total Score" (e.g., "Total Score: 8/10") and "Overall Remarks" summarizing performance. If the content check indicated AI generation, add a brief, non-accusatory note like "Remember to try and use your own words for future assignments." Prioritize feedback based on correctness.
        Format your response clearly. Start with "Total Score:", then "Overall Remarks:", followed by the detailed question-by-question evaluation.
    `;
}

async function sendFeedbackEmail(submissionId) {
    const data = await getEvaluationContext(submissionId);
    if (!data || !data.student_email) {
         console.error(`Cannot send feedback for submission ${submissionId}: Missing data or student email.`);
         return;
    }
    const evalResult = await pool.query('SELECT ai_assigned_marks, ai_evaluation_details FROM worksheet_submissions WHERE id = $1', [submissionId]);
    if (evalResult.rows.length === 0 || !evalResult.rows[0].ai_evaluation_details) {
         console.error(`Cannot send feedback for submission ${submissionId}: Evaluation details not found.`);
         return;
    }
    const { ai_assigned_marks, ai_evaluation_details } = evalResult.rows[0];

    const mailOptions = {
        from: `"Sahayak App" <${process.env.EMAIL_USER}>`,
        to: data.student_email,
        subject: `Feedback for your worksheet on "${data.chapter_name}"`,
        // Use pre-wrap for plain text to preserve line breaks
        text: `Hello,\n\nHere is the feedback for your recent submission.\n\nScore: ${ai_assigned_marks || 'N/A'}\n\n--- Detailed Feedback ---\n${ai_evaluation_details}\n\nRegards,\nSahayak Platform`,
        // Use pre tag and style for HTML to preserve formatting from Gemini
        html: `<p>Hello,</p><p>Here is the feedback for your recent submission.</p><p><b>Score: ${ai_assigned_marks || 'N/A'}</b></p><hr><p><b>Detailed Feedback:</b></p><pre style="white-space: pre-wrap; word-wrap: break-word; font-family: sans-serif;">${ai_evaluation_details}</pre><hr><p>Regards,<br>Sahayak Platform</p>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        await pool.query('UPDATE worksheet_submissions SET feedback_sent_to_student_at = NOW() WHERE id = $1', [submissionId]);
        console.log(`Feedback email sent successfully for submission ${submissionId} to ${data.student_email}.`);
    } catch (error) {
        console.error(`Failed to send feedback email for submission ${submissionId} to ${data.student_email}:`, error);
        // Consider adding a retry mechanism or logging this failure more permanently
    }
}


// --- Teacher-Facing API Function ---
export const getSubmissionsForChapter = async (req, res) => {
    const { teacherAssignmentId, chapterId } = req.params;
    const teacherId = req.user.id;

     // Validate inputs
    if (isNaN(parseInt(teacherAssignmentId)) || isNaN(parseInt(chapterId))) {
        return res.status(400).json({ message: 'Invalid assignment or chapter ID.' });
    }


    try {
        // Security check: Does this teacher own this assignment?
        const ownerCheck = await pool.query('SELECT section_id FROM teacher_class_assignments WHERE id = $1 AND teacher_id = $2', [teacherAssignmentId, teacherId]);
        if (ownerCheck.rows.length === 0) return res.status(403).json({ message: 'Access denied to this assignment.' });
         const sectionId = ownerCheck.rows[0].section_id;

        // Find the specific generated_worksheet_id for this assignment/chapter
         const worksheetCheck = await pool.query('SELECT id FROM generated_worksheets WHERE teacher_assignment_id = $1 AND chapter_id = $2', [teacherAssignmentId, chapterId]);
         let generatedWorksheetId = null;
         if (worksheetCheck.rows.length > 0) {
             generatedWorksheetId = worksheetCheck.rows[0].id;
         } else {
             // If no worksheet exists, we still want to show students, but they won't have submissions
             console.log(`No worksheet found for assignment ${teacherAssignmentId}, chapter ${chapterId}. Listing students only.`);
         }


        // Fetch students enrolled in the section and LEFT JOIN their submission (if it exists for this worksheet)
        // ✅ MODIFICATION: Added student_answers_raw and ai_evaluation_details
        const query = `
            SELECT
                s.id as student_id,
                s.name as student_name,
                s.roll_number, -- Assuming roll_number in students table is the main one
                ws.id as submission_id,
                ws.submitted_at,
                ws.ai_assigned_marks,
                ws.is_likely_ai_generated,
                ws.student_answers_raw,
                ws.ai_evaluation_details
            FROM students s
            JOIN student_class_enrollments sce ON s.id = sce.student_id
            LEFT JOIN worksheet_submissions ws ON s.id = ws.student_id AND ws.generated_worksheet_id = $2 -- Join on specific worksheet ID
            WHERE sce.section_id = $1 -- Filter students by the section of the assignment
            ORDER BY s.roll_number; -- Order by student roll number
        `;

        // Pass sectionId and potentially null generatedWorksheetId
        const { rows } = await pool.query(query, [sectionId, generatedWorksheetId]);
        res.json(rows);

    } catch (error) {
        console.error(`Error getting submissions for chapter ${chapterId}, assignment ${teacherAssignmentId}:`, error);
        res.status(500).json({ message: 'Server error retrieving submissions' });
    }
};