// // import express from "express";
// // import PDFDocument from "pdfkit";
// // import pkg from "pg";
// // const { Pool } = pkg;

// // const router = express.Router();
// // const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// // // 🧾 Generate a single student's report card
// // router.get("/generate/:studentId", async (req, res) => {
// //   const { studentId } = req.params;

// //   try {
// //     // ✅ Correct joins via enrollment table
// //     const result = await pool.query(
// //       `SELECT 
// //          s.name, 
// //          s.email, 
// //          s.roll_number, 
// //          s.parent_contact,
// //          s.parent_name,
// //          c.class_name, 
// //          sec.section_name, 
// //          ay.year_name AS academic_year
// //        FROM students s
// //        LEFT JOIN student_class_enrollments e ON s.id = e.student_id
// //        LEFT JOIN sections sec ON e.section_id = sec.id
// //        LEFT JOIN classes c ON sec.class_id = c.id
// //        LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
// //        WHERE s.id = $1
// //        LIMIT 1;`,
// //       [studentId]
// //     );

// //     if (result.rows.length === 0) {
// //       return res.status(404).json({ message: "Student not found" });
// //     }

// //     const student = result.rows[0];

// //     // ✅ Generate PDF dynamically
// //     const doc = new PDFDocument({ margin: 50 });
// //     res.setHeader("Content-Type", "application/pdf");
// //     res.setHeader(
// //       "Content-Disposition",
// //       `attachment; filename=Report_${student.name.replace(/\s+/g, "_")}.pdf`
// //     );

// //     doc.pipe(res);

// //     // Title
// //     doc.fontSize(22).text("📘 Sahayak - Final Exam Report Card", { align: "center" });
// //     doc.moveDown(1.5);

// //     // Details
// //     doc.fontSize(14).text(`Name: ${student.name}`);
// //     doc.text(`Email: ${student.email}`);
// //     doc.text(`Roll No: ${student.roll_number}`);
// //     doc.text(`Class: ${student.class_name || "N/A"}`);
// //     doc.text(`Section: ${student.section_name || "N/A"}`);
// //     doc.text(`Academic Year: ${student.academic_year || "N/A"}`);
// //     doc.text(`Parent Contact: ${student.parent_contact || "N/A"}`);
// //     doc.moveDown(1.5);

// //     // Marks (to be integrated later)
// //     doc.fontSize(16).text("Final Exam Marks (Coming Soon)", { underline: true });
// //     doc.moveDown();
// //     doc.fontSize(12).text(
// //       "Subject-wise marks and remarks will appear here once marks tables are integrated."
// //     );

// //     // Footer
// //     doc.moveDown(3);
// //     doc.fontSize(12).text("______________________________", { align: "right" });
// //     doc.text("Class Teacher's Signature", { align: "right" });

// //     doc.end();
// //   } catch (err) {
// //     console.error("Error generating report:", err);
// //     res.status(500).json({ message: "Server error while generating report" });
// //   }
// // });

// // export default router;
// // backend/routes/reportRoutes.js
// import express from "express";
// import PDFDocument from "pdfkit";
// import pkg from "pg";
// const { Pool } = pkg;

// const router = express.Router();
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// // 🧾 Generate a single student's report card
// router.get("/generate/:studentId", async (req, res) => {
//   const { studentId } = req.params;

//   try {
//     const studentQuery = `
//       SELECT 
//         s.name, 
//         s.email, 
//         s.roll_number, 
//         s.parent_contact,
//         s.parent_name,
//         c.class_name, 
//         sec.section_name, 
//         ay.year_name AS academic_year
//       FROM students s
//       LEFT JOIN student_class_enrollments e ON s.id = e.student_id
//       LEFT JOIN sections sec ON e.section_id = sec.id
//       LEFT JOIN classes c ON sec.class_id = c.id
//       LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
//       WHERE s.id = $1
//       LIMIT 1;
//     `;
//     const studentResult = await pool.query(studentQuery, [studentId]);

//     if (studentResult.rows.length === 0) {
//       return res.status(404).json({ message: "Student not found" });
//     }

//     const student = studentResult.rows[0];

//     // Fetch marks for Final term
//     const marksQuery = `
//       SELECT subject, marks 
//       FROM student_marks 
//       WHERE student_id = $1 AND term = 'Final'
//       ORDER BY subject;
//     `;
//     const marksResult = await pool.query(marksQuery, [studentId]);
//     const marks = marksResult.rows;

//     // Create PDF
//     const doc = new PDFDocument({ margin: 50 });
//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=Report_${student.name.replace(/\s+/g, "_")}.pdf`
//     );
//     doc.pipe(res);

