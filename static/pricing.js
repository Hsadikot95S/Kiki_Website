document.addEventListener('DOMContentLoaded', function () {
    console.log('Pricing page loaded');

    // Display the username if the user is logged in
    updateNavbar();

    // Get the cart link and checkout button elements
    const cartLink = document.getElementById('cart-link');
    const checkoutButton = document.getElementById('checkout-button');

    // Redirect to the checkout page when the cart link is clicked
    if (cartLink) {
        cartLink.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent default link behavior
            handleCartClick(); // Call handleCartClick function
        });
    }

    // Redirect to the checkout page when the checkout button is clicked
    if (checkoutButton) {
        checkoutButton.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent default button behavior
            handleCartClick(); // Call handleCartClick function
        });
    }

    // Load pricing data from Excel file
    loadPricingData();
});

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

console.log("Before checkout redirect, cart data:", sessionStorage.getItem('cartItems'));

// Define the tier pricing object globally or wherever it is initialized
let tierPricing = {
    "Purrfect Pals": 0,
    "Whisker Whispers": 1, // 1 token
    "Meow Majesty": 2,     // 2 tokens
    "Feline Finest": 5     // 5 tokens
};


// Function to get the price for a given tier
function getPriceForTier(tier) {
    return tierPricing[tier] || 0; // Return the token price or 0 if the tier is not found
}


function saveCart() {
    console.log("Saving cart items:", cartItems);
    console.log("Saving total price:", totalPrice);
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    localStorage.setItem('totalPrice', totalPrice.toString());
    console.log("Cart items and total price saved to localStorage:", localStorage.getItem('cartItems'), localStorage.getItem('totalPrice'));
}

function loadCart() {
    const savedCartItems = sessionStorage.getItem('cartItems');
    const savedTotalPrice = sessionStorage.getItem('totalPrice');
    console.log("Loaded cart items:", savedCartItems);
    console.log("Loaded total price:", savedTotalPrice);
    if (savedCartItems) cartItems = JSON.parse(savedCartItems);
    if (savedTotalPrice) totalPrice = parseFloat(savedTotalPrice);
    console.log("Cart and price loaded from session storage.");
}

// Function to handle cart click and redirect to the checkout page
function handleCartClick() {
    console.log("Before redirect, cart data:", localStorage.getItem('cartItems'));
    console.log("Before redirect, total price:", localStorage.getItem('totalPrice'));
    window.location.href = '/checkout'; // Redirect to the Flask /checkout endpoint
}

let cartCount = 0;
let cartItems = {};
let totalPrice = 0;

// Load pricing data from the Excel file
function loadPricingData() {
    console.log('Loading pricing data...');
    fetch('static/data/subs_table.xlsx')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.arrayBuffer();
        })
        .then(data => {
            console.log('Excel file loaded successfully');
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            console.log('Excel data converted to JSON:', jsonData);
            displayPricingTable(jsonData);
        })
        .catch(error => console.error('Error loading Excel file:', error));
}

