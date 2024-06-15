document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('commands-table')) {
        loadCommands();
    }
});

function loadCommands() {
    fetch('commands_db.xlsx')
        .then(response => response.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const commands = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            displayCommands(commands);
        });
}

function displayCommands(commands) {
    const table = document.getElementById('commands-table');
    commands.forEach((command, index) => {
        const row = document.createElement('tr');
        command.forEach(cell => {
            const cellElement = document.createElement(index === 0 ? 'th' : 'td');
            cellElement.textContent = cell;
            row.appendChild(cellElement);
        });
        table.appendChild(row);
    });
}
