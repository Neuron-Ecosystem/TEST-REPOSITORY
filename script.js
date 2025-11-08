// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDOaDVzzPjyYm4HWMND2XYWjLy_h4wty5s",
    authDomain: "neuron-ecosystem-2025.firebaseapp.com",
    projectId: "neuron-ecosystem-2025",
    storageBucket: "neuron-ecosystem-2025.firebasestorage.app",
    messagingSenderId: "589834476565",
    appId: "1:589834476565:web:622fe04057d33339dd421c",
    measurementId: "G-Z934BZPLG3"
};

// Инициализация Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Состояние приложения
const state = {
    currentUser: null,
    userData: {},
    openWindows: {},
    dockApps: ['browser', 'settings'],
    activeApp: null,
    isDemoMode: false
};

// Карта приложений
const apps = {
    'ai': {
        name: 'Neuron AI',
        icon: '🧠',
        url: null,
        builtin: true
    },
    'notes': {
        name: 'Neuron Notes',
        icon: '📝',
        url: 'https://neuron-p2p.ru/notes.html'
    },
    'converter': {
        name: 'Neuron Converter',
        icon: '🔄',
        url: 'https://neuron-ecosystem.github.io/Unit-Converter/'
    },
    'study': {
        name: 'Neuron Study',
        icon: '📚',
        url: 'https://neuron-ecosystem.github.io/Neuron-Study/'
    },
    'password': {
        name: 'Password Generator',
        icon: '🔐',
        url: 'https://neuron-ecosystem.github.io/Password-Generator/'
    },
    'budget': {
        name: 'Neuron Budget',
        icon: '💰',
        url: 'https://neuron-ecosystem.github.io/Neuron-Budget/'
    },
    'games': {
        name: 'Game Hub',
        icon: '🎮',
        url: 'https://neuron-ecosystem.github.io/Game-Hub/'
    },
    'tools': {
        name: 'Neuron Tools',
        icon: '🧰',
        url: 'https://neuron-ecosystem.github.io/Neuron-Tools/'
    },
    'synapse': {
        name: 'Synapse',
        icon: '🌐',
        url: 'https://neuron-ecosystem.github.io/Synapse/'
    },
    'browser': {
        name: 'Интернет',
        icon: '🌐',
        url: 'https://neuron-p2p.ru'
    },
    'settings': {
        name: 'Настройки',
        icon: '⚙️',
        url: null,
        builtin: true
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    initializeClock();
    initializeEventListeners();
    setupDemoMode();
});

// Настройка демо-режима
function setupDemoMode() {
    const demoButton = document.createElement('button');
    demoButton.textContent = 'Демо-режим';
    demoButton.style.position = 'fixed';
    demoButton.style.top = '20px';
    demoButton.style.right = '20px';
    demoButton.style.zIndex = '1001';
    demoButton.style.padding = '12px 20px';
    demoButton.style.background = 'linear-gradient(45deg, #4ecdc4, #45b7d1)';
    demoButton.style.color = 'white';
    demoButton.style.border = 'none';
    demoButton.style.borderRadius = '10px';
    demoButton.style.cursor = 'pointer';
    demoButton.style.fontWeight = '600';
    demoButton.style.boxShadow = '0 4px 15px rgba(78, 205, 196, 0.3)';
    
    demoButton.addEventListener('click', function() {
        state.isDemoMode = true;
        showDesktop();
        alert('Демо-режим активирован! Используйте любые email и пароль для входа.');
    });
    
    document.getElementById('login-modal').appendChild(demoButton);
}

// Инициализация аутентификации
function initializeAuth() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            state.currentUser = user;
            showDesktop();
            loadUserData();
        } else {
            showLoginModal();
        }
    });
}

// Показать модальное окно авторизации
function showLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
    document.getElementById('desktop').style.display = 'none';
}

// Показать рабочий стол
function showDesktop() {
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('desktop').style.display = 'block';
    initializeDock();
}

