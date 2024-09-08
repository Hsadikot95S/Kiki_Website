// Declare cartItems globally so it is accessible in all functions
let cartItems = {};

// Function to initialize the page
document.addEventListener('DOMContentLoaded', function () {
    console.log('Checkout page loaded');

    // Display the username if the user is logged in
    updateNavbar();

    // Retrieve cart data from localStorage or initialize it as an empty object
    cartItems = JSON.parse(localStorage.getItem('cartItems')) || {}; 
    const totalPrice = calculateTotalPrice(cartItems);

    console.log("After page load, cart data:", cartItems);
    console.log("After page load, total price:", totalPrice);

    if (Object.keys(cartItems).length > 0) {
        console.log('Cart items loaded:', cartItems);
        console.log('Total price:', totalPrice);
        displayCartItems(cartItems);
        displayTotalPrice(totalPrice);
    } else {
        console.log('No cart data found in localStorage');
    }

    // Add event listener for the complete purchase button
    document.getElementById('submit-button').addEventListener('click', handleCheckout);
});

// Function to handle the complete purchase process
async function handleCheckout() {
    const discordUsername = getCookie("username");
    if (!discordUsername) {
        alert('You need to log in before completing the purchase.');
        login(window.location.href); // Redirect to Discord for login
        return;
    }

    finalizeCheckout(discordUsername);
}

// Function to finalize the checkout
async function finalizeCheckout(discordUsername) {
    console.log('Finalizing checkout...');

    const stripe = Stripe('pk_test_51PPwVlImrBfC2UDpXOX7ibGF48c2M3hbWUW99IAMEh5zdX5AbvtRGOYloRNJ1eqbZQ2wTURIaMxUCRBdvK5rbchi00dyxlPw6x'); // Replace with your actual Stripe publishable key

    // Send cart data to the server for processing
    const response = await fetch('http://localhost:4242/create-checkout-session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            discordUsername: discordUsername, // Include discordUsername
            cartItems: Object.entries(cartItems).map(([name, quantity]) => ({
                name,
                quantity,
                cost: getPriceForTier(name)
            }))
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from server:', errorText);
        alert('Failed to create checkout session. Please try again.');
        return;
    }

    const { id } = await response.json();
    console.log('Stripe session ID:', id);

    // Redirect to Stripe Checkout
    stripe.redirectToCheckout({ sessionId: id });
}

// Function to display cart items on the checkout page
function displayCartItems(cartItems) {
    const tableBody = document.getElementById('checkout-table-body');
    if (!tableBody) {
        console.error('Checkout table body element not found');
        return;
    }

    tableBody.innerHTML = ''; // Clear existing content

    // Iterate over each item in the cart and create a table row
    Object.keys(cartItems).forEach(tier => {
        const row = document.createElement('tr');

        // Name of the subscription
        const nameCell = document.createElement('td');
        nameCell.textContent = tier;
        row.appendChild(nameCell);

        // Cost for each subscription
        const costCell = document.createElement('td');
        const price = getPriceForTier(tier);
        costCell.textContent = `$${price.toFixed(2)}`;
        row.appendChild(costCell);

        // Number of subscriptions with increase/decrease buttons
        const quantityCell = document.createElement('td');
        const decreaseButton = document.createElement('button');
        decreaseButton.textContent = '-';
        decreaseButton.onclick = function () {
            updateSubscriptionCount(tier, -1); // Decrease count
        };

        const quantitySpan = document.createElement('span');
        quantitySpan.textContent = cartItems[tier];
        quantitySpan.id = `${tier.replace(/ /g, '-').toLowerCase()}-count`;

        const increaseButton = document.createElement('button');
        increaseButton.textContent = '+';
        increaseButton.onclick = function () {
            updateSubscriptionCount(tier, 1); // Increase count
        };

        quantityCell.appendChild(decreaseButton);
        quantityCell.appendChild(quantitySpan);
        quantityCell.appendChild(increaseButton);
        row.appendChild(quantityCell);

        // Total cost for that subscription
        const totalCostCell = document.createElement('td');
        totalCostCell.id = `${tier.replace(/ /g, '-').toLowerCase()}-total-cost`;
        totalCostCell.textContent = `$${(price * cartItems[tier]).toFixed(2)}`;
        row.appendChild(totalCostCell);

        tableBody.appendChild(row);
    });
}

// Function to display the total price on the checkout page
function displayTotalPrice(totalPrice) {
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.error('Total price element not found');
        return;
    }

    totalPriceElement.textContent = `$${parseFloat(totalPrice).toFixed(2)}`;
}

// Function to calculate the total price including all items
function calculateTotalPrice(cartItems) {
    let total = 0;
    Object.keys(cartItems).forEach(tier => {
        const price = getPriceForTier(tier);
        total += price * cartItems[tier];
    });
    return total;
}

// Function to update the number of subscriptions
function updateSubscriptionCount(tier, change) {
    const countElement = document.getElementById(`${tier.replace(/ /g, '-').toLowerCase()}-count`);
    let count = parseInt(countElement.textContent, 10) + change;
    if (count < 0) count = 0; // Prevent negative counts

    const price = getPriceForTier(tier);

    // Update count display
    countElement.textContent = count;

    // Update cartItems object and total cost display
    cartItems[tier] = count;
    document.getElementById(`${tier.replace(/ /g, '-').toLowerCase()}-total-cost`).textContent = `$${(price * count).toFixed(2)}`;

    // Update localStorage and total price display
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    displayTotalPrice(calculateTotalPrice(cartItems));
}

// Helper function to get the price for each tier or addon
function getPriceForTier(tier) {
    const tierPricing = {
        "Purrfect Pals": 0,
        "Whisker Whispers": 2,
        "Meow Majesty": 5,
        "Feline Finest": 10,
        "Buy Token": 2, // Price for each token
        "Add On 1": 5,  // Price for each subscription of Add On 1
        "Add On 2": 10  // Price for each subscription of Add On 2
    };
    return tierPricing[tier] || 0; // Return 0 if tier is not found
}
