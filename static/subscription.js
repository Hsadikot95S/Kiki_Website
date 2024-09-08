document.addEventListener('DOMContentLoaded', function() {
    console.log('Subscription page loaded');

    // Display the username if the user is logged in
    updateNavbar();

    // Load subscriptions data from the server
    loadSubscriptions();
});

let subscriptionData = [];
let modifications = {};

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

    if (!usernameDisplay) {
        console.error("Username display element not found!");
        return;
    }

    const username = getCookie("username");
    if (username) {
        usernameDisplay.textContent = `Hello, ${username}`;
        usernameDisplay.style.display = 'inline'; // Show username
    } else {
        usernameDisplay.style.display = 'none'; // Hide username if not logged in
    }
}

// Function to load subscriptions data from the server
function loadSubscriptions() {
    fetch('/get-subscriptions')
        .then(response => response.json())
        .then(data => {
            subscriptionData = data;
            generateSubscriptionTable();
        })
        .catch(error => {
            console.error('Error loading subscriptions:', error);
        });
}

// Function to generate the subscription table
function generateSubscriptionTable() {
    const subscriptionTableBody = document.getElementById('subscription-table-body');
    subscriptionTableBody.innerHTML = '';  // Clear existing rows

    subscriptionData.forEach(subscription => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${subscription.discordUsername}</td>
            <td>${subscription.tiers}</td>
            <td>${new Date(subscription.joinDate).toLocaleDateString()}</td>
            <td>${new Date(subscription.expiryDate).toLocaleDateString()}</td>
            <td>
                <button onclick="changeSubscription('${subscription.discordUsername}', '${subscription.tiers}', -1)">-</button>
                <span id="${subscription.tiers.replace(/\s+/g, '-')}-modify-quantity">0</span>
                <button onclick="changeSubscription('${subscription.discordUsername}', '${subscription.tiers}', 1)">+</button>
            </td>
            <td id="${subscription.tiers.replace(/\s+/g, '-')}-quantity">${subscription.quantity || 0}</td>
        `;
        subscriptionTableBody.appendChild(row);
    });
}

// Function to change subscription quantity
function changeSubscription(discordUsername, tier, change) {
    const modifyId = tier.replace(/\s+/g, '-') + '-modify-quantity';
    const quantityId = tier.replace(/\s+/g, '-') + '-quantity';
    const modifyElement = document.getElementById(modifyId);
    const actualQuantityElement = document.getElementById(quantityId);

    if (modifyElement) {
        let currentModifyQuantity = parseInt(modifyElement.textContent) || 0;
        currentModifyQuantity += change;
        modifyElement.textContent = currentModifyQuantity;

        // Update modifications object
        if (!modifications[tier]) {
            modifications[tier] = 0;
        }
        modifications[tier] += change;

        // Optionally update the actual quantity display
        if (actualQuantityElement) {
            let currentActualQuantity = parseInt(actualQuantityElement.textContent);
            actualQuantityElement.textContent = currentActualQuantity + change;
        }
    } else {
        console.error('Element not found:', modifyId);
    }
}

// Event listener for the confirm changes button
document.getElementById('confirm-changes-btn').addEventListener('click', function() {
    let updatedSubscriptions = subscriptionData.map(sub => {
        let modifiedQuantityId = `${sub.tiers.replace(/\s+/g, '-')}-modify-quantity`;
        let modifiedQuantityElement = document.getElementById(modifiedQuantityId);
        let modifiedQuantity = parseInt(modifiedQuantityElement.textContent) || 0;

        return {
            discordUsername: sub.discordUsername,
            tiers: sub.tiers,
            quantity: modifiedQuantity + (sub.quantity || 0) // Assuming `sub.quantity` is the initial value from DB
        };
    });

    console.log('Subscriptions being sent to server:', updatedSubscriptions);
    fetch('/update-subscriptions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptions: updatedSubscriptions }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Your changes have been recorded and will be reflected from the next billing cycle.');
            location.reload(); // Refresh the page to show updated changes
        } else {
            alert('There was an error recording your changes. Please try again.');
            console.error('Error recording changes:', data.message);
        }
    })
    .catch(error => {
        console.error('Error updating subscriptions:', error);
        alert('An unexpected error occurred. Please try again.');
    });
});
