// include-navbar.js
// Fetches a navbar partial and injects it into any element with data-include="navbar"
(async function() {
    try {
        const resp = await fetch('/src/components/navbar.html');
        if (!resp.ok) return;
        const html = await resp.text();
        document.querySelectorAll('[data-include="navbar"]').forEach(el => {
            el.innerHTML = html;
        });
    } catch (err) {
        console.error('Failed to include navbar', err);
    }
})();