//     // Title
//     doc.fontSize(22).text("🏫 Sahayak Public School", { align: "center" });
//     doc.fontSize(18).text("Final Exam Report Card", { align: "center" });
//     doc.moveDown(2);

//     // Student Details
//     doc.fontSize(14).text(`Name: ${student.name}`);
//     doc.text(`Roll No: ${student.roll_number}`);
//     doc.text(`Class: ${student.class_name || "N/A"}`);
//     doc.text(`Section: ${student.section_name || "N/A"}`);
//     doc.text(`Academic Year: ${student.academic_year || "N/A"}`);
//     doc.text(`Parent Contact: ${student.parent_contact || "N/A"}`);
//     doc.moveDown(1.5);

//     // Marks section
//     doc.fontSize(16).text("Marks Summary", { underline: true });
//     doc.moveDown();

//     // Table
//     const tableTop = doc.y;
//     const tableLeft = 50;
//     const subjectColWidth = 250;
//     const marksColWidth = 100;

//     // Table headers
//     doc.fontSize(12).text("Subject", tableLeft, tableTop);
//     doc.text("Marks (out of 100)", tableLeft + subjectColWidth, tableTop);
//     doc.moveTo(tableLeft, tableTop + 15)
//       .lineTo(550, tableTop + 15)
//       .stroke();

//     // Table rows
//     let totalMarks = 0;
//     marks.forEach((row, index) => {
//       const y = tableTop + 25 + index * 20;
//       doc.text(row.subject, tableLeft, y);
//       doc.text(row.marks.toString(), tableLeft + subjectColWidth, y);
//       totalMarks += row.marks;
//     });

//     const maxMarks = marks.length * 100;
//     const percentage = ((totalMarks / maxMarks) * 100).toFixed(2);

//     doc.moveDown(3);

//     // Total & Percentage
//     doc.text(`Total Marks: ${totalMarks} / ${maxMarks}`);
//     doc.text(`Percentage: ${percentage}%`);
//     doc.moveDown(4);

//     // Signature lines
//     const signatureY = doc.y + 20;
//     doc.moveTo(100, signatureY).lineTo(200, signatureY).stroke();
//     doc.moveTo(250, signatureY).lineTo(350, signatureY).stroke();
//     doc.moveTo(400, signatureY).lineTo(500, signatureY).stroke();

//     doc.text("Parent", 120, signatureY + 5);
//     doc.text("Class Teacher", 265, signatureY + 5);
//     doc.text("Principal", 415, signatureY + 5);

//     doc.end();
//   } catch (err) {
//     console.error("Error generating report:", err);
//     res.status(500).json({ message: "Server error while generating report" });
//   }
// });

// export default router;

// backend/routes/reportRoutes.js
import express from "express";
import PDFDocument from "pdfkit";
import pkg from "pg";
import { Resend } from 'resend';
const { Pool } = pkg;

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// --- helpers ---
async function tableExists(client, fqName = "public.student_marks") {
  // Postgres helper: returns true if table exists
  const q = `SELECT to_regclass($1) AS exists;`;
  const r = await client.query(q, [fqName]);
  return r.rows[0]?.exists !== null;
}

