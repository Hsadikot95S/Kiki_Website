document.addEventListener('DOMContentLoaded', function() {
    var cartIcon = document.getElementById('cart-icon');
    if (cartIcon) {
        cartIcon.addEventListener('click', function() {
            const redirectUri = 'http://localhost:4242/checkout'; // Make sure this matches your actual redirect URI
            const clientId = "1272296192172097720"; // Replace with your actual Discord Client ID
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
    // console.log('Authorization code:', code);

    if (code) {
        const clientId = "1272296192172097720"; // Replace with your actual Discord Client ID
        const clientSecret = 'YgUzN_f47mnYMJ38baSyFR7JGAHGQ4b1'; // Replace with your actual Discord Client Secret
        const redirectUri = 'http://localhost:4242/checkout'; // Make sure this matches your actual redirect URI
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
            // console.log('Token data:', tokenData);

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
                // console.log('User data:', userData);

                const discordUsername = userData.username;
                const discordId = userData.id;
                const email = userData.email;

               // console.log('Sending data to backend:', { discordId, discordUsername, email });

                // Send user data to backend to store in MySQL database
                const dbResponse = await fetch('http://127.0.0.1:4242/store-subscriber', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ discordId, discordUsername, email }),
                });

                const dbResult = await dbResponse.json();
                // console.log('Database response:', dbResult);

                if (!dbResponse.ok) {
                    const dbErrorText = await dbResponse.text();
                    console.error(`Error saving user data to the database! Status: ${dbResponse.status}, Body: ${dbErrorText}`);
                    throw new Error(`Error saving user data! Status: ${dbResponse.status}`);
                }

                console.log('User data saved to the database successfully.');

                // Redirect to checkout.html after successful login and data saving
                window.location.href = 'http://127.0.0.1:4242/checkout';
            }
        } catch (error) {
            console.error('Error during OAuth flow:', error);
        }
    }
}

window.onload = handleDiscordRedirect;
