// auth-check.js - Utility for checking authentication on protected pages

// Check if teacher is logged in
function checkTeacherAuth() {
    const token = localStorage.getItem('token');
    const teacherData = localStorage.getItem('teacherData');

    if (!token || !teacherData) {
        // Not logged in, redirect to teacher login
        window.location.href = '/pages/teacher-login.html';
    }
}

// Check if admin is logged in
function checkAdminAuth() {
    const token = localStorage.getItem('token');
    const adminData = localStorage.getItem('adminData');

    if (!token || !adminData) {
        // Not logged in, redirect to admin login
        window.location.href = '/pages/admin-login.html';
    }
}

// Optional: Function to verify token with backend (for extra security)
async function verifyToken() {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        const response = await fetch('/api/auth/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.ok;
    } catch (error) {
        console.error('Token verification failed:', error);
        return false;
    }
}

// Function to check if user is still logged in (token exists and is valid)
function isLoggedIn() {
    const token = localStorage.getItem('token');
    return !!token; // Returns true if token exists
}
