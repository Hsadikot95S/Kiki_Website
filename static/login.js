// Function to handle the login flow
function login(redirectUri = window.location.href) {
    console.log('Performing login, redirecting to Discord...');
    const clientId = "1272296192172097720"; // Discord Client ID
    const scope = 'identify email';
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;

    window.location.href = discordAuthUrl; // Redirect to Discord OAuth2 for login
}

// Function to handle logout
function logout() {
    document.cookie = "loggedIn=; path=/; max-age=0"; // Clear the logged-in cookie
    document.cookie = "username=; path=/; max-age=0"; // Clear the username cookie
    updateNavbar(); // Update the navbar to reflect the logged-out state
    window.location.reload(); // Reload the page to update state
}

// Function to get a specific cookie value
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Function to update the navbar based on login status
function updateNavbar() {
    console.log('Updating navbar...');
    const usernameDisplay = document.getElementById('username-display');
    const loginLink = document.getElementById('login-link');
    const logoutLink = document.getElementById('logout-link');

    const username = getCookie("username");

    if (username) {
        usernameDisplay.textContent = `Hello, ${username}`;
        usernameDisplay.style.display = 'inline'; // Show username
        loginLink.style.display = 'none'; // Hide login link
        logoutLink.style.display = 'inline'; // Show logout link
    } else {
        usernameDisplay.style.display = 'none'; // Hide username if not logged in
        loginLink.style.display = 'inline'; // Show login link
        logoutLink.style.display = 'none'; // Hide logout link
    }
}

// Function to handle the Discord redirect and OAuth flow
async function handleDiscordRedirect() {
    console.log('Handling Discord redirect...');
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        const clientId = "1272296192172097720"; // Discord Client ID
        const clientSecret = "YgUzN_f47mnYMJ38baSyFR7JGAHGQ4b1"; // Discord Client Secret
        const redirectUri = window.location.origin + window.location.pathname; // Keep the user on the current page
        const tokenUrl = 'https://discord.com/api/oauth2/token';

        const data = new URLSearchParams();
        data.append('client_id', clientId);
        data.append('client_secret', clientSecret);
        data.append('grant_type', 'authorization_code');
        data.append('code', code);
        data.append('redirect_uri', redirectUri);

        try {
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: data,
            });

            if (response.ok) {
                const tokenData = await response.json();
                const accessToken = tokenData.access_token;

                if (accessToken) {
                    const userUrl = 'https://discord.com/api/users/@me';
                    const userResponse = await fetch(userUrl, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                        },
                    });

                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        const discordId = userData.id;
                        const discordUsername = userData.username;
                        const email = userData.email;

                        // Store the user details in cookies
                        document.cookie = `username=${discordUsername}; path=/; max-age=${60 * 60 * 24}`;
                        document.cookie = `loggedIn=true; path=/; max-age=${60 * 60 * 24}`;

                        // Update user data in the database
                        const dbResponse = await fetch('http://localhost:4242/store-subscriber', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ discordId, discordUsername, email }),
                        });

                        if (dbResponse.ok || dbResponse.status === 409) {
                            console.log('User data processed successfully.');
                            updateNavbar();
                        } else {
                            console.error('Error saving user data!');
                        }

                        // Refresh the page after successful login
                        window.location.href = redirectUri;
                    }
                }
            } else {
                const errorText = await response.text();
                console.error(`Error during token exchange! Status: ${response.status}, Body: ${errorText}`);
            }
        } catch (error) {
            console.error('Error during OAuth flow:', error);
        }
    }
}

// Initialize functions on page load
document.addEventListener('DOMContentLoaded', function () {
    console.log('Page loaded');

    updateNavbar(); // Update navbar based on login status
    handleDiscordRedirect(); // Handle OAuth flow if necessary
});
