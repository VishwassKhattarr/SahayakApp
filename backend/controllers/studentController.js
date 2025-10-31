// // // import pkg from 'pg';
// // // const { Pool } = pkg;
// // // const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// // // export const getAllStudents = async (req, res) => {
// // //   try {
// // //     const { class_id } = req.query;
// // //     const params = [];
// // //     let query = `
// // //       SELECT s.id, s.name, s.email, s.roll_number, s.parent_contact,
// // //              c.class_name, sec.section_name
// // //       FROM students s
// // //       LEFT JOIN classes c ON s.class_id = c.id
// // //       LEFT JOIN sections sec ON s.section_id = sec.id
// // //     `;

// // //     if (class_id) {
// // //       query += ' WHERE s.class_id = $1';
// // //       params.push(class_id);
// // //     }

// // //     query += ' ORDER BY s.id;';

// // //     const result = await pool.query(query, params);
// // //     res.json({ success: true, students: result.rows });
// // //   } catch (err) {
// // //     console.error('Error fetching students:', err);
// // //     res.status(500).json({ success: false, message: 'Server error fetching students' });
// // //   }
// // // };

// // import pkg from 'pg';
// // const { Pool } = pkg;
// // const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// // export const getAllStudents = async (req, res) => {
// //   try {
// //     const { class_id } = req.query;
// //     const params = [];

// //     let query = `
// //       SELECT 
// //         s.id, 
// //         s.name, 
// //         s.email, 
// //         s.roll_number, 
// //         s.parent_name, 
// //         s.parent_contact, 
// //         s.parent_email,
// //         c.class_name, 
// //         sec.section_name,
// //         ay.year_name AS academic_year
// //       FROM students s
// //       LEFT JOIN student_class_enrollments e ON s.id = e.student_id
// //       LEFT JOIN sections sec ON e.section_id = sec.id
// //       LEFT JOIN classes c ON sec.class_id = c.id
// //       LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
// //     `;

// //     if (class_id) {
// //       query += ` WHERE c.id = $1`;
// //       params.push(class_id);
// //     }

// //     query += ` ORDER BY s.id;`;

// //     const result = await pool.query(query, params);

// //     res.json({ success: true, students: result.rows });
// //   } catch (err) {
// //     console.error('❌ Error fetching students:', err);
// //     res.status(500).json({ success: false, message: 'Server error fetching students' });
// //   }
// // };


// import pkg from "pg";
// const { Pool } = pkg;
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// export const getAllStudents = async (req, res) => {
//   try {
//     const { class_id } = req.query;
//     const params = [];
//     let query = `
//       SELECT 
//         s.id,
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
//     `;

//     // 🧩 Apply class filter correctly using enrollment + class join
//     if (class_id) {
//       query += ` WHERE c.id = $1`;
//       params.push(class_id);
//     }

//     query += ` ORDER BY s.id`;

//     const result = await pool.query(query, params);
//     res.json({ success: true, students: result.rows });
//   } catch (err) {
//     console.error("Error fetching students:", err);
//     res.status(500).json({ success: false, message: "Server error fetching students" });
//   }
// };


import pkg from "pg";
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const getAllStudents = async (req, res) => {
  try {
    const { class_name } = req.query;
    const params = [];
    let query = `
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
    `;

   if (class_name) {
  query += ` WHERE TRIM(c.class_name) = TRIM($1)`;
  params.push(class_name);
}


    query += ` ORDER BY s.id`;

    const result = await pool.query(query, params);
    res.json({ success: true, students: result.rows });
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ success: false, message: "Server error fetching students" });
  }
};
