// Firebase config (вставил твой конфиг)
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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Локальное состояние
const state = {
    currentUser: null,
    openWindows: {},
    pinnedApps: [],        // закреплённые приложения (из Firestore)
    transientDock: {},     // временные иконки в доке для открытых приложений (не закреплённых)
    activeApp: null,
    isDemoMode: false
};

// Карта приложений
const apps = {
    'ai': { name: 'Neuron AI', icon: '🧠', url: null, builtin: true },
    'notes': { name: 'Neuron Notes', icon: '📝', url: 'https://neuron-p2p.ru/notes.html' },
    'converter': { name: 'Neuron Converter', icon: '🔄', url: 'https://neuron-ecosystem.github.io/Unit-Converter/' },
    'study': { name: 'Neuron Study', icon: '📚', url: 'https://neuron-ecosystem.github.io/Neuron-Study/' },
    'password': { name: 'Password Generator', icon: '🔐', url: 'https://neuron-ecosystem.github.io/Password-Generator/' },
    'budget': { name: 'Neuron Budget', icon: '💰', url: 'https://neuron-ecosystem.github.io/Neuron-Budget/' },
    'games': { name: 'Game Hub', icon: '🎮', url: 'https://neuron-ecosystem.github.io/Game-Hub/' },
    'tools': { name: 'Neuron Tools', icon: '🧰', url: 'https://neuron-ecosystem.github.io/Neuron-Tools/' },
    'synapse': { name: 'Synapse', icon: '🌐', url: 'https://neuron-ecosystem.github.io/Synapse/' },
    'browser': { name: 'Интернет', icon: '🌐', url: 'https://neuron-p2p.ru' },
    'settings': { name: 'Настройки', icon: '⚙️', url: null, builtin: true }
};

// Ключи для localStorage
const LS_USER_KEY = 'neuron_current_user';
const LS_DATA_KEY = 'neuron_user_data_backup';

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initializeClock();
    initializeEventListeners();
    checkAuthStatus();
    renderAppGrid();
});

// ----------------- AUTH -----------------
function checkAuthStatus() {
    const saved = localStorage.getItem(LS_USER_KEY);
    if (saved) {
        state.currentUser = JSON.parse(saved);
        // Проверим актуальность с Firebase
        auth.onAuthStateChanged(user => {
            if (user) {
                state.currentUser = { email: user.email, uid: user.uid };
                localStorage.setItem(LS_USER_KEY, JSON.stringify(state.currentUser));
                afterLogin();
            } else if (!state.currentUser) {
                showLoginModal();
            } else {
                // возможно демо или offline
                afterLogin();
            }
        });
    } else {
        // слушаем Firebase
        auth.onAuthStateChanged(user => {
            if (user) {
                state.currentUser = { email: user.email, uid: user.uid };
                localStorage.setItem(LS_USER_KEY, JSON.stringify(state.currentUser));
                afterLogin();
            } else {
                showLoginModal();
            }
        });
    }
}

function activateDemoMode() {
    state.isDemoMode = true;
    state.currentUser = { email: 'demo@neuron.ru', uid: 'demo-user' };
    localStorage.setItem(LS_USER_KEY, JSON.stringify(state.currentUser));
    afterLogin();
}

async function handleLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!email || !password) { alert('Пожалуйста, заполните все поля'); return; }
    try {
        const res = await auth.signInWithEmailAndPassword(email, password);
        state.currentUser = { email: res.user.email, uid: res.user.uid };
        localStorage.setItem(LS_USER_KEY, JSON.stringify(state.currentUser));
        afterLogin();
    } catch (err) {
        alert('Ошибка входа: ' + err.message);
    }
}

async function handleGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const res = await auth.signInWithPopup(provider);
        state.currentUser = { email: res.user.email, uid: res.user.uid };
        localStorage.setItem(LS_USER_KEY, JSON.stringify(state.currentUser));
        afterLogin();
    } catch (err) {
        alert('Ошибка Google входа: ' + err.message);
    }
}

