// Loads the navbar partial and injects it into the placeholder
fetch('../components/navbar.html')
  .then(res => res.text())
  .then(data => {
    document.getElementById('navbar-placeholder').innerHTML = data;

    // Add logout functionality to the navbar logout button
    const navbarLogoutBtn = document.getElementById('navbar-logout-btn');
    if (navbarLogoutBtn) {
      navbarLogoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('teacherData');
        localStorage.removeItem('adminData');
        window.location.href = '/';
      });
    }
  });
