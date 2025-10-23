cd# TODO: Fix Admin Dashboard Authentication and Add Logout Button

## Steps to Complete

- [x] Update `backend/server.js` to check `req.user.role` after `verifyToken` for admin/teacher pages
- [x] Edit `frontend/src/pages/admin-dashboard.html` to add a header with logout button and display admin name
- [x] Update the inline script in `admin-dashboard.html` to handle logout and name display
- [x] Update `frontend/src/scripts/navbar.js` to remove both `teacherData` and `adminData` on logout for consistency
- [x] Test authentication: Ensure admin pages redirect if not admin, teacher pages if not teacher
- [x] Test logout: Verify it clears storage and redirects
- [x] Run the app and check browser access
