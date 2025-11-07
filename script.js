const dockIcons = document.querySelectorAll('.dock-icon');
const windows = document.querySelectorAll('.window');

dockIcons.forEach(icon => {
  icon.addEventListener('click', () => {
    const app = document.getElementById(icon.dataset.app);
    const isActive = app.classList.contains('active');
    windows.forEach(w => w.classList.remove('active'));
    dockIcons.forEach(i => i.classList.remove('active'));
    if(!isActive){
      app.classList.add('active');
      icon.classList.add('active');
    }
  });
});

// Window buttons + drag
document.querySelectorAll('.window-header').forEach(header=>{
  const win = header.parentElement;
  const [closeBtn,minBtn,maxBtn] = header.querySelectorAll('button');

  closeBtn.addEventListener('click',()=>{win.classList.remove('active'); dockIcons.forEach(i=>{if(i.dataset.app==win.id)i.classList.remove('active')})});
  minBtn.addEventListener('click',()=>{win.classList.remove('active'); dockIcons.forEach(i=>{if(i.dataset.app==win.id)i.classList.add('active')})});
  maxBtn.addEventListener('click',()=>{ 
    if(win.style.width==='100%'){win.style.width='600px';win.style.height='400px';win.style.top='50%';win.style.left='50%';win.style.transform='translate(-50%,-50%)';}
    else{win.style.width='100%';win.style.height='100%';win.style.top='0';win.style.left='0';win.style.transform='none';}
  });

  let dragging=false, offsetX=0, offsetY=0;
  header.addEventListener('mousedown',e=>{dragging=true; offsetX=e.clientX-win.offsetLeft; offsetY=e.clientY-win.offsetTop; header.style.cursor='grabbing';});
  document.addEventListener('mouseup',()=>{dragging=false; header.style.cursor='grab';});
  document.addEventListener('mousemove',e=>{if(dragging){win.style.left=(e.clientX-offsetX)+'px'; win.style.top=(e.clientY-offsetY)+'px';}});
});

// Settings
const themeSelect=document.getElementById('theme-select');
const wallpaperUpload=document.getElementById('wallpaper-upload');
const wallpaperThumbs=document.querySelectorAll('.wallpaper-thumb');
const applyBtn=document.getElementById('apply-settings');
let selectedWallpaper=null;
wallpaperThumbs.forEach(img=>img.addEventListener('click',()=>{wallpaperThumbs.forEach(i=>i.classList.remove('selected'));img.classList.add('selected');selectedWallpaper=img.src;}));
applyBtn.addEventListener('click',()=>{
  document.body.className=themeSelect.value;
  if(selectedWallpaper) document.getElementById('desktop').style.backgroundImage=`url(${selectedWallpaper})`;
  if(wallpaperUpload.files[0]){
    const reader=new FileReader();
    reader.onload=e=>document.getElementById('desktop').style.backgroundImage=`url(${e.target.result})`;
    reader.readAsDataURL(wallpaperUpload.files[0]);
  }
});

// AI
const aiInput=document.getElementById('ai-input');
const aiOutput=document.getElementById('ai-output');
aiInput.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    const cmd=aiInput.value.trim();
    aiOutput.innerHTML+=`<div><b>> ${cmd}</b></div>`;
    if(cmd==='/help') aiOutput.innerHTML+=`<div>/help, /about, /open notes, /settings, /clear, /shutdown</div>`;
    else if(cmd.startsWith('/open ')){
      const appName=cmd.split(' ')[1];
      const app=document.getElementById(appName);
      if(app){windows.forEach(w=>w.classList.remove('active')); app.classList.add('active'); dockIcons.forEach(i=>{if(i.dataset.app==appName)i.classList.add('active')});}
    } else if(cmd==='/clear') aiOutput.innerHTML='';
    else if(cmd==='/shutdown'){windows.forEach(w=>w.classList.remove('active')); dockIcons.forEach(i=>i.classList.remove('active'));}
    else aiOutput.innerHTML+=`<div>Неизвестная команда</div>`;
    aiInput.value=''; aiOutput.scrollTop=aiOutput.scrollHeight;
  }
});

