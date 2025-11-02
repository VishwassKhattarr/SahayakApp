// import jwt from 'jsonwebtoken';

// export const verifyToken = (req, res, next) => {
//   const token = req.headers['authorization']?.split(' ')[1]; // Expecting "Bearer <token>"

//   if (!token) {
//     return res.status(401).json({ message: 'Access denied. No token provided.' });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
//     req.user = decoded; // Attach decoded user (id, role, email)
//     next();
//   } catch (err) {
//     return res.status(403).json({ message: 'Invalid or expired token' });
//   }
// };
// backend/middleware/authMiddleware.js
// import jwt from 'jsonwebtoken';

// export const verifyToken = (req, res, next) => {
//   try {
//     // Extract token from headers, query, or localStorage cookies
//     const token =
//       req.headers.authorization?.split(' ')[1] ||
//       req.query.token ||
//       req.cookies?.token;

//     if (!token) {
//       // Detect if it’s a page request or API
//       const isApi = req.originalUrl.startsWith('/api/');
//       if (isApi) {
//         return res.status(401).json({ message: 'Unauthorized - Please log in' });
//       } else {
//         return res.redirect('/src/pages/teacher-login.html');
//       }
//     }

//     // Verify JWT
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
//     req.user = decoded;
//     next();
//   } catch (error) {
//     console.error('❌ Invalid or expired token:', error.message);

//     const isApi = req.originalUrl.startsWith('/api/');
//     if (isApi) {
//       return res.status(401).json({ message: 'Invalid or expired token' });
//     } else {
//       return res.redirect('/src/pages/teacher-login.html');
//     }
//   }
// };

// backend/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
  try {
    // 1) find token from Authorization header (Bearer), query, or cookie
    const token =
      req.headers.authorization?.split(' ')[1] ||
      req.query.token ||
      req.cookies?.token;

    // 2) If no token -> treat API vs Page differently
    if (!token) {
      const isApi = req.originalUrl.startsWith('/api/');
      if (isApi) {
        return res.status(401).json({ message: 'Unauthorized - token required' });
      } else {
        // Check if it's an admin page or teacher page
        if (req.originalUrl.includes('/admin-')) {
          return res.redirect('/pages/admin-login.html');
        } else {
          return res.redirect('/pages/teacher-login.html');
        }
      }
    }

    // 3) verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (err) {
    console.error('verifyToken error:', err.message);
    const isApi = req.originalUrl.startsWith('/api/');
    if (isApi) {
      return res.status(401).json({ message: 'Token expired or invalid' });
    } else {
      // Check if it's an admin page or teacher page
      if (req.originalUrl.includes('/admin-')) {
        return res.redirect('/pages/admin-login.html');
      } else {
        return res.redirect('/pages/teacher-login.html');
      }
    }
  }
};

// Export both names for the same function
export { verifyToken as protect, verifyToken };