// Инициализация часов
function initializeClock() {
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        document.getElementById('clock').textContent = timeString;
    }
    
    updateClock();
    setInterval(updateClock, 1000);
}

// Инициализация обработчиков событий
function initializeEventListeners() {
    // Кнопка входа
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    
    // Кнопка входа через Google
    document.getElementById('google-login').addEventListener('click', handleGoogleLogin);
    
    // Ссылка регистрации
    document.getElementById('register-link').addEventListener('click', function(e) {
        e.preventDefault();
        handleRegister();
    });
    
    // Обработка Enter в полях ввода
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    // Иконки рабочего стола
    document.querySelectorAll('.desktop-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
            const appId = e.currentTarget.dataset.app;
            openApp(appId);
        });
        
        icon.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, e.currentTarget.dataset.app);
        });
    });
    
    // Элементы меню приложений
    document.querySelectorAll('.app-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const appId = e.currentTarget.dataset.app;
            openApp(appId);
            hideStartMenu();
        });
    });
    
    // Поиск приложений
    document.getElementById('app-search').addEventListener('input', filterApps);
    
    // Закрытие контекстного меню
    document.addEventListener('click', hideContextMenu);
    
    // Закрытие меню "Пуск" при клике вне его
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.start-menu') && !e.target.closest('.dock-item[data-app="start"]')) {
            hideStartMenu();
        }
    });
}

// Обработка входа
function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
    // Показываем индикатор загрузки
    const loginBtn = document.getElementById('login-btn');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Вход...';
    loginBtn.disabled = true;
    
    // Если демо-режим, просто показываем рабочий стол
    if (state.isDemoMode) {
        setTimeout(() => {
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
            showDesktop();
        }, 1000);
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
        })
        .catch((error) => {
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
            
            let errorMessage = 'Ошибка входа: ';
            switch(error.code) {
                case 'auth/invalid-email':
                    errorMessage += 'Неверный формат email';
                    break;
                case 'auth/user-disabled':
                    errorMessage += 'Аккаунт отключен';
                    break;
                case 'auth/user-not-found':
                    errorMessage += 'Пользователь не найден';
                    break;
                case 'auth/wrong-password':
                    errorMessage += 'Неверный пароль';
                    break;
                case 'auth/too-many-requests':
                    errorMessage += 'Слишком много попыток. Попробуйте позже';
                    break;
                default:
                    errorMessage += error.message;
            }
            alert(errorMessage);
        });
}

// Обработка входа через Google
function handleGoogleLogin() {
    // Показываем индикатор загрузки
    const googleBtn = document.getElementById('google-login');
    const originalText = googleBtn.innerHTML;
    googleBtn.innerHTML = '<span>Вход через Google...</span>';
    googleBtn.disabled = true;

    // Если демо-режим, просто показываем рабочий стол
    if (state.isDemoMode) {
        setTimeout(() => {
            googleBtn.innerHTML = originalText;
            googleBtn.disabled = false;
            showDesktop();
        }, 1000);
        return;
    }

    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        
        auth.signInWithPopup(provider)
            .then((result) => {
                googleBtn.innerHTML = originalText;
                googleBtn.disabled = false;
            })
            .catch((error) => {
                googleBtn.innerHTML = originalText;
                googleBtn.disabled = false;
                
                if (error.code === 'auth/operation-not-supported-in-this-environment') {
                    if (confirm('Google аутентификация не настроена. Хотите войти в демо-режим?')) {
                        state.isDemoMode = true;
                        showDesktop();
                    }
                } else {
                    alert('Ошибка входа через Google: ' + error.message);
                }
            });
    } catch (error) {
        googleBtn.innerHTML = originalText;
        googleBtn.disabled = false;
        if (confirm('Google аутентификация недоступна. Хотите войти в демо-режим?')) {
            state.isDemoMode = true;
            showDesktop();
        }
    }
}

