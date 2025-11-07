import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

const dockIcons=document.querySelectorAll('.dock-icon');
const windows=document.querySelectorAll('.window');

dockIcons.forEach(icon=>{
  icon.addEventListener('click',()=>{
    const app=document.getElementById(icon.dataset.app);
    const isActive=app.classList.contains('active');
    windows.forEach(w=>w.classList.remove('active'));
    dockIcons.forEach(i=>i.classList.remove('active'));
    if(!isActive){
      app.classList.add('active');
      icon.classList.add('active');
    }
  });
});

// Window buttons + drag
document.querySelectorAll('.window-header').forEach(header=>{
  const win=header.parentElement;
  const [closeBtn,minBtn,maxBtn]=header.querySelectorAll('button');
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

applyBtn.addEventListener('click',async ()=>{
  document.body.className=themeSelect.value;
  if(selectedWallpaper) document.getElementById('desktop').style.backgroundImage=`url(${selectedWallpaper})`;
  if(wallpaperUpload.files[0]){
    const reader=new FileReader();
    reader.onload=e=>document.getElementById('desktop').style.backgroundImage=`url(${e.target.result})`;
    reader.readAsDataURL(wallpaperUpload.files[0]);
  }
  const user=getAuth().currentUser;
  if(user){
    await setDoc(doc(getFirestore(), 'users', user.uid), {
      theme: document.body.className,
      wallpaper: document.getElementById('desktop').style.backgroundImage.replace(/url\(|\)|"/g,'')
    }, {merge:true});
  }
});

// Notes autosave
const notesArea=document.getElementById('notes-area');
notesArea.addEventListener('input',async ()=>{
  const user=getAuth().currentUser;
  if(user) await setDoc(doc(getFirestore(),'users',user.uid), {notes: notesArea.value}, {merge:true});
});

// AI input
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

// Converter
document.getElementById('conv-btn').addEventListener('click',()=>{
  const val=parseFloat(document.getElementById('conv-input').value);
  const type=document.getElementById('conv-type').value;
  let res=0;
  if(type==='usdToEur') res=(val*0.93).toFixed(2);
  if(type==='eurToUsd') res=(val*1.08).toFixed(2);
  document.getElementById('conv-result').textContent=res;
});
