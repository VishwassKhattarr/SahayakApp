document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.textContent = '';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('http://localhost:3000/api/auth/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Store the token and admin data
                localStorage.setItem('token', data.token);
                localStorage.setItem('adminData', JSON.stringify(data.admin));
                
                // Redirect to admin dashboard
                window.location.href = '/admin-dashboard.html';
            } else {
                errorMessage.textContent = data.message || 'Login failed. Please try again.';
            }
        } catch (error) {
            console.error('Login request failed:', error);
            errorMessage.textContent = 'Could not connect to the server. Please check your connection.';
        }
    });
});