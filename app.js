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
        // Загрузка задач из localStorage
        this.loadTasks();
        
        // Установка темы
        this.setTheme(this.theme);
        
        // Получение ссылок на элементы DOM
        this.cacheElements();
        
        // Добавление обработчиков событий
        this.bindEvents();
        
        // Обновление статистики и отрисовка задач
        this.updateStats();
        this.renderTasks();
        
        // Проверка на iOS и показ подсказки установки
        this.checkForIOSInstall();
        
        // Регистрация сервис-воркера
        this.registerServiceWorker();
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
    
    bindEvents() {
        // Добавление задачи
        this.addBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });
        
        // Фильтры
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.renderTasks();
            });
        });
        
        // Смена темы
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Закрытие подсказки установки
        if (this.closePrompt) {
            this.closePrompt.addEventListener('click', () => {
                this.installPrompt.style.display = 'none';
                localStorage.setItem('installPromptClosed', 'true');
            });
        }
        
        // Drag & Drop события
        this.tasksContainer.addEventListener('dragstart', this.handleDragStart.bind(this));
        this.tasksContainer.addEventListener('dragover', this.handleDragOver.bind(this));
        this.tasksContainer.addEventListener('drop', this.handleDrop.bind(this));
        this.tasksContainer.addEventListener('dragend', this.handleDragEnd.bind(this));
    }
    
    addTask() {
        const text = this.taskInput.value.trim();
        if (!text) return;
        
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
        
        // Анимация добавления
        setTimeout(() => {
            const newTask = document.querySelector(`[data-id="${task.id}"]`);
            if (newTask) {
                newTask.style.animation = 'slideUp 0.3s ease';
            }
        }, 10);
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
    
    // Drag & Drop обработчики
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
        
        const draggedId = this.draggedItem.dataset.id;
        const tasks = [...this.tasksContainer.children];
        
        // Обновление порядка задач
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
    
    // Фильтрация задач
    getFilteredTasks() {
        if (this.currentFilter === 'all') {
            return this.tasks;
        }
        return this.tasks.filter(task => task.category === this.currentFilter);
    }
    
    // Проверка статуса дедлайна
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
    
    // Форматирование даты
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
    
    // Отрисовка задач
    renderTasks() {
        const filteredTasks = this.getFilteredTasks();
        
        // Сортировка по порядку
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
    
    // Обновление статистики
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
        
        this.totalSpan.textContent = total;
        this.completedSpan.textContent = completed;
        this.overdueSpan.textContent = overdue;
    }
    
    // Сохранение задач в localStorage
    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        this.updateStats();
    }
    
    // Загрузка задач из localStorage
    loadTasks() {
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
            this.tasks = JSON.parse(savedTasks);
        }
    }
    
    // Переключение темы
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.setTheme(this.theme);
        localStorage.setItem('theme', this.theme);
    }
    
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    }
    
    // Экранирование HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Проверка на iOS и показ подсказки установки
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
    
    // Регистрация сервис-воркера
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
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

// Инициализация приложения
const app = new TodoApp();
window.app = app; // Для доступа из onclick