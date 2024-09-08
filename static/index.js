document.addEventListener('DOMContentLoaded', function () {
    console.log('Index page loaded');

    // Update navbar based on the current login status
    updateNavbar();

    // Get the login link element
    var loginLink = document.getElementById('login-link'); // Corrected ID reference to match your HTML

    if (loginLink) {
        loginLink.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent the default link behavior
            console.log('Login link clicked'); // Log the click event

            // Perform Discord login and then redirect to the index page
            login('http://localhost:4242/index');
        });
    } else {
        console.error("Login link not found on the page!");
    }
});

