// scripts/login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 
        errorMessage.textContent = '';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            // ✅ CORRECTION: Use a relative path. The browser knows the host.
            const response = await fetch('/api/auth/login', { // Changed URL to be more standard
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) { // Check for a 2xx status code is more reliable
                // If login is successful, redirect to the attendance page
                window.location.href = '/teacher-dashboard.html'; // Use root-relative path
            } else {
                // If login fails, display the error message from the server
                errorMessage.textContent = data.message || 'Login failed. Please try again.';
            }
        } catch (error) {
            console.error('Login request failed:', error);
            errorMessage.textContent = 'Could not connect to the server. Please check your connection.';
        }
    });
});