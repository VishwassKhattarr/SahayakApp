document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');

    if (!token || !adminData) {
        window.location.href = '/admin-login.html';
        return;
    }

    // Display admin name
    const adminNameElement = document.getElementById('admin-name');
    adminNameElement.textContent = adminData.name || 'Admin';

    // Handle logout
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('adminData');
        window.location.href = '/';
    });

    // Add more dashboard functionality here
});