async function handleRegister() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!email || !password) { alert('Пожалуйста, заполните все поля для регистрации'); return; }
    try {
        const res = await auth.createUserWithEmailAndPassword(email, password);
        state.currentUser = { email: res.user.email, uid: res.user.uid };
        localStorage.setItem(LS_USER_KEY, JSON.stringify(state.currentUser));
        // создаём документ юзера в firestore
        await db.collection('users').doc(state.currentUser.uid).set({
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            wallpaper: 'default',
            pinnedApps: ['browser', 'settings']
        }, { merge: true });
        afterLogin();
        alert('Регистрация успешна! Добро пожаловать в Neuron OS!');
    } catch (err) {
        alert('Ошибка регистрации: ' + err.message);
    }
}

async function handleLogout() {
    try {
        if (!state.isDemoMode) await auth.signOut();
    } catch(e) {
        console.warn('Ошибка при signOut', e);
    }
    // Очистим состояние и localStorage (кроме резервных бэкапов, если нужно)
    localStorage.removeItem(LS_USER_KEY);
    // оставим бэкап настроек (LS_DATA_KEY), но можем удалить если нужно
    state.currentUser = null;
    state.openWindows = {};
    state.pinnedApps = [];
    state.transientDock = {};
    state.isDemoMode = false;
    document.getElementById('desktop').style.display = 'none';
    showLoginModal();
}

// После успешного логина
async function afterLogin() {
    hideLoginModal();
    await loadUserData();
    showDesktop();
    initializeDock();
}

// ----------------- UI helpers -----------------
function showLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
    document.getElementById('desktop').style.display = 'none';
}

function hideLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
}

function showDesktop() {
    document.getElementById('desktop').style.display = 'block';
}