// Browser
document.getElementById('open-browser')?.addEventListener('click',()=>window.open('https://neuron-p2p.ru','_blank'));

// Converter
const convertBtn = document.getElementById('convert-btn');
convertBtn?.addEventListener('click',()=>{
  const amount = parseFloat(document.getElementById('convert-input').value);
  const from = document.getElementById('from-currency').value;
  const to = document.getElementById('to-currency').value;
  if(isNaN(amount)){alert('Введите число'); return;}
  // Простые курсы USD->EUR->RUB
  const rates = {USD:1, EUR:0.9, RUB:90};
  const result = amount/rates[from]*rates[to];
  document.getElementById('convert-result').innerText = `${amount} ${from} = ${result.toFixed(2)} ${to}`;
});
// Firebase config
const firebaseConfig = {
  apiKey: "ТВОЙ_API_KEY",
  authDomain: "ТВОЙ_PROJECT.firebaseapp.com",
  projectId: "ТВОЙ_PROJECT_ID",
  storageBucket: "ТВОЙ_PROJECT.appspot.com",
  messagingSenderId: "ТВОЙ_SENDER_ID",
  appId: "ТВОЙ_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Авторизация
const loginScreen = document.getElementById('login-screen');
const desktop = document.getElementById('desktop');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const loginError = document.getElementById('login-error');

loginBtn.addEventListener('click',()=>{
  auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
    .then(()=>{loginScreen.style.display='none'; desktop.style.display='block'; loadUserData();})
    .catch(e=>loginError.innerText=e.message);
});

registerBtn.addEventListener('click',()=>{
  auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
    .then(()=>{loginScreen.style.display='none'; desktop.style.display='block'; loadUserData();})
    .catch(e=>loginError.innerText=e.message);
});

// Сохранение / загрузка Notes
const notesArea = document.getElementById('notes-area');
document.getElementById('save-notes').addEventListener('click',()=>{
  const uid = auth.currentUser.uid;
  db.collection('users').doc(uid).set({notes: notesArea.value}, {merge:true});
});

function loadUserData(){
  const uid = auth.currentUser.uid;
  db.collection('users').doc(uid).get().then(doc=>{
    if(doc.exists){
      const data = doc.data();
      if(data.notes) notesArea.value = data.notes;
      if(data.theme) document.body.className = data.theme;
      if(data.wallpaper) document.getElementById('desktop').style.backgroundImage = `url(${data.wallpaper})`;
    }
  });
}

// Settings: синхронизация темы и обоев
const themeSelect=document.getElementById('theme-select');
const wallpaperUpload=document.getElementById('wallpaper-upload');
const wallpaperThumbs=document.querySelectorAll('.wallpaper-thumb');
const applyBtn=document.getElementById('apply-settings');
let selectedWallpaper=null;
wallpaperThumbs.forEach(img=>img.addEventListener('click',()=>{wallpaperThumbs.forEach(i=>i.classList.remove('selected'));img.classList.add('selected');selectedWallpaper=img.src;}));
applyBtn.addEventListener('click',()=>{
  const theme = themeSelect.value;
  document.body.className=theme;
  let wallpaper = selectedWallpaper;
  if(wallpaperUpload.files[0]){
    const reader=new FileReader();
    reader.onload=e=>{wallpaper=e.target.result; setWallpaperAndSync(theme,wallpaper);}
    reader.readAsDataURL(wallpaperUpload.files[0]);
  } else {
    setWallpaperAndSync(theme,wallpaper);
  }
});

function setWallpaperAndSync(theme, wallpaper){
  if(theme) document.body.className = theme;
  if(wallpaper) document.getElementById('desktop').style.backgroundImage = `url(${wallpaper})`;
  // Sync to Firebase
  const uid = auth.currentUser.uid;
  db.collection('users').doc(uid).set({theme, wallpaper}, {merge:true});
}
