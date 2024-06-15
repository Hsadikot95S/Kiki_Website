document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    updateCart();
    updateCounts();
});

let cartCount = 0;
let cartItems = {};
let totalPrice = 0.0;

function saveCart() {
    console.log("Saving cart items and total price.");
    sessionStorage.setItem('cartItems', JSON.stringify(cartItems));
    sessionStorage.setItem('totalPrice', totalPrice.toString());
}

function loadCart() {
    const savedCartItems = sessionStorage.getItem('cartItems');
    const savedTotalPrice = sessionStorage.getItem('totalPrice');
    if (savedCartItems) cartItems = JSON.parse(savedCartItems);
    if (savedTotalPrice) totalPrice = parseFloat(savedTotalPrice);
    console.log("Cart and price loaded from session storage.");
}

function updateSubscription(tier, price, count) {
    count = parseInt(count, 10);
    if (cartItems[tier]) totalPrice -= cartItems[tier] * price;
    cartItems[tier] = count;
    totalPrice += count * price;
    saveCart();
    updateCart();
    updateCountDisplay(tier, count);
}

function updateCountDisplay(tier, count) {
    const elementId = `${tier.toLowerCase().replace(/ /g, '-')}-count`;
    document.getElementById(elementId).innerText = count;
}

function updateCounts() {
    for (let tier in cartItems) {
        updateCountDisplay(tier, cartItems[tier]);
    }
}

function updateCart() {
    cartCount = Object.values(cartItems).reduce((acc, count) => acc + count, 0);
    document.getElementById('cart-icon').innerText = `Cart (${cartCount})`;
}

function increaseCount(tier, price) {
    const count = cartItems[tier] || 0;
    updateSubscription(tier, price, count + 1);
}

function decreaseCount(tier, price) {
    const count = cartItems[tier] || 0;
    if (count > 0) {
        updateSubscription(tier, price, count - 1);
    }
}

function checkout() {
    const isAuthenticated = sessionStorage.getItem('authenticated');
    if (!isAuthenticated) {
        loginWithDiscord(); // Ensure this function exists and properly handles authentication
    } else {
        window.location.href = 'checkout.html'; // Ensure this redirect is valid
    }
}

function manageSubscriptions() {
    window.location.href = 'subscription.html'; // Ensure this redirect is valid
}