// Обработка регистрации
function handleRegister() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        alert('Пожалуйста, заполните все поля для регистрации');
        return;
    }
    
    // Показываем индикатор загрузки
    const loginBtn = document.getElementById('login-btn');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Регистрация...';
    loginBtn.disabled = true;

    // Если демо-режим, просто показываем рабочий стол
    if (state.isDemoMode) {
        setTimeout(() => {
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
            showDesktop();
            alert('Регистрация успешна! Добро пожаловать в Neuron OS!');
        }, 1000);
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
            alert('Регистрация успешна! Добро пожаловать в Neuron OS!');
        })
        .catch((error) => {
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
            
            let errorMessage = 'Ошибка регистрации: ';
            switch(error.code) {
                case 'auth/email-already-in-use':
                    errorMessage += 'Email уже используется';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Неверный формат email';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage += 'Регистрация по email отключена';
                    break;
                case 'auth/weak-password':
                    errorMessage += 'Пароль слишком слабый';
                    break;
                default:
                    errorMessage += error.message;
            }
            alert(errorMessage);
        });
}

// Инициализация Dock
function initializeDock() {
    const dockItems = document.querySelector('.dock-items');
    
    // Очищаем все элементы кроме браузера
    const browserItem = dockItems.querySelector('.dock-item[data-app="browser"]');
    dockItems.innerHTML = '';
    dockItems.appendChild(browserItem);
    
    // Добавляем закрепленные приложения
    state.dockApps.forEach(appId => {
        if (appId !== 'browser') {
            addAppToDock(appId);
        }
    });
    
    // Добавляем обработчики для элементов Dock
    dockItems.querySelectorAll('.dock-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const appId = e.currentTarget.dataset.app;
            if (appId === 'browser') {
                window.open('https://neuron-p2p.ru', '_blank');
            } else {
                toggleAppWindow(appId);
            }
        });
    });
}

// Добавить приложение в Dock
function addAppToDock(appId) {
    const app = apps[appId];
    if (!app) return;
    
    const dockItems = document.querySelector('.dock-items');
    const dockItem = document.createElement('div');
    dockItem.className = 'dock-item';
    dockItem.dataset.app = appId;
    
    dockItem.innerHTML = `
        <div class="dock-icon">${app.icon}</div>
        <div class="active-indicator" style="display: none;"></div>
    `;
    
    dockItems.appendChild(dockItem);
    
    // Добавляем обработчик
    dockItem.addEventListener('click', (e) => {
        toggleAppWindow(appId);
    });
}

// Открыть приложение
function openApp(appId) {
    const app = apps[appId];
    if (!app) return;
    
    // Если приложение уже открыто, активируем его
    if (state.openWindows[appId]) {
        bringWindowToFront(appId);
        return;
    }
    
    // Создаем окно
    createAppWindow(appId);
    
    // Добавляем в Dock если еще нет
    if (!state.dockApps.includes(appId)) {
        state.dockApps.push(appId);
        addAppToDock(appId);
        saveUserData();
    }
    
    // Обновляем активный индикатор
    updateActiveApp(appId);
}

// Переключить окно приложения (открыть/свернуть)
function toggleAppWindow(appId) {
    if (state.openWindows[appId]) {
        if (state.openWindows[appId].classList.contains('minimized')) {
            // Восстановить окно
            state.openWindows[appId].classList.remove('minimized');
            bringWindowToFront(appId);
        } else {
            // Свернуть окно
            state.openWindows[appId].classList.add('minimized');
            updateActiveIndicator(appId, false);
        }
    } else {
        // Открыть окно
        openApp(appId);
    }
}

