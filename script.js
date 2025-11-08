// === script.js ===

const firebaseConfig = {
  apiKey: "AIzaSyDOaDVzzPjyYm4HWMND2XYWjLy_h4wty5s",
  authDomain: "neuron-ecosystem-2025.firebaseapp.com",
  projectId: "neuron-ecosystem-2025",
  storageBucket: "neuron-ecosystem-2025.appspot.com",
  messagingSenderId: "589834476565",
  appId: "1:589834476565:web:622fe04057d33339dd421c",
  measurementId: "G-Z934BZPLG3"
};

// Инициализация Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// === Твои приложения ===
const apps = {
  ai: { name: 'Neuron AI', icon: 'brain', url: null, chat: true },
  notes: { name: 'Neuron Notes', icon: 'note', url: 'https://neuron-p2p.ru/notes.html', saveKey: 'notes' },
  converter: { name: 'Neuron Converter', icon: 'sync', url: 'https://neuron-ecosystem.github.io/Unit-Converter/', saveKey: 'converter' },
  budget: { name: 'Neuron Budget', icon: 'dollar', url: 'https://neuron-ecosystem.github.io/Neuron-Budget/', saveKey: 'budget' },
  tools: { name: 'Neuron Tools', icon: 'tools', url: 'https://neuron-ecosystem.github.io/Neuron-Tools/', saveKey: 'tools' },
  games: { name: 'Game Hub', icon: 'gamepad', url: 'https://neuron-ecosystem.github.io/Game-Hub/', saveKey: 'games' },
  browser: { name: 'Интернет', icon: 'globe', url: 'https://neuron-p2p.ru', external: true },
  settings: { name: 'Настройки', icon: 'gear', url: null, modal: 'settings-modal' }
};

let currentUser = null;
let windows = new Map();
let zIndex = 100;
let userUnsubscribe = null;

// === DOM Ready ===
document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  setupDock();
  setupContextMenu();
  setupSettings();
});

// === АВТОРИЗАЦИЯ ===
function setupAuth() {
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  const googleBtn = document.getElementById('google-btn');

  loginBtn.onclick = () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) return showAuthError('Заполните все поля');
    showAuthLoading(true);
    auth.signInWithEmailAndPassword(email, password)
      .catch(err => showAuthError(getErrorMessage(err.code)))
      .finally(() => showAuthLoading(false));
  };

  registerBtn.onclick = () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) return showAuthError('Заполните все поля');
    if (password.length < 6) return showAuthError('Пароль ≥ 6 символов');
    showAuthLoading(true);
    auth.createUserWithEmailAndPassword(email, password)
      .catch(err => showAuthError(getErrorMessage(err.code)))
      .finally(() => showAuthLoading(false));
  };

  googleBtn.onclick = () => {
    showAuthLoading(true);
    auth.signInWithPopup(googleProvider)
      .catch(err => showAuthError(getErrorMessage(err.code)))
      .finally(() => showAuthLoading(false));
  };

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      document.getElementById('auth-modal').classList.add('hidden');
      document.getElementById('desktop').classList.remove('hidden');
      await loadUserData();
      renderDock();
      startRealtimeSync();
    } else {
      stopRealtimeSync();
      document.getElementById('auth-modal').classList.remove('hidden');
      document.getElementById('desktop').classList.add('hidden');
    }
  });
}

function showAuthLoading(show) {
  const form = document.getElementById('auth-form');
  const loading = document.getElementById('auth-loading');
  form.style.display = show ? 'none' : 'block';
  loading.classList.toggle('hidden', !show);
}

function showAuthError(msg) {
  const existing = document.querySelector('.auth-error');
  if (existing) existing.remove();
  const error = document.createElement('div');
  error.className = 'auth-error';
  error.textContent = msg;
  error.style = 'color: #ff5f57; font-size: 13px; margin-top: 8px; text-align: center;';
  document.getElementById('auth-form').appendChild(error);
  setTimeout(() => error.remove(), 4000);
}

function getErrorMessage(code) {
  const map = {
    'auth/user-not-found': 'Пользователь не найден',
    'auth/wrong-password': 'Неверный пароль',
    'auth/email-already-in-use': 'Email уже используется',
    'auth/weak-password': 'Пароль слишком слабый',
    'auth/invalid-email': 'Неверный email',
    'auth/too-many-requests': 'Слишком много попыток',
    'auth/popup-closed-by-user': 'Вход отменён',
  };
  return map[code] || 'Ошибка';
}

// === Загрузка данных ===
async function loadUserData() {
  if (!currentUser) return;
  const snap = await db.collection('users').doc(currentUser.uid).get();
  if (snap.exists) {
    const data = snap.data();
    if (data.theme) {
      document.body.classList.toggle('light', data.theme === 'light');
      const radio = document.querySelector(`input[name="theme"][value="${data.theme}"]`);
      if (radio) radio.checked = true;
    }
    if (data.wallpaper) {
      document.getElementById('wallpaper').style.backgroundImage = `url(${data.wallpaper})`;
    }
    if (data.pinned) {
      data.pinned.forEach(id => pinToDock(id, false));
    }
  }
}

function saveUserData(key, value) {
  if (!currentUser) return;
  db.collection('users').doc(currentUser.uid).set({ [key]: value }, { merge: true });
}

// === Синхронизация ===
function startRealtimeSync() {
  if (userUnsubscribe || !currentUser) return;
  userUnsubscribe = db.collection('users').doc(currentUser.uid).onSnapshot(doc => {
    if (doc.exists) {
      const data = doc.data();
      if (data.theme !== undefined) {
        document.body.classList.toggle('light', data.theme === 'light');
        const radio = document.querySelector(`input[name="theme"][value="${data.theme}"]`);
        if (radio) radio.checked = true;
      }
      if (data.wallpaper) {
        document.getElementById('wallpaper').style.backgroundImage = `url(${data.wallpaper})`;
      }
      if (data.pinned) {
        document.querySelectorAll('.dock-icon.pinned:not([data-app="browser"])').forEach(el => el.remove());
        data.pinned.forEach(id => pinToDock(id, false));
      }
    }
  });
}

