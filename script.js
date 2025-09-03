document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const expenseForm = document.getElementById('expense-form');
    const depositForm = document.getElementById('deposit-form');
    const personForm = document.getElementById('person-form');
    const transactionsList = document.getElementById('transactions-list');
    const peopleList = document.getElementById('people-list');
    const balanceList = document.getElementById('balance-list');
    const settlementList = document.getElementById('settlement-list');
    const paidBySelect = document.getElementById('paid-by');
    const depositedBySelect = document.getElementById('deposited-by');
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');
    
    // Data
    let people = JSON.parse(localStorage.getItem('tourPeople')) || [];
    let transactions = JSON.parse(localStorage.getItem('tourTransactions')) || [];
    
    // Initialize the app
    initApp();
    
    // Initialize the application
    function initApp() {
        updatePeopleList();
        updatePersonSelects();
        updateTransactionsList();
        updateSummary();
        updateBalances();
        updateSettlements();
    }
    
    // Add person event
    personForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const nameInput = document.getElementById('person-name');
        const name = nameInput.value.trim();
        
        if (name === '') {
            showNotification('Please enter a name', 'error');
            return;
        }
        
        if (personForm.hasAttribute('data-editing-id')) {
            const id = parseInt(personForm.getAttribute('data-editing-id'));
            const person = people.find(p => p.id === id);
            if (person) {
                if (people.some(p => p.id !== id && p.name.toLowerCase() === name.toLowerCase())) {
                    showNotification('Person name already exists', 'error');
                    return;
                }
                person.name = name;
                saveData();
                updatePeopleList();
                updatePersonSelects();
                updateTransactionsList();
                showNotification('Person updated successfully');
            }
            personForm.removeAttribute('data-editing-id');
            const btn = personForm.querySelector('button');
            btn.textContent = 'Add Person';
            btn.classList.remove('btn-warning');
        } else {
            if (people.some(person => person.name.toLowerCase() === name.toLowerCase())) {
                showNotification('Person already exists', 'error');
                return;
            }
            
            const person = {
                id: Date.now(),
                name: name,
                totalPaid: 0,
                balance: 0
            };
            
            people.push(person);
            saveData();
            updatePeopleList();
            updatePersonSelects();
            showNotification('Person added successfully');
        }
        
        nameInput.value = '';
    });
    
    // Add expense event
    expenseForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const description = document.getElementById('description').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const paidBy = document.getElementById('paid-by').value;
        
        if (description === '' || isNaN(amount) || amount <= 0) {
            showNotification('Please enter valid expense details', 'error');
            return;
        }
        
        if (paidBy === '') {
            showNotification('Please select who paid for this expense', 'error');
            return;
        }
        
        const paidById = paidBy === 'balance' ? null : parseInt(paidBy);
        
        const editingId = expenseForm.hasAttribute('data-editing-id') ? parseInt(expenseForm.getAttribute('data-editing-id')) : null;
        
        if (paidById === null) {
            if (!canAffordFromBalance(amount, editingId)) {
                showNotification('Insufficient funds in balance', 'error');
                return;
            }
        }
        
        if (expenseForm.hasAttribute('data-editing-id')) {
            const trans = transactions.find(t => t.id === editingId);
            if (trans) {
                const oldPaidByPerson = trans.paidBy !== null ? people.find(p => p.id === trans.paidBy) : null;
                if (oldPaidByPerson) {
                    oldPaidByPerson.totalPaid -= trans.amount;
                }
                trans.description = description;
                trans.amount = amount;
                trans.paidBy = paidById;
                const newPaidByPerson = paidById !== null ? people.find(p => p.id === paidById) : null;
                if (newPaidByPerson) {
                    newPaidByPerson.totalPaid += amount;
                }
                saveData();
                updateTransactionsList();
                updateSummary();
                updateBalances();
                updateSettlements();
                showNotification('Expense updated successfully');
            }
            expenseForm.removeAttribute('data-editing-id');
            const btn = expenseForm.querySelector('button');
            btn.textContent = 'Add Expense';
            btn.classList.remove('btn-warning');
        } else {
            const transaction = {
                id: Date.now(),
                description,
                amount,
                paidBy: paidById,
                date: new Date().toISOString(),
                type: 'expense'
            };
            
            transactions.push(transaction);
            
            const paidByPerson = paidById !== null ? people.find(person => person.id === paidById) : null;
            if (paidByPerson) {
                paidByPerson.totalPaid += amount;
            }
            
            saveData();
            updateTransactionsList();
            updateSummary();
            updateBalances();
            updateSettlements();
            
            showNotification('Expense added successfully');
        }
        
        expenseForm.reset();
    });
    
    // Add deposit event
    depositForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const description = document.getElementById('deposit-description').value.trim();
        const amount = parseFloat(document.getElementById('deposit-amount').value);
        const depositedById = parseInt(document.getElementById('deposited-by').value);
        
        if (isNaN(amount) || amount <= 0) {
            showNotification('Please enter valid deposit amount', 'error');
            return;
        }
        
        if (!depositedById) {
            showNotification('Please select who deposited', 'error');
            return;
        }
        
        if (depositForm.hasAttribute('data-editing-id')) {
            const id = parseInt(depositForm.getAttribute('data-editing-id'));
            const trans = transactions.find(t => t.id === id);
            if (trans) {
                const oldPaidBy = people.find(p => p.id === trans.paidBy);
                if (oldPaidBy) {
                    oldPaidBy.totalPaid -= trans.amount;
                }
                trans.description = description || 'Advance deposit';
                trans.amount = amount;
                trans.paidBy = depositedById;
                const newPaidBy = people.find(p => p.id === depositedById);
                if (newPaidBy) {
                    newPaidBy.totalPaid += amount;
                }
                saveData();
                updateTransactionsList();
                updateSummary();
                updateBalances();
                updateSettlements();
                showNotification('Deposit updated successfully');
            }
            depositForm.removeAttribute('data-editing-id');
            const btn = depositForm.querySelector('button');
            btn.textContent = 'Add Deposit';
            btn.classList.remove('btn-warning');
        } else {
            const transaction = {
                id: Date.now(),
                description: description || 'Advance deposit',
                amount,
                paidBy: depositedById,
                date: new Date().toISOString(),
                type: 'deposit'
            };
            
            transactions.push(transaction);
            
            const depositedByPerson = people.find(person => person.id === depositedById);
            if (depositedByPerson) {
                depositedByPerson.totalPaid += amount;
            }
            
            saveData();
            updateTransactionsList();
            updateSummary();
            updateBalances();
            updateSettlements();
            
            showNotification('Deposit added successfully');
        }
        
        depositForm.reset();
    });
    
    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Deactivate all tabs
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // Activate current tab
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // Export data
    exportBtn.addEventListener('click', function() {
        const data = {
            people: people,
            transactions: transactions
        };
        
        const dataStr = JSON.stringify(data);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'tour-data.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        showNotification('Data exported successfully');
    });
    
    // Import data
    importBtn.addEventListener('click', function() {
        importFile.click();
    });
    
    importFile.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.people && data.transactions) {
                    people = data.people;
                    transactions = data.transactions;
                    
                    // Migrate old expenses if needed
                    transactions.forEach(t => {
                        if (!t.type) t.type = 'expense';
                    });
                    
                    saveData();
                    initApp();
                    showNotification('Data imported successfully');
                } else {
                    showNotification('Invalid data format', 'error');
                }
            } catch (error) {
                showNotification('Error parsing file', 'error');
            }
        };
        reader.readAsText(file);
        
        // Reset the file input
        importFile.value = '';
    });
    
    // Update people list
    function updatePeopleList() {
        if (people.length === 0) {
            peopleList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No people added yet</p>
                    <p>Add people to your group</p>
                </div>
            `;
            return;
        }
        
        peopleList.innerHTML = '';
        people.forEach(person => {
            const personCard = document.createElement('div');
            personCard.classList.add('person-card');
            personCard.innerHTML = `
                <h4>${person.name}</h4>
                <div>Paid: ${person.totalPaid.toFixed(2)} Tk</div>
                <div class="balance ${person.balance >= 0 ? 'positive' : 'negative'}">
                    ${person.balance >= 0 ? 'Owes' : 'Owed'}: ${Math.abs(person.balance).toFixed(2)} Tk
                </div>
                <button class="edit-btn" data-id="${person.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" data-id="${person.id}"><i class="fas fa-trash"></i></button>
            `;
            peopleList.appendChild(personCard);
        });
        
        // Add event listeners to edit buttons
        document.querySelectorAll('.person-card .edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                const person = people.find(p => p.id === id);
                if (person) {
                    document.getElementById('person-name').value = person.name;
                    const btn = personForm.querySelector('button');
                    btn.textContent = 'Update Person';
                    btn.classList.add('btn-warning');
                    personForm.setAttribute('data-editing-id', id);
                }
            });
        });
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.person-card .delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                
                // Check if person has transactions
                const personTransactions = transactions.filter(t => t.paidBy === id);
                if (personTransactions.length > 0) {
                    showNotification('Cannot delete person with transactions', 'error');
                    return;
                }
                
                people = people.filter(person => person.id !== id);
                saveData();
                updatePeopleList();
                updatePersonSelects();
                showNotification('Person deleted successfully');
            });
        });
    }
    
    // Update person selects
    function updatePersonSelects() {
        const selects = [paidBySelect, depositedBySelect];
        selects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">Select Person</option>';
                people.forEach(person => {
                    const option = document.createElement('option');
                    option.value = person.id;
                    option.textContent = person.name;
                    select.appendChild(option);
                });
                if (select.id === 'paid-by') {
                    const balOpt = document.createElement('option');
                    balOpt.value = 'balance';
                    balOpt.textContent = 'From Balance';
                    select.appendChild(balOpt);
                }
            }
        });
    }
    
    // Update transactions list
    function updateTransactionsList() {
        if (transactions.length === 0) {
            transactionsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>No transactions yet</p>
                    <p>Add your first expense or deposit to get started</p>
                </div>
            `;
            return;
        }
        
        transactionsList.innerHTML = '';
        
        // Sort transactions by date (newest first)
        const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sortedTransactions.forEach(trans => {
            if (!trans.type) trans.type = 'expense'; // Migrate old data
            const paidByPerson = trans.paidBy !== null ? people.find(person => person.id === trans.paidBy) : null;
            const paidByName = paidByPerson ? paidByPerson.name : 'Balance';
            
            const transElement = document.createElement('div');
            transElement.classList.add('transaction-item');
            transElement.innerHTML = `
                <div class="transaction-description">${trans.description}</div>
                <div class="transaction-type">${trans.type.charAt(0).toUpperCase() + trans.type.slice(1)}</div>
                <div class="transaction-paid-by">${paidByName}</div>
                <div class="transaction-amount">${trans.amount.toFixed(2)} Tk</div>
                <button class="edit-btn" data-id="${trans.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" data-id="${trans.id}"><i class="fas fa-trash"></i></button>
            `;
            transactionsList.appendChild(transElement);
        });
        
        // Add event listeners to edit buttons
        document.querySelectorAll('.transaction-item .edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                const trans = transactions.find(t => t.id === id);
                if (trans) {
                    if (trans.type === 'expense') {
                        document.getElementById('description').value = trans.description;
                        document.getElementById('amount').value = trans.amount;
                        document.getElementById('paid-by').value = trans.paidBy !== null ? trans.paidBy : 'balance';
                        const btn = expenseForm.querySelector('button');
                        btn.textContent = 'Update Expense';
                        btn.classList.add('btn-warning');
                        expenseForm.setAttribute('data-editing-id', id);
                    } else if (trans.type === 'deposit') {
                        document.getElementById('deposit-description').value = trans.description;
                        document.getElementById('deposit-amount').value = trans.amount;
                        document.getElementById('deposited-by').value = trans.paidBy;
                        const btn = depositForm.querySelector('button');
                        btn.textContent = 'Update Deposit';
                        btn.classList.add('btn-warning');
                        depositForm.setAttribute('data-editing-id', id);
                    }
                }
            });
        });
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.transaction-item .delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                const trans = transactions.find(t => t.id === id);
                
                if (trans) {
                    // Update the person's total paid amount
                    const paidByPerson = trans.paidBy !== null ? people.find(person => person.id === trans.paidBy) : null;
                    if (paidByPerson) {
                        paidByPerson.totalPaid -= trans.amount;
                    }
                    
                    // Remove the transaction
                    transactions = transactions.filter(t => t.id !== id);
                    saveData();
                    updateTransactionsList();
                    updateSummary();
                    updateBalances();
                    updateSettlements();
                    showNotification('Transaction deleted successfully');
                }
            });
        });
    }
    
    // Compute central balance
    function computeCentralBalance(filteredTransactions) {
        let deposits = filteredTransactions.reduce((sum, t) => (t.type === 'deposit') ? sum + t.amount : sum, 0);
        let centralExpenses = filteredTransactions.reduce((sum, t) => (t.type === 'expense' && t.paidBy === null) ? sum + t.amount : sum, 0);
        return deposits - centralExpenses;
    }
    
    // Check if can afford from balance
    function canAffordFromBalance(amount, excludeTransId = null) {
        let filteredTrans = excludeTransId ? transactions.filter(t => t.id !== excludeTransId) : transactions;
        let currentCentral = computeCentralBalance(filteredTrans);
        return currentCentral >= amount;
    }
    
    // Update summary cards
    function updateSummary() {
        const totalExpenses = transactions.reduce((sum, t) => (t.type === 'expense') ? sum + t.amount : sum, 0);
        const perPerson = people.length > 0 ? totalExpenses / people.length : 0;
        const centralBalance = transactions.reduce((acc, t) => {
            if (t.type === 'deposit') return acc + t.amount;
            if (t.type === 'expense' && t.paidBy === null) return acc - t.amount;
            return acc;
        }, 0);
        
        document.getElementById('total-balance').textContent = `${centralBalance.toFixed(2)} Tk`;
        document.getElementById('total-expenses').textContent = `${totalExpenses.toFixed(2)} Tk`;
        document.getElementById('per-person').textContent = `${perPerson.toFixed(2)} Tk`;
    }
    
    // Update balances
    function updateBalances() {
        const totalExpenses = transactions.reduce((sum, t) => (t.type === 'expense') ? sum + t.amount : sum, 0);
        const perPerson = people.length > 0 ? totalExpenses / people.length : 0;
        
        // Reset totalPaid and balances
        people.forEach(person => {
            person.totalPaid = transactions.reduce((sum, t) => (t.paidBy === person.id) ? sum + t.amount : sum, 0);
            person.balance = perPerson - person.totalPaid;
        });
        
        saveData();
        
        if (people.length === 0) {
            balanceList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-balance-scale"></i>
                    <p>No balance data</p>
                    <p>Add expenses to see balances</p>
                </div>
            `;
            return;
        }
        
        balanceList.innerHTML = '';
        people.forEach(person => {
            const personCard = document.createElement('div');
            personCard.classList.add('person-card');
            personCard.innerHTML = `
                <h4>${person.name}</h4>
                <div>Paid: ${person.totalPaid.toFixed(2)} Tk</div>
                <div>Share: ${perPerson.toFixed(2)} Tk</div>
                <div class="balance ${person.balance >= 0 ? 'positive' : 'negative'}">
                    ${person.balance >= 0 ? 'Owes' : 'Owed'}: ${Math.abs(person.balance).toFixed(2)} Tk
                </div>
            `;
            balanceList.appendChild(personCard);
        });
    }
    
    // Update settlements
    function updateSettlements() {
        // Calculate settlements
        const settlements = calculateSettlements();
        
        if (settlements.length === 0) {
            settlementList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-hand-holding-usd"></i>
                    <p>No settlements needed</p>
                    <p>When balances exist, we'll suggest settlements here</p>
                </div>
            `;
            return;
        }
        
        settlementList.innerHTML = '';
        settlements.forEach(settlement => {
            const fromPerson = people.find(p => p.id === settlement.from);
            const toPerson = people.find(p => p.id === settlement.to);
            
            if (fromPerson && toPerson) {
                const settlementElement = document.createElement('div');
                settlementElement.classList.add('settlement-item');
                settlementElement.innerHTML = `
                    <div>${fromPerson.name}</div>
                    <div class="settlement-amount"><i class="fas fa-arrow-right"></i> ${settlement.amount.toFixed(2)} Tk</div>
                    <div>${toPerson.name}</div>
                `;
                settlementList.appendChild(settlementElement);
            }
        });
    }
    
    // Calculate settlements
    function calculateSettlements() {
        const settlements = [];
        const tempBalances = people.reduce((acc, p) => ({...acc, [p.id]: p.balance}), {});
        const debtors = people.filter(p => tempBalances[p.id] > 0);
        const creditors = people.filter(p => tempBalances[p.id] < 0);
        
        debtors.forEach(debtor => {
            let debt = tempBalances[debtor.id];
            
            creditors.forEach(creditor => {
                if (debt <= 0) return;
                
                let credit = -tempBalances[creditor.id];
                if (credit > 0) {
                    const amount = Math.min(debt, credit);
                    
                    settlements.push({
                        from: debtor.id,
                        to: creditor.id,
                        amount: amount
                    });
                    
                    debt -= amount;
                    tempBalances[debtor.id] = debt;
                    tempBalances[creditor.id] += amount;
                }
            });
        });
        
        return settlements;
    }
    
    // Save data to localStorage
    function saveData() {
        localStorage.setItem('tourPeople', JSON.stringify(people));
        localStorage.setItem('tourTransactions', JSON.stringify(transactions));
    }
    
    // Show notification
    function showNotification(message, type = 'success') {
        notificationText.textContent = message;
        notification.style.background = type === 'success' ? 'var(--success)' : 'var(--danger)';
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Reset all data event
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to reset all data? This will delete all people and transactions.')) {
                people = [];
                transactions = [];
                localStorage.removeItem('tourPeople');
                localStorage.removeItem('tourTransactions');
                initApp();
                showNotification('All data reset successfully');
            }
        });
    }
});