document.addEventListener('DOMContentLoaded', () => {
    const adminLoginForm = document.getElementById('admin-login-form');
    const errorMessage = document.getElementById('error-message');

    adminLoginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent the form from reloading the page

        // Clear any previous error messages
        errorMessage.textContent = '';

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // If admin login is successful, redirect to the admin dashboard
                window.location.href = '/admin-dashboard.html';
            } else {
                // If admin login fails, display the error message from the server
                errorMessage.textContent = data.message || 'Admin login failed. Please try again.';
            }
        } catch (error) {
            console.error('Admin login request failed:', error);
            errorMessage.textContent = 'Could not connect to the server. Please check your connection.';
        }
    });
});