function stopRealtimeSync() {
  if (userUnsubscribe) userUnsubscribe();
  userUnsubscribe = null;
}

// === Dock и окна ===
function renderDock() {
  const dock = document.getElementById('dock');
  Object.entries(apps).forEach(([id, app]) => {
    if (app.modal) return;
    const icon = document.createElement('div');
    icon.className = 'dock-icon';
    icon.dataset.app = id;
    icon.innerHTML = `<svg viewBox="0 0 24 24"><use href="#icon-${app.icon}"></use></svg><div class="dock-dot"></div>`;
    icon.onclick = () => openApp(id);
    icon.oncontextmenu = (e) => showContextMenu(e, id);
    dock.appendChild(icon);
  });
}

function openApp(id) {
  const app = apps[id];
  if (app.external) { window.open(app.url, '_blank'); return; }
  if (app.modal) { document.getElementById(app.modal).classList.remove('hidden'); return; }
  if (windows.has(id)) { windows.get(id).element.style.zIndex = ++zIndex; return; }

  const win = document.createElement('div');
  win.className = 'window open';
  win.dataset.id = id;
  win.style.zIndex = ++zIndex;
  win.innerHTML = `
    <div class="window-header">
      <span>${app.name}</span>
      <div class="window-controls">
        <div class="control-btn close" onclick="closeWindow('${id}')"></div>
        <div class="control-btn minimize" onclick="minimizeWindow('${id}')"></div>
        <div class="control-btn maximize" onclick="maximizeWindow('${id}')"></div>
      </div>
    </div>
    <div class="window-content">
      ${app.chat ? getAIChat() : `<iframe src="${app.url}" frameborder="0" onload="setupIframeSync('${id}', this)"></iframe>`}
    </div>
  `;
  document.getElementById('windows-container').appendChild(win);
  windows.set(id, { element: win });
  setupWindowDrag(win);
  updateDock();
}

window.closeWindow = (id) => {
  const win = windows.get(id);
  if (!win) return;
  win.element.classList.remove('open');
  setTimeout(() => { win.element.remove(); windows.delete(id); updateDock(); }, 300);
};

function updateDock() {
  document.querySelectorAll('.dock-icon').forEach(icon => {
    const id = icon.dataset.app;
    icon.classList.toggle('active', windows.has(id));
  });
}

function showContextMenu(e, id) {
  e.preventDefault();
  const menu = document.getElementById('context-menu');
  menu.classList.remove('hidden');
  menu.style.left = e.pageX + 'px';
  menu.style.top = e.pageY + 'px';
  menu.onclick = (ev) => {
    const action = ev.target.dataset.action;
    if (action === 'pin') pinToDock(id);
    if (action === 'open-tab') window.open(apps[id].url, '_blank');
    menu.classList.add('hidden');
  };
  document.onclick = () => menu.classList.add('hidden');
}

function pinToDock(id, save = true) {
  const dock = document.getElementById('dock');
  const existing = dock.querySelector(`[data-app="${id}"].pinned`);
  if (existing) return;
  const icon = dock.querySelector(`[data-app="${id}"]`).cloneNode(true);
  icon.classList.add('pinned');
  dock.insertBefore(icon, dock.lastElementChild);
  if (save) {
    const pinned = Array.from(dock.querySelectorAll('.pinned:not([data-app="browser"])')).map(el => el.dataset.app);
    saveUserData('pinned', pinned);
  }
}

// === Настройки ===
function setupSettings() {
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.onchange = () => {
      document.body.classList.toggle('light', radio.value === 'light');
      saveUserData('theme', radio.value);
    };
  });

  document.getElementById('wallpaper-input').onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target.result;
      document.getElementById('wallpaper').style.backgroundImage = `url(${url})`;
      saveUserData('wallpaper', url);
    };
    reader.readAsDataURL(file);
  };

  document.querySelectorAll('.wallpaper-gallery img').forEach(img => {
    img.onclick = () => {
      const url = img.src;
      document.getElementById('wallpaper').style.backgroundImage = `url(${url})`;
      saveUserData('wallpaper', url);
    };
  });

  document.getElementById('logout-btn').onclick = () => auth.signOut();
}

function setupIframeSync(appId, iframe) {
  if (!apps[appId]?.saveKey) return;
  setInterval(() => {
    try {
      const data = iframe.contentWindow.localStorage.getItem(apps[appId].saveKey);
      if (data) saveUserData(apps[appId].saveKey, data);
    } catch (e) {}
  }, 2000);
}

function setupWindowDrag(win) {
  const header = win.querySelector('.window-header');
  let isDragging = false;
  header.onmousedown = (e) => {
    if (e.target.closest('.window-controls')) return;
    isDragging = true;
    const rect = win.getBoundingClientRect();
    win.dataset.offsetX = e.clientX - rect.left;
    win.dataset.offsetY = e.clientY - rect.top;
    win.style.transition = 'none';
    win.style.zIndex = ++zIndex;
  };
  document.onmousemove = (e) => {
    if (!isDragging) return;
    win.style.left = `${e.clientX - win.dataset.offsetX}px`;
    win.style.top = `${e.clientY - win.dataset.offsetY}px`;
  };
  document.onmouseup = () => {
    if (isDragging) win.style.transition = '';
    isDragging = false;
  };
}

// === Service Worker ===
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
