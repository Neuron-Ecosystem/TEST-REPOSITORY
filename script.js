const icons = document.querySelectorAll('.dock-icon');
const windows = document.querySelectorAll('.window');

icons.forEach(icon => {
  icon.addEventListener('click', () => {
    const app = document.getElementById(icon.dataset.app);
    const isActive = app.classList.contains('active');
    windows.forEach(w => w.classList.remove('active'));
    if (!isActive) app.classList.add('active');
  });
});

document.querySelectorAll('.close').forEach(btn => {
  btn.addEventListener('click', e => e.target.closest('.window').classList.remove('active'));
});
document.querySelectorAll('.min').forEach(btn => {
  btn.addEventListener('click', e => e.target.closest('.window').classList.remove('active'));
});
document.querySelectorAll('.max').forEach(btn => {
  btn.addEventListener('click', e => {
    const win = e.target.closest('.window');
    win.classList.toggle('maximized');
    if (win.classList.contains('maximized')) {
      win.style.top = '0'; win.style.left = '0'; win.style.width = '100%'; win.style.height = '100%';
    } else {
      win.style = '';
    }
  });
});
