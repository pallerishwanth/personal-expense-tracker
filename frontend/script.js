
const API_URL = "https://personal-expense-tracker-1uhl.onrender.com/api/transactions";

const form = document.getElementById("transactionForm");
const transactionList = document.getElementById("transactionList");
const categorySummary = document.getElementById("categorySummary");
const submitButton = document.getElementById("submitButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const statusMessage = document.getElementById("statusMessage");

const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const applyFilterButton = document.getElementById("applyFilterButton");
const clearFilterButton = document.getElementById("clearFilterButton");

let editingId = null;
let allTransactions = [];
let filteredTransactions = [];

// Format amounts in Indian Rupees
function formatMoney(amount) {
    return Number(amount || 0).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Display a message on the page
function showMessage(message) {
    statusMessage.textContent = message;
}

// Validate a date
function isValidDate(dateValue) {
    if (!dateValue) {
        return false;
    }

    const parts = dateValue.split("-");

    if (parts.length !== 3) {
        return false;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

// Load transactions from the backend
async function loadTransactions() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Unable to load transactions.");
        }

        allTransactions = await response.json();

        applyDateFilter(false);

    } catch (error) {
        console.error("Loading error:", error);

        transactionList.innerHTML = `
            <tr>
                <td colspan="7">
                    Unable to load transactions. Check that Spring Boot is running.
                </td>
            </tr>
        `;

        showMessage("Could not load transactions. Please try again.");
    }
}

// Filter transactions using the selected date range
function applyDateFilter(showStatus = true) {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (startDate && !isValidDate(startDate)) {
        showMessage("Please select a valid start date.");
        startDateInput.focus();
        return;
    }

    if (endDate && !isValidDate(endDate)) {
        showMessage("Please select a valid end date.");
        endDateInput.focus();
        return;
    }

    if (startDate && endDate && startDate > endDate) {
        showMessage("From Date cannot be later than To Date.");
        endDateInput.focus();
        return;
    }

    filteredTransactions = allTransactions.filter((transaction) => {
        const transactionDate = transaction.date;

        const afterStartDate =
            !startDate || transactionDate >= startDate;

        const beforeEndDate =
            !endDate || transactionDate <= endDate;

        return afterStartDate && beforeEndDate;
    });

    displayTransactions(filteredTransactions);
    updateSummary(filteredTransactions);
    updateCategorySummary(filteredTransactions);

    if (showStatus) {
        if (startDate || endDate) {
            showMessage(
                `Showing ${filteredTransactions.length} transaction(s) for the selected date range.`
            );
        } else {
            showMessage("Showing all transactions.");
        }
    }
}

// Apply date filter button
applyFilterButton.addEventListener("click", function () {
    applyDateFilter(true);
});

// Clear date filter button
clearFilterButton.addEventListener("click", function () {
    startDateInput.value = "";
    endDateInput.value = "";

    applyDateFilter(false);
    showMessage("Date filter cleared. Showing all transactions.");
});

// Display transactions in the table
function displayTransactions(transactions) {
    transactionList.innerHTML = "";

    if (transactions.length === 0) {
        transactionList.innerHTML = `
            <tr>
                <td colspan="7">No transactions found for this date range.</td>
            </tr>
        `;
        return;
    }

    transactions.forEach((transaction) => {
        const row = document.createElement("tr");

        const values = [
            transaction.id,
            transaction.type,
            formatMoney(transaction.amount),
            transaction.category,
            transaction.date,
            transaction.description || "-"
        ];

        values.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actionsCell = document.createElement("td");

        // Edit button
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.className = "edit-btn";

        editButton.addEventListener("click", () => {
            editTransaction(transaction);
        });

        // Delete button
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-btn";

        deleteButton.addEventListener("click", () => {
            deleteTransaction(transaction.id);
        });

        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);
        row.appendChild(actionsCell);

        transactionList.appendChild(row);
    });
}

// Calculate income, expenses, and balance
function updateSummary(transactions) {
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach((transaction) => {
        const amount = Number(transaction.amount) || 0;
        const type = String(transaction.type).toUpperCase();

        if (type === "INCOME") {
            totalIncome += amount;
        } else if (type === "EXPENSE") {
            totalExpenses += amount;
        }
    });

    document.getElementById("totalIncome").textContent =
        formatMoney(totalIncome);

    document.getElementById("totalExpenses").textContent =
        formatMoney(totalExpenses);

    document.getElementById("balance").textContent =
        formatMoney(totalIncome - totalExpenses);
}

