document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    generateCheckoutTable();
});

let cartItems = {};
let totalPrice = 0.0;

function loadCart() {
    const savedCartItems = sessionStorage.getItem('cartItems');
    const savedTotalPrice = sessionStorage.getItem('totalPrice');
    if (savedCartItems && savedTotalPrice) {
        cartItems = JSON.parse(savedCartItems);
        totalPrice = parseFloat(savedTotalPrice);
    }
    console.log("Loaded cart items:", cartItems);
    console.log("Total price:", totalPrice);
}

function generateCheckoutTable() {
    const checkoutTableBody = document.getElementById('checkout-table-body');
    checkoutTableBody.innerHTML = '';

    for (let tier in cartItems) {
        const cost = getCost(tier);
        const count = cartItems[tier];
        const totalCost = cost * count;

        console.log("Tier:", tier, "Cost:", cost, "Count:", count, "Total Cost:", totalCost);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${tier}</td>
            <td>$${cost}</td>
            <td>
                <button onclick="decreaseCount('${tier}', ${cost})">-</button>
                <span id="${tier.toLowerCase().replace(/ /g, '-')}-count">${count}</span>
                <button onclick="increaseCount('${tier}', ${cost})">+</button>
            </td>
            <td id="${tier.toLowerCase().replace(/ /g, '-')}-total-cost">$${totalCost}</td>
        `;
        checkoutTableBody.appendChild(row);
    }
    updateSubtotal();
}

function updateSubtotal() {
    document.getElementById('total-price').innerText = `$${totalPrice.toFixed(2)}`;
}

function getCost(tier) {
    switch (tier) {
        case 'Purrfect Pals': return 0;
        case 'Whisker Whispers': return 2;
        case 'Meow Majesty': return 5;
        case 'Feline Finest': return 10;
        case 'Add On 1': return 5;
        case 'Add On 2': return 10;
        default: return 0;
    }
}

function increaseCount(tier, cost) {
    let countElement = document.getElementById(`${tier.toLowerCase().replace(/ /g, '-')}-count`);
    let count = parseInt(countElement.innerText) + 1;
    updateSubscription(tier, count, cost);
}

function decreaseCount(tier, cost) {
    let countElement = document.getElementById(`${tier.toLowerCase().replace(/ /g, '-')}-count`);
    let count = parseInt(countElement.innerText) - 1;
    if (count >= 0) updateSubscription(tier, count, cost);
}

function updateSubscription(tier, count, cost) {
    cartItems[tier] = count;
    totalPrice = Object.keys(cartItems).reduce((acc, key) => acc + cartItems[key] * getCost(key), 0);
    document.getElementById(`${tier.toLowerCase().replace(/ /g, '-')}-count`).innerText = count;
    document.getElementById(`${tier.toLowerCase().replace(/ /g, '-')}-total-cost`).innerText = `$${(count * cost).toFixed(2)}`;
    updateSubtotal();
    saveCart();
}

function saveCart() {
    sessionStorage.setItem('cartItems', JSON.stringify(cartItems));
    sessionStorage.setItem('totalPrice', totalPrice.toString());
}

// Stripe Checkout Integration
const stripe = Stripe('pk_test_51PPwVlImrBfC2UDpXOX7ibGF48c2M3hbWUW99IAMEh5zdX5AbvtRGOYloRNJ1eqbZQ2wTURIaMxUCRBdvK5rbchi00dyxlPw6x'); // Replace with your actual Stripe public key

document.getElementById('submit-button').addEventListener('click', function () {
    // Assuming you fetch the discordId from somewhere like sessionStorage
    const discordId = sessionStorage.getItem('discordId');

    fetch('/create-checkout-session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            discordId: discordId,
            cartItems: Object.keys(cartItems).map(key => ({
                name: key,
                cost: getCost(key),
                quantity: cartItems[key]
            }))
        }),
    })
    .then(function (response) {
        if (!response.ok) {
            return response.text().then(err => { 
                console.error('Error response from server:', err);
                throw new Error('Failed to create checkout session');
            });
        }
        return response.json();
    })
    .then(function (sessionId) {
        return stripe.redirectToCheckout({ sessionId: sessionId.id });
    })
    .then(function (result) {
        if (result.error) {
            alert(result.error.message);
        }
    })
    .catch(function (error) {
        console.error('Error:', error);
    });
});