// Создать окно приложения
function createAppWindow(appId) {
    const app = apps[appId];
    const windowsContainer = document.getElementById('windows-container');
    
    const windowElement = document.createElement('div');
    windowElement.className = 'window';
    windowElement.dataset.app = appId;
    windowElement.style.left = '50px';
    windowElement.style.top = '50px';
    
    // Для встроенных приложений создаем специальный контент
    if (app.builtin) {
        windowElement.innerHTML = `
            <div class="window-header">
                <div class="window-title">
                    <span>${app.icon}</span>
                    <span>${app.name}</span>
                </div>
                <div class="window-controls">
                    <div class="window-control minimize"></div>
                    <div class="window-control maximize"></div>
                    <div class="window-control close"></div>
                </div>
            </div>
            <div class="window-content">
                ${getBuiltinAppContent(appId)}
            </div>
        `;
    } else {
        windowElement.innerHTML = `
            <div class="window-header">
                <div class="window-title">
                    <span>${app.icon}</span>
                    <span>${app.name}</span>
                </div>
                <div class="window-controls">
                    <div class="window-control minimize"></div>
                    <div class="window-control maximize"></div>
                    <div class="window-control close"></div>
                </div>
            </div>
            <div class="window-content">
                <iframe src="${app.url}" frameborder="0"></iframe>
            </div>
        `;
    }
    
    windowsContainer.appendChild(windowElement);
    state.openWindows[appId] = windowElement;
    
    // Добавляем обработчики для управления окном
    initializeWindowControls(windowElement, appId);
    
    // Делаем окно перетаскиваемым
    makeWindowDraggable(windowElement);
    
    return windowElement;
}

// Получить контент для встроенного приложения
function getBuiltinAppContent(appId) {
    switch(appId) {
        case 'ai':
            return `
                <div style="padding: 20px; height: 100%; display: flex; flex-direction: column;">
                    <div id="ai-chat" style="flex: 1; overflow-y: auto; margin-bottom: 20px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 10px;">
                        <div class="ai-message">
                            <strong>Neuron AI:</strong> Привет! Я ваш AI-помощник. Чем могу помочь?
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="ai-input" placeholder="Введите команду или вопрос..." style="flex: 1; padding: 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; background: rgba(255,255,255,0.1); color: white;">
                        <button id="ai-send" style="padding: 10px 20px; background: #4ecdc4; border: none; border-radius: 10px; color: white; cursor: pointer;">Отправить</button>
                    </div>
                </div>
            `;
        case 'settings':
            return `
                <div style="padding: 20px; height: 100%; overflow-y: auto;">
                    <h3 style="margin-bottom: 20px;">Настройки системы</h3>
                    
                    <div class="setting-section" style="margin-bottom: 30px;">
                        <h4 style="margin-bottom: 15px;">Обои</h4>
                        <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 15px;">
                            <div class="wallpaper-preview active" data-wallpaper="default" style="width: 120px; height: 80px; background: linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%); border-radius: 10px; cursor: pointer; border: 2px solid #4ecdc4;"></div>
                            <div class="wallpaper-preview" data-wallpaper="space" style="width: 120px; height: 80px; background: linear-gradient(135deg, #000428 0%, #004e92 100%); border-radius: 10px; cursor: pointer;"></div>
                            <div class="wallpaper-preview" data-wallpaper="nature" style="width: 120px; height: 80px; background: linear-gradient(135deg, #134E5E 0%, #71B280 100%); border-radius: 10px; cursor: pointer;"></div>
                            <div class="wallpaper-preview" data-wallpaper="city" style="width: 120px; height: 80px; background: linear-gradient(135deg, #2C3E50 0%, #4CA1AF 100%); border-radius: 10px; cursor: pointer;"></div>
                        </div>
                        <input type="file" id="wallpaper-upload" accept="image/*" style="margin-bottom: 15px;">
                        <button id="apply-wallpaper" style="padding: 10px 20px; background: #4ecdc4; border: none; border-radius: 10px; color: white; cursor: pointer;">Применить обои</button>
                    </div>
                    
                    <div class="setting-section" style="margin-bottom: 30px;">
                        <h4 style="margin-bottom: 15px;">Тема</h4>
                        <div style="display: flex; gap: 15px;">
                            <button id="theme-dark" style="padding: 10px 20px; background: #333; border: none; border-radius: 10px; color: white; cursor: pointer;">Тёмная</button>
                            <button id="theme-light" style="padding: 10px 20px; background: #f0f0f0; border: none; border-radius: 10px; color: #333; cursor: pointer;">Светлая</button>
                        </div>
                    </div>
                </div>
            `;
        default:
            return `<div style="padding: 20px; text-align: center;">Приложение в разработке</div>`;
    }
}

