
const apps = {
  ai: { title: 'Neuron AI', url: 'ai.html' },
  notes: { title: 'Neuron Notes', url: 'notes.html' },
  converter: { title: 'Neuron Converter', url: 'https://neuron-ecosystem.github.io/Unit-Converter/' },
  budget: { title: 'Neuron Budget', url: 'https://neuron-ecosystem.github.io/Neuron-Budget/' },
  tools: { title: 'Neuron Tools', url: 'https://neuron-ecosystem.github.io/Neuron-Tools/' },
  games: { title: 'Game Hub', url: 'https://neuron-ecosystem.github.io/Game-Hub/' },
  browser: { title: 'Browser', action: () => window.open('https://neuron-p2p.ru', '_blank') },
  settings: { title: 'Settings', url: 'settings.html' }
};

const windows = new Map();
let zIndex = 100;
let isDragging = false;
let dragData = {};

document.addEventListener('DOMContentLoaded', () => {
  loadWallpaper();
  setupDock();
  setupDrag();
});

function loadWallpaper() {
  const saved = localStorage.getItem('neuron-wallpaper');
  if (saved) {
    document.getElementById('wallpaper').style.backgroundImage = `url('${saved}')`;
  } else {
    document.getElementById('wallpaper').style.backgroundImage = `url('assets/wallpapers/space.jpg')`;
  }
}

function setupDock() {
  document.querySelectorAll('.dock-icon').forEach(icon => {
    icon.addEventListener('click', () => {
      const appId = icon.dataset.app;
      if (apps[appId].action) {
        apps[appId].action();
        return;
      }
      toggleWindow(appId, icon);
    });
  });
}

function toggleWindow(appId, icon) {
  if (windows.has(appId)) {
    const win = windows.get(appId);
    if (win.minimized) {
      restoreWindow(appId);
    } else {
      minimizeWindow(appId, icon);
    }
  } else {
    openWindow(appId, icon);
  }
}

function openWindow(appId, triggerIcon) {
  const app = apps[appId];
  const win = document.createElement('div');
  win.className = 'window';
  win.dataset.id = appId;
  win.style.zIndex = ++zIndex;

  const rect = triggerIcon.getBoundingClientRect();
  const dockBottom = document.getElementById('dock').getBoundingClientRect().top;
  win.style.setProperty('--min-x', `${rect.left + rect.width/2}px`);
  win.style.setProperty('--min-y', `${dockBottom}px`);

  win.innerHTML = `
    <div class="window-header">
      <span>${app.title}</span>
      <div class="window-controls">
        <div class="control-btn close" onclick="closeWindow('${appId}')"></div>
        <div class="control-btn minimize" onclick="minimizeWindow('${appId}', document.querySelector('[data-app=\"${appId}\"]'))"></div>
        <div class="control-btn maximize" onclick="maximizeWindow('${appId}')"></div>
      </div>
    </div>
    <div class="window-content">
      <iframe src="${app.url}" frameborder="0" allowfullscreen></iframe>
    </div>
  `;

  document.getElementById('windows-container').appendChild(win);
  windows.set(appId, { element: win, minimized: false, maximized: false });

  requestAnimationFrame(() => win.classList.add('show'));
  updateDock();
}

function closeWindow(appId) {
  const win = windows.get(appId);
  if (!win) return;
  win.element.style.animation = 'windowClose 0.35s ease forwards';
  setTimeout(() => {
    win.element.remove();
    windows.delete(appId);
    updateDock();
  }, 350);
}

function minimizeWindow(appId, icon) {
  const win = windows.get(appId);
  if (!win || win.maximized) return;
  const rect = icon.getBoundingClientRect();
  const dockBottom = document.getElementById('dock').getBoundingClientRect().top;
  win.element.style.setProperty('--min-x', `${rect.left + rect.width/2}px`);
  win.element.style.setProperty('--min-y', `${dockBottom}px`);
  win.element.style.animation = 'minimizeAnim 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards';
  win.minimized = true;
  setTimeout(() => {
    win.element.style.display = 'none';
    updateDock();
  }, 450);
}

function restoreWindow(appId) {
  const win = windows.get(appId);
  if (!win) return;
  win.element.style.display = 'flex';
  win.element.style.animation = 'windowOpen 0.45s var(--transition)';
  win.minimized = false;
  win.element.style.zIndex = ++zIndex;
  updateDock();
}

function maximizeWindow(appId) {
  const win = windows.get(appId);
  if (!win || win.minimized) return;
  const el = win.element;
  if (win.maximized) {
    el.classList.remove('maximized');
    win.maximized = false;
  } else {
    el.classList.add('maximized');
    win.maximized = true;
  }
}

function updateDock() {
  document.querySelectorAll('.dock-icon').forEach(icon => {
    const appId = icon.dataset.app;
    const win = windows.get(appId);
    const isOpen = win && !win.minimized;
    icon.classList.toggle('active', isOpen);
  });
}

function setupDrag() {
  let header = null;
  document.addEventListener('mousedown', e => {
    if (e.target.closest('.window-header') && !e.target.closest('.window-controls')) {
      header = e.target.closest('.window');
      const rect = header.getBoundingClientRect();
      dragData = {
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        startX: rect.left,
        startY: rect.top
      };
      header.style.transition = 'none';
      header.style.zIndex = ++zIndex;
      isDragging = true;
    }
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging || !header) return;
    const x = e.clientX - dragData.offsetX;
    const y = e.clientY - dragData.offsetY;
    header.style.left = x + 'px';
    header.style.top = y + 'px';
    header.style.transform = 'none';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging && header) {
      header.style.transition = '';
    }
    isDragging = false;
    header = null;
  });
}