// ----------------- Firestore / local backup -----------------
async function loadUserData() {
    // Попытка загрузить из Firestore, иначе из localStorage
    if (!state.currentUser) return;
    const uid = state.currentUser.uid;
    try {
        const doc = await db.collection('users').doc(uid).get();
        if (doc.exists) {
            const data = doc.data();
            state.pinnedApps = Array.isArray(data.pinnedApps) ? data.pinnedApps : ['browser','settings'];
            applyWallpaperFrom(data.wallpaper || 'default');
            // Сохраняем резервную копию локально
            localStorage.setItem(LS_DATA_KEY, JSON.stringify(data));
        } else {
            // если нет — создаём дефолт
            state.pinnedApps = ['browser','settings'];
            await db.collection('users').doc(uid).set({
                wallpaper: 'default',
                pinnedApps: state.pinnedApps,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            localStorage.setItem(LS_DATA_KEY, JSON.stringify({ wallpaper: 'default', pinnedApps: state.pinnedApps }));
        }
    } catch (err) {
        console.warn('Не удалось загрузить из Firestore, пробуем localStorage', err);
        // fallback
        const backup = localStorage.getItem(LS_DATA_KEY);
        if (backup) {
            const data = JSON.parse(backup);
            state.pinnedApps = Array.isArray(data.pinnedApps) ? data.pinnedApps : ['browser','settings'];
            applyWallpaperFrom(data.wallpaper || 'default');
        } else {
            state.pinnedApps = ['browser','settings'];
            applyWallpaperFrom('default');
        }
    }
}

// Сохранить пользовательские данные в Firestore и локально
async function saveUserData() {
    if (!state.currentUser) {
        // сохраняем только локально
        const dataLocal = { pinnedApps: state.pinnedApps, wallpaper: currentWallpaper || 'default', updatedAt: new Date() };
        localStorage.setItem(LS_DATA_KEY, JSON.stringify(dataLocal));
        return;
    }
    const uid = state.currentUser.uid;
    const data = { pinnedApps: state.pinnedApps, wallpaper: currentWallpaper || 'default', updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    try {
        await db.collection('users').doc(uid).set(data, { merge: true });
        localStorage.setItem(LS_DATA_KEY, JSON.stringify(data));
    } catch (err) {
        console.warn('Ошибка записи в Firestore, сохраняем локально', err);
        localStorage.setItem(LS_DATA_KEY, JSON.stringify(data));
    }
}

// ----------------- Dock и окна -----------------
const windowsContainer = () => document.getElementById('windows-container');
const dockItemsContainer = () => document.getElementById('dock-items');

function initializeDock() {
    // Очистить док (кроме браузера)
    const dock = dockItemsContainer();
    dock.innerHTML = '';
    // Браузер всегда слева
    addDockItem('browser', true);
    // Добавляем закреплённые приложения
    state.pinnedApps.forEach(appId => {
        if (appId !== 'browser') addDockItem(appId, true);
    });
    // Если открыты временные приложения — показываем
    Object.keys(state.transientDock).forEach(appId => {
        if (!state.pinnedApps.includes(appId)) addDockItem(appId, false, true);
    });
}

// Добавить элемент в док
function addDockItem(appId, pinned = false, transient = false) {
    // если уже есть — ничего не делать
    if (document.querySelector(`.dock-item[data-app="${appId}"]`)) return;
    const app = apps[appId];
    if (!app) return;
    const el = document.createElement('div');
    el.className = 'dock-item';
    el.dataset.app = appId;
    if (pinned) el.dataset.pinned = '1';
    if (transient) el.dataset.transient = '1';
    el.onclick = () => toggleAppWindow(appId);
    el.oncontextmenu = (e) => showContextMenu(e, appId, 'dock');
    el.innerHTML = `
        <div class="dock-icon">${app.icon}</div>
        <div class="active-indicator" style="display:none;"></div>
    `;
    dockItemsContainer().appendChild(el);
}

// Удалить элемент из дока (если он transient и не pinned)
function removeDockItem(appId) {
    const el = document.querySelector(`.dock-item[data-app="${appId}"]`);
    if (!el) return;
    if (el.dataset.pinned === '1') return; // не удаляем закреплённые
    el.remove();
}

// Открыть приложение (не автозакреплять)
function openApp(appId) {
    const app = apps[appId];
    if (!app) return;

    // Если уже открыто — bring to front / restore
    if (state.openWindows[appId]) {
        const win = state.openWindows[appId];
        if (win.classList.contains('minimized')) {
            win.classList.remove('minimized');
        }
        bringWindowToFront(appId);
        return;
    }

    // Создаём окно
    const windowElement = createAppWindow(appId);
    state.openWindows[appId] = windowElement;

    // Показываем иконку в доке временно если не закреплён
    if (!state.pinnedApps.includes(appId)) {
        state.transientDock[appId] = true;
        addDockItem(appId, false, true);
    }

    updateActiveApp(appId);
    saveUserData();
}

function toggleAppWindow(appId) {
    if (state.openWindows[appId]) {
        const win = state.openWindows[appId];
        if (win.classList.contains('minimized')) {
            win.classList.remove('minimized');
            bringWindowToFront(appId);
            updateActiveIndicator(appId, true);
        } else {
            // свернуть
            win.classList.add('minimized');
            updateActiveIndicator(appId, true); // точка остаётся под свернутым приложением
        }
    } else {
        openApp(appId);
    }
}

function createAppWindow(appId) {
    const app = apps[appId];
    const container = windowsContainer();
    const win = document.createElement('div');
    win.className = 'window';
    win.dataset.app = appId;
    // header + content
    const headerHtml = `
        <div class="window-header" onmousedown="startDrag(event, '${appId}')">
            <div class="window-title"><span>${app.icon}</span><span>${app.name}</span></div>
            <div class="window-controls">
                <div class="window-control minimize" title="Свернуть" onclick="minimizeApp('${appId}')"></div>
                <div class="window-control maximize" title="Развернуть" onclick="maximizeApp('${appId}')"></div>
                <div class="window-control close" title="Закрыть" onclick="closeApp('${appId}')"></div>
            </div>
        </div>
    `;
    const contentHtml = app.builtin ? `<div class="window-content">${getBuiltinAppContent(appId)}</div>` : `<div class="window-content"><iframe src="${app.url}"></iframe></div>`;
    win.innerHTML = headerHtml + contentHtml;
    container.appendChild(win);

    // drag
    makeWindowDraggable(win);

    // init content
    if (appId === 'ai') initializeAIChat();
    if (appId === 'settings') initializeSettings();

    return win;
}

function closeApp(appId) {
    // удаляем окно
    if (state.openWindows[appId]) {
        state.openWindows[appId].remove();
        delete state.openWindows[appId];
    }
    // если приложение было временным (transient) — убрать иконку из дока
    if (state.transientDock[appId]) {
        delete state.transientDock[appId];
        removeDockItem(appId);
    }
    updateActiveApp(null);
}

// минимизация
function minimizeApp(appId) {
    if (!state.openWindows[appId]) return;
    state.openWindows[appId].classList.add('minimized');
    // индикатор должен оставаться на доке (выполнено через updateActiveIndicator(true))
    updateActiveIndicator(appId, true);
}

// макс/развёртка
function maximizeApp(appId) {
    if (!state.openWindows[appId]) return;
    state.openWindows[appId].classList.toggle('maximized');
}

// Bring to front
function bringWindowToFront(appId) {
    if (!appId || !state.openWindows[appId]) return;
    Object.values(state.openWindows).forEach(w => w.style.zIndex = 10);
    state.openWindows[appId].style.zIndex = 20;
    updateActiveApp(appId);
}

function updateActiveApp(appId) {
    state.activeApp = appId;
    // показываем индикатор (точку) под апп
    document.querySelectorAll('.dock-item').forEach(el => {
        const id = el.dataset.app;
        const ind = el.querySelector('.active-indicator');
        if (!ind) return;
        if (id === appId) {
            ind.style.display = 'block';
        } else {
            // если приложение свернуто — точка может оставаться (требование 8)
            ind.style.display = 'none';
        }
    });
    if (appId) updateActiveIndicator(appId, true);
}

function updateActiveIndicator(appId, show) {
    const el = document.querySelector(`.dock-item[data-app="${appId}"]`);
    if (!el) return;
    const ind = el.querySelector('.active-indicator');
    if (ind) ind.style.display = show ? 'block' : 'none';
}

// ----------------- Контекстное меню -----------------
const contextMenuEl = document.getElementById('context-menu');

function showContextMenu(e, appId, origin = 'desktop') {
    e.preventDefault();
    e.stopPropagation();

    // Сборка меню в зависимости от origin и состояния pinned
    const isPinned = state.pinnedApps.includes(appId);
    const isDock = origin === 'dock';
    const items = [];

    if (isDock) {
        // на доке — показать открепить если закреплён, иначе закрепить
        if (isPinned) items.push({ label: 'Открепить от панели задач', action: 'unpin' });
        else items.push({ label: 'Закрепить на панели задач', action: 'pin' });
        items.push({ label: 'Открыть/закрыть', action: 'toggle' });
    } else {
        // на рабочем столе
        if (isPinned) items.push({ label: 'Открепить от панели задач', action: 'unpin' });
        else items.push({ label: 'Закрепить на панели задач', action: 'pin' });
        items.push({ label: 'Открыть', action: 'open' });
        items.push({ label: 'Открыть в отдельной вкладке', action: 'open-tab' });
        items.push({ label: 'Спросить у ИИ', action: 'ask-ai' });
    }

    // если это settings — добавим кнопку Выйти
    if (appId === 'settings') items.push({ label: 'Выйти', action: 'logout' });

    // render menu items
    contextMenuEl.innerHTML = '';
    items.forEach(it => {
        const div = document.createElement('div');
        div.className = 'context-item';
        div.textContent = it.label;
        div.onclick = () => {
            handleContextMenuAction(it.action, appId);
            hideContextMenu();
        };
        contextMenuEl.appendChild(div);
    });

    // позиционирование (чтобы меню не вылезло за экран)
    let left = e.pageX;
    let top = e.pageY;
    const rect = contextMenuEl.getBoundingClientRect();
    // временно отобразим, чтобы получить размеры
    contextMenuEl.style.display = 'block';
    contextMenuEl.style.left = left + 'px';
    contextMenuEl.style.top = top + 'px';
    const cmRect = contextMenuEl.getBoundingClientRect();
    if (cmRect.right > window.innerWidth) {
        left = Math.max(10, window.innerWidth - cmRect.width - 10);
        contextMenuEl.style.left = left + 'px';
    }
    if (cmRect.bottom > window.innerHeight) {
        top = Math.max(10, window.innerHeight - cmRect.height - 10);
        contextMenuEl.style.top = top + 'px';
    }
    // фокус
    setTimeout(() => {
        document.addEventListener('click', hideContextMenuOnce);
    }, 10);

    return false;
}

function hideContextMenuOnce() {
    hideContextMenu();
    document.removeEventListener('click', hideContextMenuOnce);
}

function hideContextMenu() {
    contextMenuEl.style.display = 'none';
}

function handleContextMenuAction(action, appId) {
    switch(action) {
        case 'pin':
            if (!state.pinnedApps.includes(appId)) {
                state.pinnedApps.push(appId);
                saveUserData();
                initializeDock();
            }
            break;
        case 'unpin':
            state.pinnedApps = state.pinnedApps.filter(id => id !== appId);
            saveUserData();
            initializeDock();
            break;
        case 'open':
            openApp(appId);
            break;
        case 'open-tab':
            if (apps[appId] && apps[appId].url) window.open(apps[appId].url, '_blank');
            break;
        case 'ask-ai':
            openApp('ai');
            setTimeout(() => {
                const aiInput = document.getElementById('ai-input');
                if (aiInput) {
                    aiInput.value = `Расскажи о приложении ${apps[appId].name}`;
                    document.getElementById('ai-send')?.click();
                }
            }, 500);
            break;
        case 'toggle':
            toggleAppWindow(appId);
            break;
        case 'logout':
            handleLogout();
            break;
    }
}

// ----------------- Обои и настройки -----------------
let currentWallpaper = 'default';

function applyWallpaperFrom(typeOrUrl) {
    const wallpaperEl = document.querySelector('.wallpaper');
    if (!wallpaperEl) return;
    if (!typeOrUrl) typeOrUrl = 'default';
    currentWallpaper = typeOrUrl;
    if (typeOrUrl === 'default') {
        wallpaperEl.style.backgroundImage = 'none';
        wallpaperEl.style.background = 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)';
    } else if (typeOrUrl.startsWith('data:') || typeOrUrl.startsWith('http')) {
        wallpaperEl.style.backgroundImage = `url(${typeOrUrl})`;
        wallpaperEl.style.backgroundSize = 'cover';
        wallpaperEl.style.backgroundPosition = 'center';
    } else if (typeOrUrl === 'space') {
        wallpaperEl.style.backgroundImage = 'none';
        wallpaperEl.style.background = 'linear-gradient(135deg, #000428 0%, #004e92 100%)';
    } else if (typeOrUrl === 'nature') {
        wallpaperEl.style.backgroundImage = 'none';
        wallpaperEl.style.background = 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)';
    } else if (typeOrUrl === 'city') {
        wallpaperEl.style.backgroundImage = 'none';
        wallpaperEl.style.background = 'linear-gradient(135deg, #2C3E50 0%, #4CA1AF 100%)';
    } else {
        wallpaperEl.style.backgroundImage = 'none';
        wallpaperEl.style.background = 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)';
    }
}