// Инициализация управления окном
function initializeWindowControls(windowElement, appId) {
    const closeBtn = windowElement.querySelector('.window-control.close');
    const minimizeBtn = windowElement.querySelector('.window-control.minimize');
    const maximizeBtn = windowElement.querySelector('.window-control.maximize');
    
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeApp(appId);
    });
    
    minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        minimizeApp(appId);
    });
    
    maximizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        maximizeApp(appId);
    });
    
    // Активируем окно при клике
    windowElement.addEventListener('mousedown', () => {
        bringWindowToFront(appId);
    });
    
    // Инициализация специального контента
    if (appId === 'ai') {
        initializeAIChat();
    } else if (appId === 'settings') {
        initializeSettings();
    }
}

// Сделать окно перетаскиваемым
function makeWindowDraggable(windowElement) {
    const header = windowElement.querySelector('.window-header');
    let isDragging = false;
    let offsetX, offsetY;
    
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - windowElement.offsetLeft;
        offsetY = e.clientY - windowElement.offsetTop;
        bringWindowToFront(windowElement.dataset.app);
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        
        // Ограничиваем перемещение в пределах экрана
        const maxX = window.innerWidth - windowElement.offsetWidth;
        const maxY = window.innerHeight - windowElement.offsetHeight - 70; // Учитываем Dock
        
        windowElement.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
        windowElement.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
        windowElement.style.transform = 'none';
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// Закрыть приложение
function closeApp(appId) {
    if (state.openWindows[appId]) {
        state.openWindows[appId].remove();
        delete state.openWindows[appId];
        updateActiveIndicator(appId, false);
    }
}

// Свернуть приложение
function minimizeApp(appId) {
    if (state.openWindows[appId]) {
        state.openWindows[appId].classList.add('minimized');
        updateActiveIndicator(appId, false);
    }
}

// Развернуть приложение
function maximizeApp(appId) {
    if (state.openWindows[appId]) {
        state.openWindows[appId].classList.toggle('maximized');
    }
}

// Переместить окно на передний план
function bringWindowToFront(appId) {
    if (!state.openWindows[appId]) return;
    
    // Убираем активность у всех окон
    Object.values(state.openWindows).forEach(window => {
        window.style.zIndex = 10;
    });
    
    // Устанавливаем активное окно поверх остальных
    state.openWindows[appId].style.zIndex = 20;
    updateActiveApp(appId);
}

// Обновить активное приложение
function updateActiveApp(appId) {
    state.activeApp = appId;
    updateActiveIndicator(appId, true);
}

// Обновить индикатор активности в Dock
function updateActiveIndicator(appId, isActive) {
    const dockItem = document.querySelector(`.dock-item[data-app="${appId}"]`);
    if (dockItem) {
        const indicator = dockItem.querySelector('.active-indicator');
        if (indicator) {
            indicator.style.display = isActive ? 'block' : 'none';
        }
    }
}

// Показать контекстное меню
function showContextMenu(e, appId) {
    const contextMenu = document.getElementById('context-menu');
    contextMenu.style.display = 'block';
    contextMenu.style.left = e.pageX + 'px';
    contextMenu.style.top = e.pageY + 'px';
    
    // Устанавливаем appId для контекстного меню
    contextMenu.dataset.targetApp = appId;
    
    // Добавляем обработчики для пунктов меню
    const menuItems = contextMenu.querySelectorAll('.context-item');
    menuItems.forEach(item => {
        item.onclick = () => handleContextMenuAction(item.dataset.action, appId);
    });
}

// Скрыть контекстное меню
function hideContextMenu() {
    document.getElementById('context-menu').style.display = 'none';
}

// Обработка действий контекстного меню
function handleContextMenuAction(action, appId) {
    const app = apps[appId];
    
    switch(action) {
        case 'pin':
            if (!state.dockApps.includes(appId)) {
                state.dockApps.push(appId);
                addAppToDock(appId);
                saveUserData();
            }
            break;
            
        case 'open-tab':
            if (app.url) {
                window.open(app.url, '_blank');
            }
            break;
            
        case 'ask-ai':
            openApp('ai');
            // Здесь можно добавить логику для автоматического запроса к ИИ
            setTimeout(() => {
                const aiInput = document.getElementById('ai-input');
                if (aiInput) {
                    aiInput.value = `Расскажи о приложении ${app.name}`;
                    document.getElementById('ai-send').click();
                }
            }, 500);
            break;
    }
    
    hideContextMenu();
}

// Показать меню "Пуск"
function showStartMenu() {
    document.getElementById('start-menu').style.display = 'block';
}

// Скрыть меню "Пуск"
function hideStartMenu() {
    document.getElementById('start-menu').style.display = 'none';
}

// Фильтрация приложений в меню "Пуск"
function filterApps() {
    const searchTerm = document.getElementById('app-search').value.toLowerCase();
    const appItems = document.querySelectorAll('.app-item');
    
    appItems.forEach(item => {
        const appName = item.querySelector('span').textContent.toLowerCase();
        if (appName.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Инициализация чата с ИИ
function initializeAIChat() {
    const sendBtn = document.getElementById('ai-send');
    const input = document.getElementById('ai-input');
    
    if (!sendBtn || !input) return;
    
    const sendMessage = () => {
        const message = input.value.trim();
        if (!message) return;
        
        addAIMessage('user', message);
        input.value = '';
        
        // Имитация ответа ИИ
        setTimeout(() => {
            const response = generateAIResponse(message);
            addAIMessage('ai', response);
        }, 1000);
    };
    
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

// Добавить сообщение в чат ИИ
function addAIMessage(sender, text) {
    const chat = document.getElementById('ai-chat');
    if (!chat) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message';
    messageDiv.innerHTML = `<strong>${sender === 'user' ? 'Вы' : 'Neuron AI'}:</strong> ${text}`;
    messageDiv.style.marginBottom = '10px';
    messageDiv.style.padding = '8px';
    messageDiv.style.background = sender === 'user' ? 'rgba(78, 205, 196, 0.2)' : 'rgba(255, 255, 255, 0.1)';
    messageDiv.style.borderRadius = '8px';
    
    chat.appendChild(messageDiv);
    chat.scrollTop = chat.scrollHeight;
}

// Генерация ответа ИИ
function generateAIResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('привет') || lowerMessage.includes('hello')) {
        return 'Привет! Я Neuron AI, ваш виртуальный помощник. Чем могу помочь?';
    }
    
    if (lowerMessage.includes('конвертер') || lowerMessage.includes('converter')) {
        return 'Neuron Converter - это мощный инструмент для конвертации валют, единиц измерения и температур. Он позволяет быстро переводить значения между различными системами измерений.';
    }
    
    if (lowerMessage.includes('заметк') || lowerMessage.includes('notes')) {
        return 'Neuron Notes - это умные заметки с синхронизацией между устройствами. Вы можете создавать, редактировать и организовывать свои заметки, которые будут доступны на всех ваших устройствах.';
    }
    
    if (lowerMessage.includes('бюджет') || lowerMessage.includes('budget')) {
        return 'Neuron Budget помогает отслеживать ваши доходы и расходы. Вы можете устанавливать финансовые цели, категоризировать траты и анализировать свои финансовые привычки.';
    }
    
    if (lowerMessage.includes('игр') || lowerMessage.includes('game')) {
        return 'Game Hub - это коллекция увлекательных игр для развлечения в перерывах между работой. От классических головоломок до аркадных игр - найдется развлечение для каждого.';
    }
    
    if (lowerMessage.includes('инструмент') || lowerMessage.includes('tools')) {
        return 'Neuron Tools - это набор полезных утилит для повседневных задач. От калькулятора и таймера до генератора паролей и системных мониторов.';
    }
    
    if (lowerMessage.includes('/help')) {
        return 'Доступные команды:\n/open notes - открыть заметки\n/convert 100 USD RUB - конвертировать валюту\n/theme dark - сменить тему\n/help - показать справку\n/about - информация о системе';
    }
    
    if (lowerMessage.includes('/about')) {
        return 'Neuron OS - веб-операционная система с современным интерфейсом. Версия 1.0. Разработана Neuron Ecosystem.';
    }
    
    return 'Я пока не научился отвечать на этот вопрос. Попробуйте спросить о функциях Neuron OS или используйте команду /help для списка доступных команд.';
}

// Инициализация настроек
function initializeSettings() {
    // Предпросмотр обоев
    document.querySelectorAll('.wallpaper-preview').forEach(preview => {
        preview.addEventListener('click', function() {
            document.querySelectorAll('.wallpaper-preview').forEach(p => {
                p.style.border = 'none';
            });
            this.style.border = '2px solid #4ecdc4';
            
            // Применяем выбранные обои
            const wallpaper = this.dataset.wallpaper;
            applyWallpaper(wallpaper);
        });
    });
    
    // Загрузка пользовательских обоев
    document.getElementById('wallpaper-upload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const wallpaper = document.querySelector('.wallpaper');
                wallpaper.style.backgroundImage = `url(${event.target.result})`;
                wallpaper.style.backgroundSize = 'cover';
                wallpaper.style.backgroundPosition = 'center';
                alert('Обои загружены и применены!');
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Применение обоев
    document.getElementById('apply-wallpaper').addEventListener('click', function() {
        const activeWallpaper = document.querySelector('.wallpaper-preview.active');
        if (activeWallpaper) {
            applyWallpaper(activeWallpaper.dataset.wallpaper);
        }
        alert('Обои применены!');
    });
    
    // Смена темы
    document.getElementById('theme-dark').addEventListener('click', function() {
        document.body.style.filter = 'none';
        alert('Тёмная тема применена!');
    });
    
    document.getElementById('theme-light').addEventListener('click', function() {
        alert('Светлая тема будет реализована в будущих версиях');
    });
}

// Применить обои
function applyWallpaper(wallpaperType) {
    const wallpaper = document.querySelector('.wallpaper');
    
    switch(wallpaperType) {
        case 'default':
            wallpaper.style.background = 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)';
            break;
        case 'space':
            wallpaper.style.background = 'linear-gradient(135deg, #000428 0%, #004e92 100%)';
            break;
        case 'nature':
            wallpaper.style.background = 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)';
            break;
        case 'city':
            wallpaper.style.background = 'linear-gradient(135deg, #2C3E50 0%, #4CA1AF 100%)';
            break;
    }
}

// Загрузка данных пользователя
function loadUserData() {
    if (!state.currentUser || state.isDemoMode) return;
    
    db.collection('users').doc(state.currentUser.uid).get()
        .then((doc) => {
            if (doc.exists) {
                state.userData = doc.data();
                applyUserPreferences();
            }
        })
        .catch((error) => {
            console.error('Ошибка загрузки данных:', error);
        });
}

// Сохранение данных пользователя
function saveUserData() {
    if (!state.currentUser || state.isDemoMode) return;
    
    db.collection('users').doc(state.currentUser.uid).set({
        dockApps: state.dockApps,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
    .catch((error) => {
        console.error('Ошибка сохранения данных:', error);
    });
}

// Применение пользовательских настроек
function applyUserPreferences() {
    if (state.userData.dockApps) {
        state.dockApps = state.userData.dockApps;
        initializeDock();
    }
}

// Регистрация Service Worker для офлайн-режима
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Экспорт функций для глобального доступа
window.openApp = openApp;
window.showStartMenu = showStartMenu;
window.hideStartMenu = hideStartMenu;
