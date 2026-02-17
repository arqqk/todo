// Класс приложения
class TodoApp {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.draggedItem = null;
        this.theme = localStorage.getItem('theme') || 'light';
        
        this.init();
    }
    
    init() {
        console.log('App initializing...'); // Отладка
        
        // Загрузка задач из localStorage
        this.loadTasks();
        
        // Получение ссылок на элементы DOM
        this.cacheElements();
        
        // Проверка, что элементы найдены
        if (!this.checkElements()) {
            console.error('Critical elements not found!');
            return;
        }
        
        // Установка темы
        this.setTheme(this.theme);
        
        // Добавление обработчиков событий
        this.bindEvents();
        
        // Обновление статистики и отрисовка задач
        this.updateStats();
        this.renderTasks();
        
        // Проверка на iOS и показ подсказки установки
        this.checkForIOSInstall();
        
        // Регистрация сервис-воркера
        this.registerServiceWorker();
        
        console.log('App initialized successfully');
    }
    
    cacheElements() {
        this.taskInput = document.getElementById('taskInput');
        this.categorySelect = document.getElementById('categorySelect');
        this.deadlineInput = document.getElementById('deadlineInput');
        this.addBtn = document.getElementById('addTaskBtn');
        this.tasksContainer = document.getElementById('tasksContainer');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.themeToggle = document.getElementById('themeToggle');
        this.totalSpan = document.getElementById('totalTasks');
        this.completedSpan = document.getElementById('completedTasks');
        this.overdueSpan = document.getElementById('overdueTasks');
        this.installPrompt = document.getElementById('installPrompt');
        this.closePrompt = document.getElementById('closePrompt');
    }
    
    checkElements() {
        let allGood = true;
        if (!this.addBtn) { console.error('addBtn not found'); allGood = false; }
        if (!this.taskInput) { console.error('taskInput not found'); allGood = false; }
        if (!this.themeToggle) { console.error('themeToggle not found'); allGood = false; }
        return allGood;
    }
    
    bindEvents() {
        console.log('Binding events...'); // Отладка
        
        // Добавление задачи
        if (this.addBtn) {
            this.addBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.addTask();
            });
        }
        
        if (this.taskInput) {
            this.taskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addTask();
                }
            });
        }
        
        // Фильтры
        if (this.filterBtns && this.filterBtns.length > 0) {
            this.filterBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.filterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.currentFilter = btn.dataset.filter;
                    this.renderTasks();
                });
            });
        }
        
        // Смена темы
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTheme();
            });
        }
        
        // Закрытие подсказки установки
        if (this.closePrompt) {
            this.closePrompt.addEventListener('click', (e) => {
                e.preventDefault();
                this.installPrompt.style.display = 'none';
                localStorage.setItem('installPromptClosed', 'true');
            });
        }
        
        // Drag & Drop события
        if (this.tasksContainer) {
            this.tasksContainer.addEventListener('dragstart', (e) => this.handleDragStart(e));
            this.tasksContainer.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.tasksContainer.addEventListener('drop', (e) => this.handleDrop(e));
            this.tasksContainer.addEventListener('dragend', (e) => this.handleDragEnd(e));
        }
        
        // Отключаем стандартное поведение
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }
    
    addTask() {
        const text = this.taskInput.value.trim();
        if (!text) {
            alert('Пожалуйста, введите задачу');
            return;
        }
        
        const deadline = this.deadlineInput.value || null;
        
        const task = {
            id: Date.now().toString(),
            text: text,
            category: this.categorySelect.value,
            deadline: deadline,
            completed: false,
            createdAt: new Date().toISOString(),
            order: this.tasks.length
        };
        
        this.tasks.push(task);
        this.saveTasks();
        this.taskInput.value = '';
        this.deadlineInput.value = '';
        
        this.updateStats();
        this.renderTasks();
    }
    
    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.saveTasks();
        this.updateStats();
        this.renderTasks();
    }
    
    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.updateStats();
            this.renderTasks();
        }
    }
    
    handleDragStart(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        this.draggedItem = taskItem;
        taskItem.classList.add('dragging');
        e.dataTransfer.setData('text/plain', taskItem.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const taskItem = e.target.closest('.task-item');
        if (!taskItem || taskItem === this.draggedItem) return;
        
        const rect = taskItem.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        
        if (e.clientY < midY) {
            taskItem.parentNode.insertBefore(this.draggedItem, taskItem);
        } else {
            taskItem.parentNode.insertBefore(this.draggedItem, taskItem.nextSibling);
        }
    }
    
    handleDrop(e) {
        e.preventDefault();
        
        if (!this.draggedItem) return;
        
        const tasks = [...this.tasksContainer.children];
        const newOrder = [];
        
        tasks.forEach((taskEl, index) => {
            const taskId = taskEl.dataset.id;
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                task.order = index;
                newOrder.push(task);
            }
        });
        
        this.tasks = newOrder;
        this.saveTasks();
    }
    
    handleDragEnd(e) {
        const taskItem = e.target.closest('.task-item');
        if (taskItem) {
            taskItem.classList.remove('dragging');
        }
        this.draggedItem = null;
    }
    
    getFilteredTasks() {
        if (this.currentFilter === 'all') {
            return this.tasks;
        }
        return this.tasks.filter(task => task.category === this.currentFilter);
    }
    
    getDeadlineStatus(deadline) {
        if (!deadline) return null;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const taskDate = new Date(deadline);
        taskDate.setHours(0, 0, 0, 0);
        
        if (taskDate < today) return 'overdue';
        if (taskDate.getTime() === today.getTime()) return 'today';
        return 'future';
    }
    
    formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Сегодня';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Завтра';
        } else {
            return date.toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'short' 
            });
        }
    }
    
    renderTasks() {
        if (!this.tasksContainer) return;
        
        const filteredTasks = this.getFilteredTasks();
        filteredTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        this.tasksContainer.innerHTML = filteredTasks.map(task => {
            const deadlineStatus = this.getDeadlineStatus(task.deadline);
            const deadlineClass = deadlineStatus === 'overdue' ? 'urgent' : '';
            const taskClass = deadlineStatus === 'overdue' ? 'overdue' : 
                             deadlineStatus === 'today' ? 'today' : '';
            
            return `
                <div class="task-item ${task.completed ? 'completed' : ''} ${taskClass}" 
                     draggable="true" 
                     data-id="${task.id}">
                    <div class="task-content">
                        <div class="task-checkbox ${task.completed ? 'completed' : ''}" 
                             onclick="app.toggleTask('${task.id}')">
                            ${task.completed ? '✓' : ''}
                        </div>
                        <div class="task-info">
                            <div class="task-text">${this.escapeHtml(task.text)}</div>
                            <div class="task-meta">
                                <span class="task-category" data-category="${task.category}">
                                    ${task.category}
                                </span>
                                ${task.deadline ? `
                                    <span class="task-deadline ${deadlineClass}">
                                        📅 ${this.formatDate(task.deadline)}
                                        ${deadlineStatus === 'overdue' ? ' (Просрочено)' : ''}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                        <div class="task-actions">
                            <button class="task-delete" onclick="app.deleteTask('${task.id}')">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const overdue = this.tasks.filter(t => {
            if (!t.deadline || t.completed) return false;
            const taskDate = new Date(t.deadline);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate < today;
        }).length;
        
        if (this.totalSpan) this.totalSpan.textContent = total;
        if (this.completedSpan) this.completedSpan.textContent = completed;
        if (this.overdueSpan) this.overdueSpan.textContent = overdue;
    }
    
    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        this.updateStats();
    }
    
    loadTasks() {
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
            this.tasks = JSON.parse(savedTasks);
        }
    }
    
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.setTheme(this.theme);
        localStorage.setItem('theme', this.theme);
    }
    
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        if (this.themeToggle) {
            this.themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    checkForIOSInstall() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isInStandalone = window.navigator.standalone;
        const promptClosed = localStorage.getItem('installPromptClosed');
        
        if (isIOS && !isInStandalone && !promptClosed && this.installPrompt) {
            setTimeout(() => {
                this.installPrompt.style.display = 'block';
            }, 2000);
        }
    }
    
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('service-worker.js')
                    .then(registration => {
                        console.log('ServiceWorker зарегистрирован:', registration.scope);
                    })
                    .catch(error => {
                        console.log('Ошибка регистрации ServiceWorker:', error);
                    });
            });
        }
    }
}

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, creating app...');
    window.app = new TodoApp();
});