function drawSignatureLines(doc, y) {
  doc.moveTo(90, y).lineTo(220, y).stroke();
  doc.moveTo(240, y).lineTo(370, y).stroke();
  doc.moveTo(390, y).lineTo(520, y).stroke();

  doc.fontSize(11);
  doc.text("Parent", 130, y + 5, { width: 100, align: "center" });
  doc.text("Class Teacher", 265, y + 5, { width: 120, align: "center" });
  doc.text("Principal", 430, y + 5, { width: 100, align: "center" });
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// --- DIAGNOSTICS: quickly check what DB returns for a student ---
router.get("/diagnose/:studentId", async (req, res) => {
  const { studentId } = req.params;
  try {
    const studentQuery = `
      SELECT 
        s.id,
        s.name, 
        s.email, 
        s.roll_number, 
        s.parent_contact,
        s.parent_name,
        c.class_name, 
        sec.section_name, 
        ay.year_name AS academic_year
      FROM students s
      LEFT JOIN student_class_enrollments e ON s.id = e.student_id
      LEFT JOIN sections sec ON e.section_id = sec.id
      LEFT JOIN classes c ON sec.class_id = c.id
      LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
      WHERE s.id = $1
      LIMIT 1;
    `;
    const studentResult = await pool.query(studentQuery, [studentId]);

    const marksTblExists = await tableExists(pool, "public.student_marks");
    let marks = [];
    let marksError = null;

    if (marksTblExists) {
      try {
       const marksQuery = `
  SELECT sub.subject_name AS subject, sm.marks
  FROM student_marks sm
  JOIN subjects sub ON sm.subject_id = sub.id
  WHERE sm.student_id = $1 AND sm.term = 'Final'
  ORDER BY sub.subject_name;
`;

        const marksRes = await pool.query(marksQuery, [studentId]);
        marks = marksRes.rows;
      } catch (e) {
        marksError = e.message;
      }
    }

    res.json({
      ok: true,
      studentFound: studentResult.rows.length > 0,
      student: studentResult.rows[0] || null,
      marksTableExists: marksTblExists,
      marksCount: marks.length,
      marksSample: marks.slice(0, 5),
      marksError
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- Generate a single student's report card (Final term) ---
router.get("/generate/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    // 1) Fetch student details
    const studentQuery = `
      SELECT 
        s.name, 
        s.email, 
        s.roll_number, 
        s.parent_contact,
        s.parent_name,
        c.class_name, 
        sec.section_name, 
        ay.year_name AS academic_year
      FROM students s
      LEFT JOIN student_class_enrollments e ON s.id = e.student_id
      LEFT JOIN sections sec ON e.section_id = sec.id
      LEFT JOIN classes c ON sec.class_id = c.id
      LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
      WHERE s.id = $1
      LIMIT 1;
    `;
    const studentResult = await pool.query(studentQuery, [studentId]);
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }
    const st = studentResult.rows[0];

    // 2) Fetch marks with JOIN subjects
    const marksQuery = `
      SELECT 
        sub.subject_name AS subject,
        sm.marks,
        sm.max_marks
      FROM student_marks sm
      JOIN subjects sub ON sm.subject_id = sub.id
      WHERE sm.student_id = $1 AND sm.term = 'Final'
      ORDER BY sub.subject_name;
    `;
    const marksRes = await pool.query(marksQuery, [studentId]);
    const marks = marksRes.rows || [];

    // 3) Begin PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Report_${st.name.replace(/\s+/g, "_")}.pdf`
    );
    doc.pipe(res);

    // Header
    doc.fontSize(22).text("🏫 Sahayak Public School", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(16).text("Final Examination – Report Card", { align: "center" });
    doc.moveDown(1.5);

    // Student info
    doc.fontSize(12);
    doc.text(`Name: ${st.name}`);
    doc.text(`Roll No: ${st.roll_number || "N/A"}`);
    doc.text(`Class: ${st.class_name || "N/A"}`);
    doc.text(`Section: ${st.section_name || "N/A"}`);
    doc.text(`Academic Year: ${st.academic_year || "N/A"}`);
    doc.text(`Parent: ${st.parent_name || "N/A"} (${st.parent_contact || "N/A"})`);
    doc.moveDown(1.4);

    // Marks table header
    doc.fontSize(14).text("Marks Summary", { underline: true });
    doc.moveDown(0.6);

    const left = 60;
    const col1 = 250;  // Subject column
    const col2 = 100;  // Marks
    const col3 = 100;  // Max Marks

    let y = doc.y;
    doc.fontSize(12).text("Subject", left, y);
    doc.text("Marks", left + col1, y);
    doc.text("Max Marks", left + col1 + col2, y);

    y += 16;
    doc.moveTo(left, y).lineTo(550, y).stroke();
    y += 8;

    // Table rows
    let total = 0;
    let maxTotal = 0;

    marks.forEach((m) => {
      doc.text(m.subject, left, y, { width: col1 });
      doc.text(String(m.marks), left + col1, y, { width: col2 });
      doc.text(String(m.max_marks), left + col1 + col2, y, { width: col3 });
      y += 20;

      total += Number(m.marks);
      maxTotal += Number(m.max_marks);
    });

    // Totals / percentage
    const pct = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(2) : "N/A";
    doc.moveDown(2);
    doc.text(`Total Marks: ${total} / ${maxTotal}`);
    doc.text(`Percentage: ${pct}${pct !== "N/A" ? "%" : ""}`);

    // Signature lines
    doc.moveDown(4);
    drawSignatureLines(doc, doc.y + 10);

    doc.end();
  } catch (err) {
    console.error("Report generation error:", err);
    res.status(500).json({ message: "Server error while generating report" });
  }
});


export default router;

// --- Send report via Resend (email with PDF attachment) ---
router.post('/send/:studentId', async (req, res) => {
  const { studentId } = req.params;

  try {
    // Fetch student and marks same as /generate
    const studentQuery = `
      SELECT 
        s.name, 
        s.email, 
        s.roll_number, 
        s.parent_contact,
        s.parent_name,
        s.parent_email,
        c.class_name, 
        sec.section_name, 
        ay.year_name AS academic_year
      FROM students s
      LEFT JOIN student_class_enrollments e ON s.id = e.student_id
      LEFT JOIN sections sec ON e.section_id = sec.id
      LEFT JOIN classes c ON sec.class_id = c.id
      LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
      WHERE s.id = $1
      LIMIT 1;
    `;
    const studentResult = await pool.query(studentQuery, [studentId]);
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const st = studentResult.rows[0];

    // get marks
    const marksQuery = `
      SELECT 
        sub.subject_name AS subject,
        sm.marks,
        sm.max_marks
      FROM student_marks sm
      JOIN subjects sub ON sm.subject_id = sub.id
      WHERE sm.student_id = $1 AND sm.term = 'Final'
      ORDER BY sub.subject_name;
    `;
    const marksRes = await pool.query(marksQuery, [studentId]);
    const marks = marksRes.rows || [];

    // generate PDF into buffer
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const endPromise = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // Build the PDF
    doc.fontSize(22).text('🏫 Sahayak Public School', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).text('Final Examination – Report Card', { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(12);
    doc.text(`Name: ${st.name}`);
    doc.text(`Roll No: ${st.roll_number || 'N/A'}`);
    doc.text(`Class: ${st.class_name || 'N/A'}`);
    doc.text(`Section: ${st.section_name || 'N/A'}`);
    doc.text(`Academic Year: ${st.academic_year || 'N/A'}`);
    doc.text(`Parent: ${st.parent_name || 'N/A'} (${st.parent_contact || 'N/A'})`);
    doc.moveDown(1.4);

    doc.fontSize(14).text('Marks Summary', { underline: true });
    doc.moveDown(0.6);
    const left = 60;
    const col1 = 250; const col2 = 100; const col3 = 100;
    let y = doc.y;
    doc.fontSize(12).text('Subject', left, y);
    doc.text('Marks', left + col1, y);
    doc.text('Max Marks', left + col1 + col2, y);
    y += 16;
    doc.moveTo(left, y).lineTo(550, y).stroke();
    y += 8;

    let total = 0; let maxTotal = 0;
    marks.forEach((m) => {
      doc.text(m.subject, left, y, { width: col1 });
      doc.text(String(m.marks), left + col1, y, { width: col2 });
      doc.text(String(m.max_marks), left + col1 + col2, y, { width: col3 });
      y += 20;
      total += Number(m.marks || 0);
      maxTotal += Number(m.max_marks || 0);
    });

    const pct = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(2) : 'N/A';
    doc.moveDown(2);
    doc.text(`Total Marks: ${total} / ${maxTotal}`);
    doc.text(`Percentage: ${pct}${pct !== 'N/A' ? '%' : ''}`);
    doc.moveDown(4);
    drawSignatureLines(doc, doc.y + 10);
    doc.end();

    const pdfBuffer = await endPromise;
    const filename = `Report_${st.name.replace(/\s+/g, '_')}.pdf`;

    // Determine recipient
    const recipient = st.parent_email || st.email;
    if (!recipient) {
      return res.status(400).json({ message: 'No parent or student email available to send report' });
    }

    if (!resendClient) {
      console.warn('Resend client not configured; returning PDF buffer for download instead');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      return res.send(pdfBuffer);
    }

    // Send email with attachment using Resend
    try {
      const sendRes = await resendClient.emails.send({
        from: process.env.EMAIL_FROM || 'no-reply@sahayak.app',
        to: recipient,
        subject: `Report Card - ${st.name}`,
        html: `<p>Dear ${st.parent_name || 'Parent'},</p><p>Please find attached the report card for ${st.name}.</p><p>Regards,<br/>Sahayak</p>`,
        attachments: [
          {
            type: 'application/pdf',
            name: filename,
            data: pdfBuffer.toString('base64')
          }
        ]
      });

  // Log successful send to server console (visible in VS Code terminal)
  console.log(`Report emailed: studentId=${studentId}, to=${recipient}, resendId=${sendRes?.id || 'N/A'}`);
  // Also log full resend response for debugging delivery status
  console.log('Resend response (raw):', JSON.stringify(sendRes, null, 2));

  // Return resend response to caller for debugging (trim sensitive fields if needed)
  return res.json({ success: true, message: `Email sent to ${recipient}`, resendId: sendRes?.id || null, resendResponse: sendRes });
    } catch (err) {
      console.error('Resend send error:', err);
      return res.status(500).json({ success: false, message: 'Failed to send email via Resend', error: err.message || String(err) });
    }

  } catch (err) {
    console.error('Error in /send/:studentId:', err);
    res.status(500).json({ message: 'Server error while sending report' });
  }
});
