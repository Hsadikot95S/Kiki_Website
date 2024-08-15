document.addEventListener('DOMContentLoaded', function () {
    loadSubscriptions();
});

let subscriptionData = [];

function loadSubscriptions() {
    fetch('/get-subscriptions')
        .then(response => response.json())
        .then(data => {
            subscriptionData = data;
            console.log("Loaded subscription data:", subscriptionData);  // Debugging: Check the loaded data
            generateSubscriptionTable();
        })
        .catch(error => {
            console.error('Error loading subscriptions:', error);
        });
}

function generateSubscriptionTable() {
    const subscriptionTableBody = document.getElementById('subscription-table-body');
    subscriptionTableBody.innerHTML = '';

    subscriptionData.forEach(subscription => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${subscription.discordUsername}</td>
            <td>${subscription.tiers}</td>
            <td>${subscription.joinDate}</td>
            <td>${subscription.expiryDate}</td>
            <td>
                <button onclick="changeSubscription('${subscription.discordUsername}', '${subscription.tiers}', -1)">-</button>
                <span id="${subscription.tiers.replace(/\s+/g, '-')}">0</span>
                <button onclick="changeSubscription('${subscription.discordUsername}', '${subscription.tiers}', 1)">+</button>
            </td>
        `;
        subscriptionTableBody.appendChild(row);
    });
}

function changeSubscription(discordUsername, tier, change) {
    const tierElement = document.getElementById(tier.replace(/\s+/g, '-'));
    let currentQuantity = parseInt(tierElement.textContent);

    if (isNaN(currentQuantity)) {
        currentQuantity = 0;
    }

    currentQuantity += change;

    tierElement.textContent = currentQuantity;
    updateSubscriptionData(discordUsername, tier, currentQuantity);
}

function updateSubscriptionData(discordUsername, tier, quantity) {
    console.log(`Updating subscription data for discordUsername: ${discordUsername}, tier: ${tier}, quantity: ${quantity}`);  // Debugging: Verify data update
    subscriptionData = subscriptionData.map(subscription => {
        if (subscription.discordUsername === discordUsername && subscription.tiers === tier) {
            return { ...subscription, quantity };
        }
        return subscription;
    });
}

document.getElementById('confirm-changes-btn').addEventListener('click', function () {
    console.log('Subscriptions being sent to server:', subscriptionData);  // Debugging: Check the data before sending
    fetch('/update-subscriptions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptions: subscriptionData }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showMessage('Your changes have been recorded and will be reflected from the next billing cycle.');
        } else {
            showMessage('There was an error recording your changes. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error updating subscriptions:', error);
        showMessage('There was an error recording your changes. Please try again.');
    });
});

function showMessage(message) {
    const messagePlaceholder = document.getElementById('message-placeholder');
    messagePlaceholder.textContent = message;
    messagePlaceholder.style.display = 'block';
}