// Calculate expenses by category
function updateCategorySummary(transactions) {
    categorySummary.innerHTML = "";

    const categoryTotals = {};

    transactions.forEach((transaction) => {
        if (String(transaction.type).toUpperCase() === "EXPENSE") {
            const category = transaction.category || "Uncategorized";
            const amount = Number(transaction.amount) || 0;

            categoryTotals[category] =
                (categoryTotals[category] || 0) + amount;
        }
    });

    const categories = Object.entries(categoryTotals);

    if (categories.length === 0) {
        categorySummary.innerHTML = `
            <tr>
                <td colspan="2">No expenses recorded for this date range.</td>
            </tr>
        `;
        return;
    }

    categories.sort((a, b) => b[1] - a[1]);

    categories.forEach(([category, total]) => {
        const row = document.createElement("tr");

        const categoryCell = document.createElement("td");
        categoryCell.textContent = category;

        const totalCell = document.createElement("td");
        totalCell.textContent = formatMoney(total);

        row.appendChild(categoryCell);
        row.appendChild(totalCell);

        categorySummary.appendChild(row);
    });
}

// Reset the transaction form
function resetTransactionForm() {
    form.reset();
    editingId = null;

    submitButton.textContent = "Add Transaction";
    cancelEditButton.hidden = true;
}

// Add or update a transaction
form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const type = document.getElementById("type").value;
    const amountInput = document.getElementById("amount");
    const categoryInput = document.getElementById("category");
    const dateInput = document.getElementById("date");
    const descriptionInput = document.getElementById("description");

    const amountValue = amountInput.value.trim();
    const categoryValue = categoryInput.value.trim();
    const dateValue = dateInput.value;

    if (
        amountValue === "" ||
        !Number.isFinite(Number(amountValue)) ||
        Number(amountValue) <= 0
    ) {
        alert("Please enter an amount greater than zero.");
        amountInput.focus();
        return;
    }

    if (categoryValue === "") {
        alert("Please enter a category.");
        categoryInput.focus();
        return;
    }

    if (!isValidDate(dateValue)) {
        alert("Please select a valid date.");
        dateInput.focus();
        return;
    }

    const transaction = {
        type: type,
        amount: Number(amountValue),
        category: categoryValue,
        date: dateValue,
        description: descriptionInput.value.trim()
    };

    const url = editingId === null
        ? API_URL
        : `${API_URL}/${editingId}`;

    const method = editingId === null ? "POST" : "PUT";

    submitButton.disabled = true;

    showMessage(
        editingId === null
            ? "Adding transaction..."
            : "Updating transaction..."
    );

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(transaction)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                errorText || `Request failed with status ${response.status}`
            );
        }

        resetTransactionForm();
        showMessage("Transaction saved successfully.");

        await loadTransactions();

    } catch (error) {
        console.error("Saving error:", error);
        showMessage("Could not save transaction.");

        alert(
            "Could not save the transaction. Check the Spring Boot terminal for errors."
        );

    } finally {
        submitButton.disabled = false;
    }
});

// Edit a transaction
function editTransaction(transaction) {
    editingId = transaction.id;

    document.getElementById("type").value =
        String(transaction.type).toUpperCase();

    document.getElementById("amount").value = transaction.amount;
    document.getElementById("category").value = transaction.category;
    document.getElementById("date").value = transaction.date;
    document.getElementById("description").value =
        transaction.description || "";

    submitButton.textContent = "Update Transaction";
    cancelEditButton.hidden = false;

    showMessage(`Editing transaction ${transaction.id}.`);

    form.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// Cancel editing
cancelEditButton.addEventListener("click", function () {
    resetTransactionForm();
    showMessage("Editing cancelled.");
});

// Delete a transaction
async function deleteTransaction(id) {
    const confirmed = confirm(
        "Are you sure you want to delete this transaction?"
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Unable to delete transaction.");
        }

        if (editingId === id) {
            resetTransactionForm();
        }

        showMessage("Transaction deleted successfully.");

        await loadTransactions();

    } catch (error) {
        console.error("Deleting error:", error);
        alert("Could not delete the transaction. Please try again.");
    }
}

// Load transactions when the page opens
loadTransactions();
