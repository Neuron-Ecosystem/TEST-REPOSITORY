// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyDOaDVzzPjyYm4HWMND2XYWjLy_h4wty5s",
  authDomain: "neuron-ecosystem-2025.firebaseapp.com",
  projectId: "neuron-ecosystem-2025",
  storageBucket: "neuron-ecosystem-2025.appspot.com",
  messagingSenderId: "589834476565",
  appId: "1:589834476565:web:622fe04057d33339dd421c"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// === Apps ===
const apps = {
  browser: { name: 'Интернет', url: 'https://neuron-p2p.ru', external: true },
  settings: { name: 'Настройки', modal: 'settings-modal' }
};

let currentUser = null;

// === DOM Ready ===
document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  setupSettings();
  renderDock();
});

// === Auth ===
function setupAuth() {
  document.getElementById('login-btn').onclick = () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) return showError('Заполните поля');
    showLoading(true);
    auth.signInWithEmailAndPassword(email, password)
      .catch(err => showError(err.message))
      .finally(() => showLoading(false));
  };

  document.getElementById('register-btn').onclick = () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (password.length < 6) return showError('Пароль ≥ 6 символов');
    showLoading(true);
    auth.createUserWithEmailAndPassword(email, password)
      .catch(err => showError(err.message))
      .finally(() => showLoading(false));
  };

  document.getElementById('google-btn').onclick = () => {
    showLoading(true);
    auth.signInWithPopup(provider)
      .catch(err => showError(err.message))
      .finally(() => showLoading(false));
  };

  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      document.getElementById('auth-modal').classList.add('hidden');
      document.getElementById('desktop').classList.remove('hidden');
      loadUserData();
    } else {
      document.getElementById('auth-modal').classList.remove('hidden');
      document.getElementById('desktop').classList.add('hidden');
    }
  });
}

function showLoading(show) {
  document.getElementById('auth-form').style.display = show ? 'none' : 'block';
  document.getElementById('auth-loading').classList.toggle('hidden', !show);
}

function showError(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style = 'color:#ff5f57;font-size:13px;margin:8px 0;text-align:center;';
  document.getElementById('auth-form').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// === User Data ===
async function loadUserData() {
  const doc = await db.collection('users').doc(currentUser.uid).get();
  if (doc.exists) {
    const data = doc.data();
    if (data.theme) {
      document.body.classList.toggle('light', data.theme === 'light');
      document.querySelector(`input[value="${data.theme}"]`).checked = true;
    }
    if (data.wallpaper) {
      document.getElementById('wallpaper').style.backgroundImage = `url(${data.wallpaper})`;
    }
  }
}

function saveData(key, value) {
  db.collection('users').doc(currentUser.uid).set({ [key]: value }, { merge: true });
}

// === Settings ===
function setupSettings() {
  document.querySelectorAll('input[name="theme"]').forEach(r => {
    r.onchange = () => {
      document.body.classList.toggle('light', r.value === 'light');
      saveData('theme', r.value);
    };
  });

  document.getElementById('wallpaper-input').onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target.result;
      document	gotElementById('wallpaper').style.backgroundImage = `url(${url})`;
      saveData('wallpaper', url);
    };
    reader.readAsDataURL(file);
  };

  document.getElementById('logout-btn').onclick = () => auth.signOut();
}

// === Dock ===
function renderDock() {
  const dock = document.getElementById('dock');
  Object.entries(apps).forEach(([id, app]) => {
    if (app.modal) return;
    const el = document.createElement('div');
    el.className = 'dock-icon';
    el.dataset.app = id;
    el.innerHTML = `<div class="dock-dot"></div>`;
    el.onclick = () => app.external ? window.open(app.url, '_blank') : openModal(app.modal);
    dock.appendChild(el);
  });
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

window.closeWindow = id => document.getElementById(id).classList.add('hidden');
