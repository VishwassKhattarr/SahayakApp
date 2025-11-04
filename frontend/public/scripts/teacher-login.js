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
            // ✅ CORRECTION: Use the full, correct relative path to the teacher login endpoint.
            const response = await fetch('/api/auth/teacher/login', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) { // Check for a 2xx status code is more reliable
                // If login is successful, store the token and teacher data
                localStorage.setItem('token', data.token);
                localStorage.setItem('teacherData', JSON.stringify(data.teacher));

                // Redirect to the teacher dashboard page
                window.location.href = '/pages/teacher-dashboard.html';
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