import express from "express";
import PDFDocument from "pdfkit";
import pkg from "pg";
const { Pool } = pkg;

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 🧾 Generate a single student's report card
router.get("/generate/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    // ✅ Correct joins via enrollment table
    const result = await pool.query(
      `SELECT 
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
       LIMIT 1;`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const student = result.rows[0];

    // ✅ Generate PDF dynamically
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Report_${student.name.replace(/\s+/g, "_")}.pdf`
    );

    doc.pipe(res);

    // Title
    doc.fontSize(22).text("📘 Sahayak - Final Exam Report Card", { align: "center" });
    doc.moveDown(1.5);

    // Details
    doc.fontSize(14).text(`Name: ${student.name}`);
    doc.text(`Email: ${student.email}`);
    doc.text(`Roll No: ${student.roll_number}`);
    doc.text(`Class: ${student.class_name || "N/A"}`);
    doc.text(`Section: ${student.section_name || "N/A"}`);
    doc.text(`Academic Year: ${student.academic_year || "N/A"}`);
    doc.text(`Parent Contact: ${student.parent_contact || "N/A"}`);
    doc.moveDown(1.5);

    // Marks (to be integrated later)
    doc.fontSize(16).text("Final Exam Marks (Coming Soon)", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(
      "Subject-wise marks and remarks will appear here once marks tables are integrated."
    );

    // Footer
    doc.moveDown(3);
    doc.fontSize(12).text("______________________________", { align: "right" });
    doc.text("Class Teacher's Signature", { align: "right" });

    doc.end();
  } catch (err) {
    console.error("Error generating report:", err);
    res.status(500).json({ message: "Server error while generating report" });
  }
});

export default router;
