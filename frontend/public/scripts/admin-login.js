document.addEventListener('DOMContentLoaded', () => {
    const adminLoginForm = document.getElementById('admin-login-form');
    const errorMessage = document.getElementById('error-message');

    adminLoginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent the form from reloading the page
        errorMessage.textContent = '';

        // ✅ Get value from the 'email' input field
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            // ✅ Corrected the API endpoint URL
            const response = await fetch('/api/auth/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Store the token and admin data upon successful login
                localStorage.setItem('token', data.token);
                localStorage.setItem('adminData', JSON.stringify(data.admin));
                
                // Redirect to the admin dashboard
                window.location.href = '/pages/admin-dashboard.html';
            } else {
                // Display the error message from the server
                errorMessage.textContent = data.message || 'Admin login failed. Please try again.';
            }
        } catch (error) {
            console.error('Admin login request failed:', error);
            errorMessage.textContent = 'Could not connect to the server. Please check your connection.';
        }
    });
});