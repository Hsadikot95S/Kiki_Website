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
}

function generateCheckoutTable() {
    const checkoutTableBody = document.getElementById('checkout-table-body');
    checkoutTableBody.innerHTML = '';
    for (let tier in cartItems) {
        const cost = getCost(tier);
        const count = cartItems[tier];
        const totalCost = cost * count;
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
    document.getElementById('total-price').innerText = `$${totalPrice}`;
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
    document.getElementById(`${tier.toLowerCase().replace(/ /g, '-')}-total-cost`).innerText = `$${count * cost}`;
    updateSubtotal();
    saveCart();
}

function saveCart() {
    sessionStorage.setItem('cartItems', JSON.stringify(cartItems));
    sessionStorage.setItem('totalPrice', totalPrice.toString());
}

function completeCheckout() {
    alert('We are currently in the process of making a payment gateway for our subscribers. Inconvenience is regretted.');
    // Optionally reset cart and redirect or close the modal
    cartItems = {};
    totalPrice = 0;
    saveCart();
    // window.location.href = 'index.html'; // Redirect to a confirmation page or back to store
}