// Инициализация настроек (вызывается при создании окна settings)
function initializeSettings() {
    // добавляем кнопку Выйти в контент настроек (если ещё не добавлена)
    const settingsWindow = document.querySelector('.window[data-app="settings"] .window-content');
    if (!settingsWindow) return;
    // только 1 раз
    if (settingsWindow.querySelector('#logout-btn')) return;

    // создать базовый контент — практический код из исходного шаблона
    const html = `
        <div style="padding:20px;height:100%;overflow:auto;">
            <h3>Настройки системы</h3>
            <div style="margin-top:15px;">
                <h4>Обои</h4>
                <div style="display:flex;gap:10px;margin-bottom:10px;">
                    <div class="wallpaper-preview btn-wallpaper" data-wallpaper="default" style="width:120px;height:80px;border-radius:10px;background:linear-gradient(135deg,#0c0c0c 0%,#1a1a2e 50%,#16213e 100%);cursor:pointer;">&nbsp;</div>
                    <div class="wallpaper-preview btn-wallpaper" data-wallpaper="space" style="width:120px;height:80px;border-radius:10px;background:linear-gradient(135deg,#000428 0%,#004e92 100%);cursor:pointer;">&nbsp;</div>
                    <div class="wallpaper-preview btn-wallpaper" data-wallpaper="nature" style="width:120px;height:80px;border-radius:10px;background:linear-gradient(135deg,#134E5E 0%,#71B280 100%);cursor:pointer;">&nbsp;</div>
                    <div class="wallpaper-preview btn-wallpaper" data-wallpaper="city" style="width:120px;height:80px;border-radius:10px;background:linear-gradient(135deg,#2C3E50 0%,#4CA1AF 100%);cursor:pointer;">&nbsp;</div>
                </div>
                <input type="file" id="wallpaper-upload" accept="image/*" style="margin-bottom:10px;">
                <div style="display:flex;gap:10px;margin-top:10px;">
                    <button id="apply-wallpaper" style="padding:8px 12px;border-radius:8px;background:#4ecdc4;border:none;cursor:pointer;">Применить обои</button>
                    <button id="logout-btn" style="padding:8px 12px;border-radius:8px;background:#ff5f57;border:none;cursor:pointer;color:#fff;">Выйти</button>
                </div>
            </div>
        </div>
    `;
    settingsWindow.innerHTML = html;

    // обработчики
    settingsWindow.querySelectorAll('.btn-wallpaper').forEach(el => {
        el.onclick = () => {
            document.querySelectorAll('.btn-wallpaper').forEach(p => p.style.outline = 'none');
            el.style.outline = '3px solid rgba(78,205,196,0.5)';
            settingsWindow.dataset.selectedWallpaper = el.dataset.wallpaper;
        };
    });

    settingsWindow.querySelector('#wallpaper-upload').addEventListener('change', (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const dataUrl = ev.target.result;
            settingsWindow.dataset.uploadedWallpaper = dataUrl;
            alert('Обои загружены в память. Нажмите «Применить обои».');
        };
        reader.readAsDataURL(f);
    });

    settingsWindow.querySelector('#apply-wallpaper').onclick = async () => {
        const uploaded = settingsWindow.dataset.uploadedWallpaper;
        const selectedPreset = settingsWindow.dataset.selectedWallpaper;
        if (uploaded) {
            currentWallpaper = uploaded;
            applyWallpaperFrom(uploaded);
        } else if (selectedPreset) {
            currentWallpaper = selectedPreset;
            applyWallpaperFrom(selectedPreset);
        } else {
            alert('Выберите обои или загрузите файл.');
            return;
        }
        // сохранить
        await saveUserData();
        alert('Обои применены и сохранены.');
    };

    settingsWindow.querySelector('#logout-btn').onclick = () => {
        // выход
        handleLogout();
    };
}