// Display the pricing table with data loaded from the Excel file
// Display the pricing table with data loaded from the Excel file
// Display the pricing table with data loaded from the Excel file
// Display the pricing table with data loaded from the Excel file
function displayPricingTable(data) {
    let tableContainer = document.querySelector('#pricing-table-container');
    if (!tableContainer) {
        tableContainer = document.createElement('div');
        tableContainer.id = 'pricing-table-container';
        document.querySelector('.pricing').prepend(tableContainer);
    } else {
        tableContainer.innerHTML = '';
    }

    const table = document.createElement('table');
    table.className = 'pricing-table';

    // Create a single header row
    const headerRow = document.createElement('tr');
    const headers = ['Benefits', 'Commands', 'Purrfect Pals (Free)', 'Whisker Whispers (1 Token)', 'Meow Majesty (2 Tokens)', 'Feline Finest (5 Tokens)'];

    headers.forEach(header => {
        const th = document.createElement('th');
        th.innerText = header;
        th.style.border = "1px solid #ddd";
        th.style.padding = "10px";
        headerRow.appendChild(th);
    });

    // Append only one header row to the table
    table.appendChild(headerRow);

    // Store pricing info in session storage
    let tierPricing = {};
    headers.slice(2).forEach(header => {
        const match = header.match(/\(([^)]+)\)/);
        if (match) {
            const tierName = header.split('(')[0].trim();
            let price = match[1].replace('$', '').trim();
            price = price === 'Free' ? 0 : parseFloat(price);
            tierPricing[tierName] = price;
        }
    });
    sessionStorage.setItem('tierPricing', JSON.stringify(tierPricing));

    // Append the rest of the data rows
    data.slice(2).forEach(row => { // Start slicing from the third row to skip any duplicate headers in the data
        const tr = document.createElement('tr');
        row.forEach((cell, index) => {
            const td = document.createElement('td');
            td.style.border = "1px solid #ddd";
            td.style.padding = "10px";
            td.innerHTML = (cell === '✓') ? '<span class="tick">✓</span>' : 
                           (cell === '✘') ? '<span class="cross">✘</span>' : cell;
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });

    tableContainer.appendChild(table);
    displayPricingCards();
    updateCartCount();
}

// Display pricing cards after loading the data
function displayPricingCards() {
    const pricingSection = document.querySelector('.pricing-container');
    if (pricingSection) {
        pricingSection.style.display = 'flex';
        pricingSection.style.visibility = 'visible';
    }
}

// Increase the item count in the cart
function increaseCount(tier, index) {
    const elementId = tier.toLowerCase().replace(/[\s$()]/g, '-') + '-count';
    const countElement = document.getElementById(elementId);
    // Add-On Token Pricing Updates
    tierPricing["Add On 1"] = 2; // 2 tokens per month
    tierPricing["Add On 2"] = 5; // 5 tokens per month

    if (countElement) {
        let count = parseInt(countElement.textContent, 10) + 1;
        countElement.textContent = count;
        cartCount++;
        cartItems[tier] = count;
        totalPrice += getPriceForTier(tier); // Use getPriceForTier to update totalPrice
        updateCartCount();
        saveCart(); // Call saveCart() after updating the cart and totalPrice
    } else {
        console.error('Count element not found:', elementId);
    }
}

// Decrease the item count in the cart
function decreaseCount(tier, index) {
    const elementId = tier.toLowerCase().replace(/[\s$()]/g, '-') + '-count';
    const countElement = document.getElementById(elementId);
    // Add-On Token Pricing Updates
    tierPricing["Add On 1"] = 2; // 2 tokens per month
    tierPricing["Add On 2"] = 5; // 5 tokens per month

    if (countElement) {
        let count = parseInt(countElement.textContent, 10);
        if (count > 0) {
            count--;
            countElement.textContent = count;
            cartCount--;
            cartItems[tier] = count;
            totalPrice -= getPriceForTier(tier); // Adjust totalPrice when decreasing count
            updateCartCount();
            saveCart(); // Call saveCart() after updating the cart and totalPrice
        } else {
            console.warn('Cannot decrease count below zero.');
        }
    } else {
        console.error ('Count element not found:', elementId);
    }
}

// Update cart count display
function updateCartCount() {
    const cartIcon = document.getElementById('cart-icon');
    if (cartIcon) {
        cartIcon.textContent = `Cart (${cartCount})`;
    }
}

// Function to update subscription details
function updateSubscription(tier, count, cost) {
    cartItems[tier] = count;
    totalPrice = Object.keys(cartItems).reduce((acc, key) => acc + cartItems[key] * getPriceForTier(key), 0);
    document.getElementById(`${tier.toLowerCase().replace(/ /g, '-')}-count`).innerText = count;
    document.getElementById(`${tier.toLowerCase().replace(/ /g, '-')}-total-cost`).innerText = `$${(count * cost).toFixed(2)}`;
    updateSubtotal();
    saveCart();
}

// Function to handle the checkout process
function checkout() {
    const isAuthenticated = sessionStorage.getItem('authenticated');
    const savedCartItems = sessionStorage.getItem('cartItems');
    console.log("Cart items before checkout:", savedCartItems);
    if (!isAuthenticated) {
        loginWithDiscord(); // Ensure this function exists and properly handles authentication
    } else {
        window.location.href = 'checkout.html'; // Ensure this redirect is valid
    }
}

// Function to redirect to the cart page
function redirectToCartPage() {
    window.location.href = '/checkout'; // Redirect to the checkout page
}

// Load cart data from session storage or initialize new cart
loadCart();

