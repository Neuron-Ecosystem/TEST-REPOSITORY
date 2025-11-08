import { neuronAuth } from './index.html';

const { auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, onAuthStateChanged, doc, setDoc, getDoc } = neuronAuth;

const apps = {
  ai: { name: 'Neuron AI', icon: 'brain', url: null, chat: true },
  notes: { name: 'Neuron Notes', icon: 'note', url: 'https://neuron-p2p.ru/notes.html' },
  converter: { name: 'Neuron Converter', icon: 'sync', url: 'https://neuron-ecosystem.github.io/Unit-Converter/' },
  budget: { name: 'Neuron Budget', icon: 'dollar', url: 'https://neuron-ecosystem.github.io/Neuron-Budget/' },
  tools: { name: 'Neuron Tools', icon: 'tools', url: 'https://neuron-ecosystem.github.io/Neuron-Tools/' },
  games: { name: 'Game Hub', icon: 'gamepad', url: 'https://neuron-ecosystem.github.io/Game-Hub/' },
  browser: { name: 'Интернет', icon: 'globe', url: 'https://neuron-p2p.ru', external: true },
  settings: { name: 'Настройки', icon: 'gear', url: null, modal: 'settings-modal' }
};

let currentUser = null;
let windows = new Map();
let zIndex = 100;

document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  setupDock();
  setupContextMenu();
  setupSettings();
});

function setupAuth() {
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  const googleBtn = document.getElementById('google-btn');

  loginBtn.onclick = () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) return showAuthError('Заполните все поля');
    showAuthLoading(true);
    signInWithEmailAndPassword(auth, email, password)
      .catch(err => showAuthError(getErrorMessage(err.code)))
      .finally(() => showAuthLoading(false));
  };

  registerBtn.onclick = () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) return showAuthError('Заполните все поля');
    if (password.length < 6) return showAuthError('Пароль должен быть ≥ 6 символов');
    showAuthLoading(true);
    createUserWithEmailAndPassword(auth, email, password)
      .catch(err => showAuthError(getErrorMessage(err.code)))
      .finally(() => showAuthLoading(false));
  };

  googleBtn.onclick = () => {
    showAuthLoading(true);
    signInWithPopup(auth, neuronAuth.googleProvider)
      .catch(err => showAuthError(getErrorMessage(err.code)))
      .finally(() => showAuthLoading(false));
  };

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      document.getElementById('auth-modal').classList.add('hidden');
      document.getElementById('desktop').classList.remove('hidden');
      await loadUserData();
      renderDock();
    }
  });
}

function showAuthLoading(show) {
  document.getElementById('auth-form').style.display = show ? 'none' : 'block';
  document.getElementById('auth-loading').classList.toggle('hidden', !show);
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
  const messages = {
    'auth/user-not-found': 'Пользователь не найден',
    'auth/wrong-password': 'Неверный пароль',
    'auth/email-already-in-use': 'Email уже используется',
    'auth/weak-password': 'Пароль слишком слабый',
    'auth/invalid-email': 'Неверный email',
    'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже.',
    'auth/popup-closed-by-user': 'Вход отменён',
  };
  return messages[code] || 'Ошибка авторизации';
}

async function loadUserData() {
  const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    if (data.theme) {
      document.body.classList.toggle('light', data.theme === 'light');
      document.querySelector(`input[name="theme"][value="${data.theme}"]`).checked = true;
    }
    if (data.wallpaper) {
      document.getElementById('wallpaper').style.backgroundImage = `url(${data.wallpaper})`;
    }
  }
}

async function saveUserData(key, value) {
  if (!currentUser) return;
  await setDoc(doc(db, 'users', currentUser.uid), { [key]: value }, { merge: true });
}

function renderDock() {
  const dock = document.getElementById('dock');
  Object.entries(apps).forEach(([id, app]) => {
    if (app.modal) return;
    const icon = document.createElement('div');
    icon.className = 'dock-icon';
    icon.dataset.app = id;
    icon.innerHTML = `<svg viewBox="0 0 24 24"><use href="#icon-${app.icon}"></use></svg><div class="dock-dot"></div>`;
    icon.onclick = () => openApp(id, icon);
    icon.oncontextmenu = (e) => showContextMenu(e, id);
    dock.appendChild(icon);
  });
}

function openApp(id, trigger) {
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
      ${app.chat ? getAIChat() : `<iframe src="${app.url}" frameborder="0"></iframe>`}
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
    if (action === 'ask-ai') askAIAbout(id);
    menu.classList.add('hidden');
  };
  document.onclick = () => menu.classList.add('hidden');
}

function pinToDock(id) {
  const dock = document.getElementById('dock');
  const existing = dock.querySelector(`[data-app="${id}"].pinned`);
  if (existing) return;
  const icon = dock.querySelector(`[data-app="${id}"]`).cloneNode(true);
  icon.classList.add('pinned');
  dock.insertBefore(icon, dock.lastElementChild);
}

function askAIAbout(id) {
  openApp('ai');
  setTimeout(() => {
    const msg = `Что такое ${apps[id].name}?`;
    addAIMessage(msg, 'user');
    setTimeout(() => addAIMessage(`Это ${apps[id].name.toLowerCase()} — мощный инструмент для...`, 'ai'), 800);
  }, 500);
}

function getAIChat() {
  return `
    <div style="padding:20px; display:flex; flex-direction:column; height:100%;">
      <div id="ai-messages" style="flex:1; overflow-y:auto; margin-bottom:16px;"></div>
      <input type="text" id="ai-input" placeholder="Введите команду..." style="padding:12px; border-radius:12px; border:none; background:rgba(255,255,255,0.2); color:white;" />
    </div>
  `;
}

function addAIMessage(text, type) {
  const messages = document.getElementById('ai-messages');
  const div = document.createElement('div');
  div.textContent = text;
  div.style = `margin:8px 0; padding:10px 14px; border-radius:14px; max-width:80%; align-self:${type==='user'?'flex-end':'flex-start'}; background:${type==='user'?'#7c3aed':'rgba(255,255,255,0.2)'}; color:white;`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function setupSettings() {
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.onchange = () => {
      const isLight = radio.value === 'light';
      document.body.classList.toggle('light', isLight);
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
}

function setupWindowDrag(win) {
  const header = win.querySelector('.window-header');
  let isDragging = false;
  header.addEventListener('mousedown', e => {
    if (e.target.closest('.window-controls')) return;
    isDragging = true;
    const rect = win.getBoundingClientRect();
    win.dataset.offsetX = e.clientX - rect.left;
    win.dataset.offsetY = e.clientY - rect.top;
    win.style.transition = 'none';
    win.style.zIndex = ++zIndex;
  });
  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    win.style.left = `${e.clientX - win.dataset.offsetX}px`;
    win.style.top = `${e.clientY - win.dataset.offsetY}px`;
  });
  document.addEventListener('mouseup', () => {
    if (isDragging) win.style.transition = '';
    isDragging = false;
  });
}

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
