const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 8000;

// Use body-parser to parse JSON payloads
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// MySQL connection setup
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'M1cr)s)ft270934',
    database: 'kiki_subscribers'
});

// Connect to the MySQL server
connection.connect(error => {
    if (error) {
        console.error('Error connecting to MySQL: ' + error.stack);
        return;
    }
    console.log('Connected to MySQL as ID ' + connection.threadId);
});

// API endpoint to save user data
app.post('/api/saveUserData', (req, res) => {
    console.log(req.body);
    const { discordId, discordUsername, email } = req.body;  // Extracting the exact keys as in the database

    const retryCount = 0;  // Default retry count

    // SQL query that matches the column names in your database
    const query = `INSERT INTO subscribers (discordId, discordUsername, email, Retry_Count) VALUES (?, ?, ?, ?)`;
    connection.query(query, [discordId, discordUsername, email, retryCount], (err, result) => {
        if (err) {
            console.error('Error saving user data:', err);
            return res.status(500).send('Error saving user data: ' + err.message);
        }
        res.status(200).send('User data saved successfully');
    });
});

// Start the server and listen on the specified port
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
