// STATE
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let goals = JSON.parse(localStorage.getItem('goals')) || [];
let currentFilter = 'all';
let chartInstance = null;

// CATEGORIES
const categories = {
    income: ['Salário', 'Barbearia', 'Investimentos', 'Outros'],
    expense: ['Comida', 'Aluguel', 'Carro', 'Lazer', 'Contas', 'Outros']
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
});

// NAVIGATION
function switchTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    // Show target tab
    document.getElementById(tabId).classList.add('active');
    
    // Update Nav Icons
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active'); // Needs event context, usually fine in inline-onclick

    // Refresh specific views if needed
    if (tabId === 'tab-charts') renderChart();
    if (tabId === 'tab-records') renderTransactions();
    if (tabId === 'tab-goals') renderGoals();
}

// MODAL LOGIC
function openModal(type) {
    const modal = document.getElementById('modal-transaction');
    const title = document.getElementById('modal-title');
    const typeInput = document.getElementById('trans-type');
    const categorySelect = document.getElementById('trans-category');

    modal.style.display = 'flex';
    typeInput.value = type;
    
    // Setup UI based on type
    if (type === 'income') {
        title.innerText = 'Nova Receita';
        title.style.color = 'var(--accent-income)';
        document.querySelector('.btn-submit').style.background = 'var(--accent-income)';
    } else {
        title.innerText = 'Nova Despesa';
        title.style.color = 'var(--accent-expense)';
        document.querySelector('.btn-submit').style.background = 'var(--accent-expense)';
    }

    // Populate Categories
    categorySelect.innerHTML = categories[type].map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function openGoalModal() {
    document.getElementById('modal-goal').style.display = 'flex';
}

function closeModal(modalName) {
    document.getElementById(`modal-${modalName}`).style.display = 'none';
}

// Close modal if clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

// TRANSACTION HANDLING
document.getElementById('transaction-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const type = document.getElementById('trans-type').value;
    const amount = parseFloat(document.getElementById('trans-amount').value);
    const category = document.getElementById('trans-category').value;
    
    if (!amount || isNaN(amount)) return alert('Digite um valor válido');

    const newTransaction = {
        id: Date.now(),
        type,
        amount,
        category,
        date: new Date().toISOString()
    };

    transactions.push(newTransaction);
    saveData();
    
    document.getElementById('transaction-form').reset();
    closeModal('transaction');
    alert(`Registrado com sucesso!`);
    updateUI();
});

// GOALS HANDLING
document.getElementById('goal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = document.getElementById('goal-title').value;
    const target = parseFloat(document.getElementById('goal-target').value);

    if (!target || isNaN(target)) return alert('Valor inválido');

    const newGoal = {
        id: Date.now(),
        title,
        target
    };

    goals.push(newGoal);
    saveData();
    
    document.getElementById('goal-form').reset();
    closeModal('goal');
    renderGoals(); // Update immediately
});


// DATA MANAGEMENT
function saveData() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('goals', JSON.stringify(goals));
}

function deleteTransaction(id) {
    if(confirm('Tem certeza que deseja excluir?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateUI();
    }
}

function deleteGoal(id) {
    if(confirm('Excluir esta meta?')) {
        goals = goals.filter(g => g.id !== id);
        saveData();
        renderGoals();
    }
}

// UI RENDERING
function updateUI() {
    renderTransactions();
    // Only render chart if visible to save resources, or pre-calc? 
    // We will render chart only when tab is clicked
    renderGoals(); // Update goals progress
}

function filterTransactions(filter) {
    currentFilter = filter;
    
    // Update buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.dataset.filter === filter) btn.classList.add('active');
    });

    renderTransactions();
}

function renderTransactions() {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';

    const filtered = transactions.filter(t => currentFilter === 'all' ? true : t.type === currentFilter);
    // Sort newest first
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>Nada encontrado.</p></div>`;
        return;
    }

    filtered.forEach(t => {
        const date = new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' });
        const el = document.createElement('div');
        el.className = `transaction-item ${t.type}`;
        el.innerHTML = `
            <div class="t-info">
                <h3>${t.category}</h3>
                <span>${date}</span>
            </div>
            <div style="display:flex; align-items:center;">
                <span class="t-amount">R$ ${t.amount.toFixed(2)}</span>
                <div class="t-actions">
                    <button class="btn-icon delete" onclick="deleteTransaction(${t.id})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
        list.appendChild(el);
    });
}

function renderGoals() {
    const list = document.getElementById('goals-list');
    list.innerHTML = '';

    if (goals.length === 0) {
        list.innerHTML = `<div class="empty-state"><p>Defina seus objetivos!</p></div>`;
        return;
    }

    // Calculate total balance (Income - Expense) to use for goals ?? 
    // OR calculate based on total Income? The prompt said "% to reach that goal based on receipts" (receitas).
    // Let's interpret "based on receipts" as Total Income vs Goal Target? Or Balance vs Goal Target?
    // Usually goals are met by savings (Balance). Let's use Balance. if Balance < 0, progress is 0.
    
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const balance = totalIncome - totalExpense;
    const currentMoney = balance > 0 ? balance : 0;

    goals.forEach(g => {
        const percent = Math.min(100, Math.floor((currentMoney / g.target) * 100));
        
        const el = document.createElement('div');
        el.className = 'goal-card';
        el.innerHTML = `
            <div class="goal-header">
                <span>${g.title}</span>
                <button class="btn-icon delete" style="font-size:0.9rem" onclick="deleteGoal(${g.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="goal-stats">
                <span>R$ ${currentMoney.toFixed(2)} de R$ ${g.target.toFixed(2)}</span>
                <span>${percent}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percent}%"></div>
            </div>
        `;
        list.appendChild(el);
    });
}

let currentChartType = 'expense'; // Default to expense

function toggleChart(type) {
    currentChartType = type;
    
    // Update buttons
    document.querySelectorAll('#tab-charts .filter-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`chart-btn-${type}`).classList.add('active');

    renderChart();
}

function renderChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    // Filter transactions by the current selected chart type
    const relevantTransactions = transactions.filter(t => t.type === currentChartType);

    // Aggregate by Category
    const dataMap = {};
    
    relevantTransactions.forEach(t => {
        if (!dataMap[t.category]) dataMap[t.category] = 0;
        dataMap[t.category] += t.amount;
    });

    const labels = Object.keys(dataMap);
    const dataValues = labels.map(l => dataMap[l]);
    
    // Colorful palette for charts
    const colors = [
        '#ff3333', '#00ff88', '#33ccff', '#b300ff', '#ffeb3b', '#ff9800', '#e91e63'
    ];
    // Shuffle or assign based on index? Simple index assignment is fine.
    const bgColors = labels.map((_, i) => colors[i % colors.length]);

    if (chartInstance) chartInstance.destroy();

    // Show empty state inside canvas if no data?
    // Chart.js handles empty data okay, but maybe we want a message.
    // implementing basic chart for now.

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: bgColors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#fff' }
                },
                title: {
                    display: true,
                    text: currentChartType === 'income' ? 'Receitas por Categoria' : 'Despesas por Categoria',
                    color: '#a0a0a0',
                    font: { size: 14 }
                }
            }
        }
    });
}
