document.addEventListener('DOMContentLoaded', function() {
    loadPurchasedSubscriptions();
});

function loadPurchasedSubscriptions() {
    const purchasedSubscriptions = JSON.parse(sessionStorage.getItem('purchasedSubscriptions')) || {};
    const subscriptionTableBody = document.getElementById('subscription-table-body');
    subscriptionTableBody.innerHTML = '';

    for (let tier in purchasedSubscriptions) {
        const count = purchasedSubscriptions[tier];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${tier}</td>
            <td>${count}</td>
            <td><button onclick="activateSubscription('${tier}')">Activate</button></td>
        `;
        subscriptionTableBody.appendChild(row);
    }
}

function activateSubscription(tier) {
    // Implement the logic to activate a subscription
    alert(`Subscription for ${tier} activated.`);
}