// ----------------- Встроенный контент (AI и др.) -----------------
function getBuiltinAppContent(appId) {
    switch(appId) {
        case 'ai':
            return `
                <div style="padding:20px;height:100%;display:flex;flex-direction:column;">
                    <div id="ai-chat" style="flex:1;overflow-y:auto;margin-bottom:10px;padding:10px;background:rgba(0,0,0,0.2);border-radius:10px;">
                        <div class="ai-message"><strong>Neuron AI:</strong> Привет! Я ваш AI-помощник. Чем могу помочь?</div>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <input id="ai-input" type="text" placeholder="Введите команду..." style="flex:1;padding:10px;border-radius:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);color:white;">
                        <button id="ai-send" style="padding:10px 14px;border-radius:8px;background:#4ecdc4;border:none;cursor:pointer;">Отправить</button>
                    </div>
                </div>
            `;
        case 'settings':
            return `<div style="padding:20px;">Загрузка настроек...</div>`;
        default:
            return `<div style="padding:20px;text-align:center;">Приложение в разработке</div>`;
    }
}

// ----------------- Перетаскивание окон -----------------
function makeWindowDraggable(win) {
    const header = win.querySelector('.window-header');
    let isDragging = false, offsetX = 0, offsetY = 0;
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - win.offsetLeft;
        offsetY = e.clientY - win.offsetTop;
        bringWindowToFront(win.dataset.app);
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        const maxX = window.innerWidth - win.offsetWidth;
        const maxY = window.innerHeight - win.offsetHeight - 70;
        win.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
        win.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    });
    document.addEventListener('mouseup', () => isDragging = false);
}

