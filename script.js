// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDOaDVzzPjyYm4HWMND2XYWjLy_h4wty5s",
    authDomain: "neuron-ecosystem-2025.firebaseapp.com",
    projectId: "neuron-ecosystem-2025",
    storageBucket: "neuron-ecosystem-2025.firebasestorage.app",
    messagingSenderId: "589834476565",
    appId: "1:589834476565:web:0b28faca1064077add421c",
    measurementId: "G-4D19EM80B0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Элементы DOM
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const googleBtn = document.getElementById('google-btn');
const authError = document.getElementById('auth-error');
const buttons = document.querySelectorAll('.state-btn');
const statsCard = document.getElementById('stats-card');
const statsContent = document.getElementById('stats-content');
const closeStats = document.getElementById('close-stats');

// 3D сцена
let scene, camera, renderer, globe, controls, raycaster, mouse;
const canvas = document.getElementById('globe-canvas');
const gridSize = 10; // Сетка 10x10 градусов для регионов
const statesColors = {
    CREATE: new THREE.Color('yellow'),
    WORK: new THREE.Color('blue'),
    COMMUTE: new THREE.Color('green'),
    SLEEP: new THREE.Color('darkblue'),
    ANXIOUS: new THREE.Color('gray'),
    ACTIVE: new THREE.Color('red')
};
let regions = {}; // Объект для агрегации: key - 'lat_lon', value - {counts: {state: num}, total: num}
let textureCanvas, textureContext, texture;

// Инициализация 3D
function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    // Глобус
    const geometry = new THREE.SphereGeometry(5, 64, 64);
    textureCanvas = document.createElement('canvas');
    textureCanvas.width = 1024;
    textureCanvas.height = 512;
    textureContext = textureCanvas.getContext('2d');
    texture = new THREE.CanvasTexture(textureCanvas);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.8 });
    globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Свет
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.5;
    controls.rotateSpeed = 0.5;
    controls.minDistance = 6;
    controls.maxDistance = 20;

    camera.position.z = 10;

    // Raycaster для кликов
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    canvas.addEventListener('click', onGlobeClick);
    window.addEventListener('resize', onResize);

    animate();
}

// Анимация глобуса: вращение, пульсация
function animate() {
    requestAnimationFrame(animate);
    globe.rotation.y += 0.0005; // Медленное вращение

    // Пульсация цвета
    globe.material.opacity = 0.8 + Math.sin(Date.now() * 0.001) * 0.05;

    // Обновить текстуру если нужно
    updateTexture();

    controls.update();
    renderer.render(scene, camera);
}

// Обновление текстуры на основе регионов
function updateTexture() {
    textureContext.clearRect(0, 0, textureCanvas.width, textureCanvas.height);

    for (const key in regions) {
        const [latIdx, lonIdx] = key.split('_').map(Number);
        const counts = regions[key].counts;
        const total = regions[key].total;
        let blendedColor = new THREE.Color(0x000000);

        for (const state in counts) {
            const weight = counts[state] / total;
            blendedColor.add(statesColors[state].clone().multiplyScalar(weight));
        }

        textureContext.fillStyle = `#${blendedColor.getHexString()}`;
        const x = (lonIdx / 36) * textureCanvas.width; // 360 / 10 = 36
        const y = ((90 - (latIdx * gridSize)) / 180) * textureCanvas.height; // Lat from -90 to 90
        const w = textureCanvas.width / 36;
        const h = textureCanvas.height / 18; // 180 / 10 = 18
        textureContext.fillRect(x, y, w, h);
    }

    texture.needsUpdate = true;
}

