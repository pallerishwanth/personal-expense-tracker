
const API_URL = "https://YOUR-RENDER-BACKEND.onrender.com/api/transactions";

let monthlyChart = null;
let categoryChart = null;

function formatMoney(amount) {
    return Number(amount || 0).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

async function loadAnalytics() {
    const message = document.getElementById("analyticsMessage");

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Unable to load transactions.");
        }

        const transactions = await response.json();

        updateCards(transactions);
        drawMonthlyChart(transactions);
        drawCategoryChart(transactions);

        message.textContent = transactions.length
            ? "Analytics updated successfully."
            : "Add some transactions to see your analytics.";

    } catch (error) {
        console.error("Analytics error:", error);
        message.textContent =
            "Could not load analytics. Please check that the application is running.";
    }
}

// Calculate income, expenses and balance
function updateCards(transactions) {
    let income = 0;
    let expenses = 0;

    transactions.forEach(transaction => {
        const amount = Number(transaction.amount) || 0;
        const type = String(transaction.type).toUpperCase();

        if (type === "INCOME") {
            income += amount;
        } else if (type === "EXPENSE") {
            expenses += amount;
        }
    });

    document.getElementById("analyticsIncome").textContent =
        formatMoney(income);

    document.getElementById("analyticsExpenses").textContent =
        formatMoney(expenses);

    document.getElementById("analyticsBalance").textContent =
        formatMoney(income - expenses);
}

// Group income and expenses by month
function drawMonthlyChart(transactions) {
    const monthlyData = {};

    transactions.forEach(transaction => {
        if (!transaction.date) return;

        const month = transaction.date.substring(0, 7);

        if (!monthlyData[month]) {
            monthlyData[month] = {
                income: 0,
                expenses: 0
            };
        }

        const amount = Number(transaction.amount) || 0;
        const type = String(transaction.type).toUpperCase();

        if (type === "INCOME") {
            monthlyData[month].income += amount;
        } else if (type === "EXPENSE") {
            monthlyData[month].expenses += amount;
        }
    });

    const months = Object.keys(monthlyData).sort();

    const labels = months.map(month => {
        const [year, monthNumber] = month.split("-");
        return new Date(
            Number(year),
            Number(monthNumber) - 1,
            1
        ).toLocaleDateString("en-IN", {
            month: "short",
            year: "numeric"
        });
    });

    const incomeData = months.map(
        month => monthlyData[month].income
    );

    const expenseData = months.map(
        month => monthlyData[month].expenses
    );

    if (monthlyChart) {
        monthlyChart.destroy();
    }

    monthlyChart = new Chart(
        document.getElementById("monthlyChart"),
        {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Income",
                        data: incomeData,
                        backgroundColor: "#22c55e"
                    },
                    {
                        label: "Expenses",
                        data: expenseData,
                        backgroundColor: "#ef4444"
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value =>
                                "₹" + Number(value).toLocaleString("en-IN")
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: context =>
                                context.dataset.label + ": " +
                                formatMoney(context.raw)
                        }
                    }
                }
            }
        }
    );
}

// Group expenses by category
function drawCategoryChart(transactions) {
    const categoryData = {};

    transactions.forEach(transaction => {
        if (String(transaction.type).toUpperCase() !== "EXPENSE") {
            return;
        }

        const category = transaction.category || "Uncategorized";
        const amount = Number(transaction.amount) || 0;

        categoryData[category] =
            (categoryData[category] || 0) + amount;
    });

    const categories = Object.keys(categoryData);
    const amounts = categories.map(category => categoryData[category]);

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(
        document.getElementById("categoryChart"),
        {
            type: "doughnut",
            data: {
                labels: categories,
                datasets: [{
                    label: "Expenses",
                    data: amounts,
                    backgroundColor: [
                        "#3b82f6",
                        "#f97316",
                        "#a855f7",
                        "#14b8a6",
                        "#eab308",
                        "#ec4899",
                        "#64748b",
                        "#84cc16"
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom"
                    },
                    tooltip: {
                        callbacks: {
                            label: context =>
                                context.label + ": " +
                                formatMoney(context.raw)
                        }
                    }
                }
            }
        }
    );
}

loadAnalytics();