// Функция-обёртка для возможности привязать drag без inline onmousedown
function startDrag(e, appId) {
    // noop; handled in makeWindowDraggable already
}

// ----------------- Чат ИИ -----------------
function initializeAIChat() {
    const sendBtn = document.getElementById('ai-send');
    const input = document.getElementById('ai-input');
    if (!sendBtn || !input) return;
    const sendMessage = () => {
        const message = input.value.trim();
        if (!message) return;
        addAIMessage('user', message);
        input.value = '';
        setTimeout(() => {
            const response = generateAIResponse(message);
            addAIMessage('ai', response);
        }, 600);
    };
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
}

function addAIMessage(sender, text) {
    const chat = document.getElementById('ai-chat');
    if (!chat) return;
    const div = document.createElement('div');
    div.className = 'ai-message';
    div.style.marginBottom = '10px';
    div.style.padding = '8px';
    div.style.borderRadius = '8px';
    div.style.background = sender === 'user' ? 'rgba(78,205,196,0.18)' : 'rgba(255,255,255,0.06)';
    div.innerHTML = `<strong>${sender === 'user' ? 'Вы' : 'Neuron AI'}:</strong> ${text}`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function generateAIResponse(message) {
    const m = message.toLowerCase();
    if (m.includes('привет')) return 'Привет! Чем помочь?';
    if (m.includes('/help')) return 'Доступные команды: /open notes, /about и т.д.';
    if (m.includes('/about')) return 'Neuron OS — демо версия.';
    return 'Пока не знаю, попробуйте другое.';
}

// ----------------- Доп. UI: часы, поиск, старт-меню -----------------
function initializeClock() {
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ru-RU',{ hour: '2-digit', minute: '2-digit' });
        document.getElementById('clock').textContent = timeString;
    }
    updateClock();
    setInterval(updateClock, 1000);
}