// Агрегация данных
async function aggregateRegions() {
    regions = {};
    const oneHourAgo = new Date(Date.now() - 3600000);
    const q = query(collection(db, 'states'), where('timestamp', '>', oneHourAgo));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
        const data = doc.data();
        const lat = data.location.lat;
        const lon = data.location.lon;
        const state = data.state;

        const latIdx = Math.floor((lat + 90) / gridSize);
        const lonIdx = Math.floor((lon + 180) / gridSize);
        const key = `${latIdx}_${lonIdx}`;

        if (!regions[key]) {
            regions[key] = { counts: {}, total: 0 };
        }
        if (!regions[key].counts[state]) {
            regions[key].counts[state] = 0;
        }
        regions[key].counts[state]++;
        regions[key].total++;
    });
    updateTexture();
}

// Реал-тайм обновление
function listenToStates() {
    onSnapshot(collection(db, 'states'), () => {
        aggregateRegions();
    });
}

// Получить локацию
function getLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
            }, err => {
                reject(err);
            }, { enableHighAccuracy: true });
        } else {
            reject(new Error('Geolocation not supported'));
        }
    });
}

// Обработка кнопок состояний
buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
        const state = btn.dataset.state;
        try {
            const location = await getLocation();
            await addDoc(collection(db, 'states'), {
                uid: auth.currentUser.uid,
                state,
                location,
                timestamp: serverTimestamp()
            });

            // Анимация вспышки
            const originalMaterial = globe.material;
            const flashMaterial = originalMaterial.clone();
            flashMaterial.emissive = new THREE.Color(0xffffff);
            flashMaterial.emissiveIntensity = 0.5;
            globe.material = flashMaterial;
            setTimeout(() => {
                globe.material = originalMaterial;
            }, 500);

            // Микро-анимация кнопки
            btn.style.transform = 'scale(1.2)';
            setTimeout(() => btn.style.transform = 'scale(1)', 300);
        } catch (err) {
            console.error('Error submitting state:', err);
            alert('Ошибка: ' + err.message); // Для дебага
        }
    });
});

// Клик по глобусу
function onGlobeClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(globe);

    if (intersects.length > 0) {
        const point = intersects[0].point.normalize();
        const lat = Math.asin(point.y) * (180 / Math.PI);
        const lon = Math.atan2(point.x, -point.z) * (180 / Math.PI);

        const latIdx = Math.floor((lat + 90) / gridSize);
        const lonIdx = Math.floor((lon + 180) / gridSize);
        const key = `${latIdx}_${lonIdx}`;

        if (regions[key]) {
            const counts = regions[key].counts;
            const total = regions[key].total;
            let stats = 'Здесь сейчас:<br>';
            for (const state in counts) {
                const perc = Math.round((counts[state] / total) * 100);
                stats += `${perc}% ${state}<br>`;
            }
            statsContent.innerHTML = stats;
            statsCard.classList.remove('hidden');
        }
    }
}

closeStats.addEventListener('click', () => {
    statsCard.classList.add('hidden');
});

// Авторизация
loginBtn.addEventListener('click', () => login('login'));
registerBtn.addEventListener('click', () => login('register'));
googleBtn.addEventListener('click', () => googleLogin());

async function login(mode) {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) {
        authError.textContent = 'Введите email и пароль';
        return;
    }
    try {
        if (mode === 'login') {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
        transitionToMain();
    } catch (err) {
        console.error('Auth error:', err);
        authError.textContent = err.message;
    }
}

async function googleLogin() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        transitionToMain();
    } catch (err) {
        console.error('Google auth error:', err);
        authError.textContent = err.message;
    }
}

// Переход к главной сцене
function transitionToMain() {
    authScreen.style.transition = 'opacity 1s ease';
    authScreen.style.opacity = 0;
    setTimeout(() => {
        authScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
        mainScreen.style.opacity = 1;
        if (!scene) { // Инициализировать только раз
            initThree();
            listenToStates();
            aggregateRegions();
        }
    }, 1000);
}

// Resize
function onResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Проверка auth состояния
auth.onAuthStateChanged(user => {
    if (user) {
        transitionToMain();
    } else {
        authScreen.classList.remove('hidden');
        authScreen.style.opacity = 1;
    }
});

// Для дебага: Логировать ошибки
window.addEventListener('error', (event) => {
    console.error('Global error:', event.message);
});
