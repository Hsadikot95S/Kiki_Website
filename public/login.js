document.addEventListener('DOMContentLoaded', function() {
    var cartIcon = document.getElementById('cart-icon');
    if (cartIcon) {
        cartIcon.addEventListener('click', function() {
            const redirectUri = 'http://localhost:8000/checkout.html'; // Make sure this matches your actual redirect URI
            const clientId = "1250569008412102713"; // Replace with your actual Discord Client ID
            const scope = 'identify email';
            const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;

            console.log('Redirecting to Discord OAuth2 URL:', discordAuthUrl);
            window.location.href = discordAuthUrl;
        });
    } else {
        console.error("Cart icon not found!");
    }
});

async function handleDiscordRedirect() {
    console.log('Handling Discord redirect...');

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    console.log('Authorization code:', code);

    if (code) {
        const clientId = "1250569008412102713"; // Replace with your actual Discord Client ID
        const clientSecret = '54LnV2W2US-8wH3QcQ_LYtz_K5jCDgUn'; // Replace with your actual Discord Client Secret
        const redirectUri = 'http://localhost:8000/checkout.html';
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

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`HTTP error during token exchange! Status: ${response.status}, Body: ${errorText}`);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const tokenData = await response.json();
            console.log('Token data:', tokenData);

            const accessToken = tokenData.access_token;

            if (accessToken) {
                console.log('Access token obtained:', accessToken);
                const userUrl = 'https://discord.com/api/users/@me';

                const userResponse = await fetch(userUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                });

                if (!userResponse.ok) {
                    const userErrorText = await userResponse.text();
                    console.error(`HTTP error fetching user data! Status: ${userResponse.status}, Body: ${userErrorText}`);
                    throw new Error(`HTTP error! Status: ${userResponse.status}`);
                }

                const userData = await userResponse.json();
                console.log('User data:', userData);

                const discordUsername = userData.username;
                const discordId = userData.id;
                const email = userData.email;

                // Send user data to backend to store in MySQL database
                await fetch('http://localhost:8000/api/saveUserData', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ discordId, discordUsername, email }),
                });

                // Redirect to checkout.html after successful login and data saving
                window.location.href = 'http://localhost:8000/checkout.html';
            }
        } catch (error) {
            console.error('Error during OAuth flow:', error);
        }
    }
}

window.onload = handleDiscordRedirect;