function renderAppGrid() {
    const grid = document.getElementById('app-grid');
    if (!grid) return;
    grid.innerHTML = '';
    Object.keys(apps).forEach(id => {
        const app = apps[id];
        const div = document.createElement('div');
        div.className = 'app-item';
        div.dataset.app = id;
        div.onclick = () => openApp(id);
        div.innerHTML = `<div class="app-icon">${app.icon}</div><span>${app.name}</span>`;
        grid.appendChild(div);
    });
}

function filterApps() {
    const search = document.getElementById('app-search').value.toLowerCase();
    document.querySelectorAll('.app-item').forEach(item => {
        const name = item.querySelector('span').textContent.toLowerCase();
        item.style.display = name.includes(search) ? 'flex' : 'none';
    });
}

// ----------------- Обработка кликов вне меню и т.д. -----------------
document.addEventListener('click', (e) => {
    // закрываем контекстное меню
    hideContextMenu();
});

// предотвращаем дефолтный правый клик по документу
document.addEventListener('contextmenu', (e) => {
    // если клик не по .desktop-icon или .dock-item — закрываем меню и блокируем
    const el = e.target.closest('.desktop-icon, .dock-item');
    if (!el) {
        hideContextMenu();
        return true; // позволим обычный контекст или нет — оставил стандарт
    }
});

// ----------------- Инициализация event listeners для desktop icons (правый клик) -----------------
function initializeEventListeners() {
    document.querySelectorAll('.desktop-icon').forEach(icon => {
        icon.addEventListener('contextmenu', (e) => {
            showContextMenu(e, icon.dataset.app, 'desktop');
        });
    });
}

// ----------------- Финальные штуки -----------------
// Экспортим некоторые функции в глобальный scope для inline on* в html
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleGoogleLogin = handleGoogleLogin;
window.activateDemoMode = activateDemoMode;
window.openApp = openApp;
window.toggleAppWindow = toggleAppWindow;
window.handleLogout = handleLogout;
window.applyWallpaperFrom = applyWallpaperFrom;
