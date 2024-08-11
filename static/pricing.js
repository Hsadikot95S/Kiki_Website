document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    updateCart();
    updateCounts();
    loadPricingData();
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

function loadPricingData() {
    fetch('data/subs_table.xlsx')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.arrayBuffer();
        })
        .then(data => {
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            console.log('Excel data:', jsonData); // Debugging log
            displayPricingTable(jsonData);
        })
        .catch(error => console.error('Error loading Excel file:', error));
}

// Function to display the table based on Excel data
function displayPricingTable(data) {
    const pricingSection = document.querySelector('.pricing');
    const table = document.createElement('table');
    table.className = 'pricing-table';

    // Create table header
    const headerRow = document.createElement('tr');
    data[0].forEach(header => {
        const th = document.createElement('th');
        th.innerText = header;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Create table rows
    data.slice(1).forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
            const td = document.createElement('td');
            if (cell === '✓') {
                td.innerHTML = '<span class="tick">✓</span>';
            } else {
                td.innerText = cell;
            }
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });

    // Insert the table as the first child of the pricing section
    pricingSection.insertBefore(table, pricingSection.firstChild);

    // Add spacing between the table and the subscription cards
    const spacer = document.createElement('div');
    spacer.className = 'spacer';
    
    const pricingCardsRow = document.querySelector('.pricing-cards-row');
    
    // Check if .pricing-cards-row exists and is a child of pricingSection before inserting spacer
    if (pricingCardsRow && pricingSection.contains(pricingCardsRow)) {
        pricingSection.insertBefore(spacer, pricingCardsRow);
    } else {
        // If not, append spacer at the end of pricingSection
        pricingSection.appendChild(spacer);
    }
}
