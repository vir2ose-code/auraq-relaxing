import './style.css';
// ── SERVICE WORKER FÜR PWA (NATIVE FEEL) ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW registered!', reg);
    }).catch(err => {
      console.log('SW registration failed!', err);
    });
  });
}

// ── ANDROID INSTALL PROMPT LOGIK ──
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Den Installations-Link im Menü einblenden, falls vorhanden
  const installLink = document.getElementById('installAppLink');
  const installItem = document.getElementById('installAppItem');
  if (installItem) {
    installItem.style.display = 'block';
  }

  if (installLink) {
    installLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          } else {
            console.log('User dismissed the install prompt');
          }
          deferredPrompt = null;
          if (installItem) installItem.style.display = 'none';
        });
      }
    });
  }
});

import { translations } from './translations.js';

let currentLang = 'de';

function changeLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if(translations[lang] && translations[lang][key]) {
      el.innerHTML = translations[lang][key];
    }
  });
  updateButtonState(isPlaying);
}

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
     const lang = e.currentTarget.getAttribute('data-lang');
     document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
     e.currentTarget.classList.add('active');
     changeLanguage(lang);
  });
});

// ── CANVAS: Polar-Nebel + Sterne + Maus-Verfolgung ──
const cv = document.getElementById('bgCanvas');
const cx = cv.getContext('2d');
let W, H, stars = [];

let mouseX = 0, mouseY = 0;
let smoothX = 0, smoothY = 0;

window.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function resize() {
  W = cv.width  = innerWidth;
  H = cv.height = innerHeight;
  smoothX = mouseX = W * 0.5;
  smoothY = mouseY = H * 0.4;
}

function initStars() {
  stars = Array.from({length: 170}, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.15 + 0.2,
    a: Math.random(),
    speed: Math.random() * 0.003 + 0.001,
    phase: Math.random() * Math.PI * 2
  }));
}

// Polar-Nebel Schichten — jede folgt der Maus mit unterschiedlichem Versatz & Trägheit
const auroraBands = [
  { ox: -0.18, oy: -0.12, rx: 520, ry: 260, c1: 'rgba(80,55,140,',  c2: 'rgba(50,35,100,',  base: 0.28, amp: 0.09, driftX:  0.22, driftY:  0.08 },
  { ox:  0.14, oy:  0.10, rx: 440, ry: 200, c1: 'rgba(201,168,76,', c2: 'rgba(160,120,40,', base: 0.18, amp: 0.07, driftX: -0.18, driftY:  0.10 },
  { ox: -0.08, oy:  0.20, rx: 480, ry: 220, c1: 'rgba(60,40,110,',  c2: 'rgba(90,60,150,',  base: 0.24, amp: 0.08, driftX:  0.12, driftY: -0.14 },
  { ox:  0.22, oy: -0.18, rx: 360, ry: 180, c1: 'rgba(100,70,50,',  c2: 'rgba(130,90,40,',  base: 0.15, amp: 0.05, driftX: -0.10, driftY:  0.18 },
  { ox:  0.00, oy: -0.28, rx: 580, ry: 160, c1: 'rgba(70,48,120,',  c2: 'rgba(40,28,80,',   base: 0.22, amp: 0.08, driftX:  0.06, driftY:  0.06 },
  { ox: -0.24, oy:  0.15, rx: 320, ry: 160, c1: 'rgba(180,140,60,', c2: 'rgba(120,90,30,',  base: 0.14, amp: 0.05, driftX:  0.16, driftY: -0.08 },
];

const bandPos = auroraBands.map(() => ({ x: 0, y: 0 }));

let t = 0;

function drawEllipseNebula(x, y, rx, ry, angle, c1, c2, opacity) {
  cx.save();
  cx.translate(x, y);
  cx.rotate(angle);
  cx.scale(1, ry / rx);

  const g = cx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0,    c1 + opacity + ')');
  g.addColorStop(0.4,  c1 + (opacity * 0.55) + ')');
  g.addColorStop(0.75, c2 + (opacity * 0.2) + ')');
  g.addColorStop(1,    c1 + '0)');

  cx.beginPath();
  cx.arc(0, 0, rx, 0, Math.PI * 2);
  cx.fillStyle = g;
  cx.fill();
  cx.restore();
}

function draw() {
  smoothX += (mouseX - smoothX) * 0.018;
  smoothY += (mouseY - smoothY) * 0.018;

  cx.clearRect(0, 0, W, H);

  const bg = cx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,    '#16122a');
  bg.addColorStop(0.45, '#1e1934');
  bg.addColorStop(1,    '#171228');
  cx.fillStyle = bg;
  cx.fillRect(0, 0, W, H);

  auroraBands.forEach((b, i) => {
    const targetX = smoothX + b.ox * W + Math.sin(t * b.driftX + i) * 60;
    const targetY = smoothY + b.oy * H + Math.cos(t * b.driftY + i) * 40;

    const lag = 0.012 + i * 0.003;
    bandPos[i].x += (targetX - bandPos[i].x) * lag;
    bandPos[i].y += (targetY - bandPos[i].y) * lag;

    const opacity = b.base + Math.sin(t * 0.4 + i * 1.1) * b.amp;
    const angle   = t * 0.03 + i * 0.6;

    drawEllipseNebula(
      bandPos[i].x, bandPos[i].y,
      b.rx, b.ry, angle,
      b.c1, b.c2,
      Math.max(0, opacity)
    );
  });

  // Weicher Licht-Kern an der Mausposition
  const mg = cx.createRadialGradient(smoothX, smoothY, 0, smoothX, smoothY, 320);
  mg.addColorStop(0,   'rgba(201,168,76,0.07)');
  mg.addColorStop(0.4, 'rgba(100,70,160,0.05)');
  mg.addColorStop(1,   'rgba(0,0,0,0)');
  cx.beginPath(); cx.arc(smoothX, smoothY, 320, 0, Math.PI * 2);
  cx.fillStyle = mg; cx.fill();

  stars.forEach(s => {
    s.a = 0.12 + Math.abs(Math.sin(t * s.speed + s.phase)) * 0.75;
    cx.beginPath();
    cx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    cx.fillStyle = `rgba(245,239,224,${s.a})`;
    cx.fill();
  });

  t += 0.008;
  requestAnimationFrame(draw);
}

resize(); initStars(); draw();
window.addEventListener('resize', () => { resize(); initStars(); });

// ── WAVE BARS ──
const ww = document.getElementById('waveWrap');
[5,10,18,26,34,40,44,40,36,30,24,38,32,22,16,22,32,40,44,40,34,26,18,10,5].forEach((h,i)=>{
  const b=document.createElement('div');
  b.className='wbar';
  b.style.setProperty('--h',h+'px');
  b.style.setProperty('--d',(0.95+Math.random()*0.6)+'s');
  b.style.setProperty('--dl',(i*0.055)+'s');
  ww.appendChild(b);
});

// ── LOKALER 432 Hz AUDIO PLAYER & BIBLIOTHEK ──
const audioPlayer = document.getElementById('audioPlayer');
let isPlaying = false;
let playlist = [];
let currentIndex = -1;
let isShuffle = false;

// Datei laden wenn Nutzer sie auswählt
const fileInput = document.getElementById('audioFileInput');
fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  const oldLength = playlist.length;
  files.forEach(f => playlist.push(f));
  renderPlaylist();

  // Sofort erstes neues Lied abspielen, wenn vorher nichts lief
  if (currentIndex === -1) {
    playTrack(oldLength);
  } else {
    // Playlist UI auf jeden Fall updaten und Popup zeigen
    document.getElementById('playlistPopup').classList.add('show');
  }
});

function renderPlaylist() {
  const list = document.getElementById('playlistList');
  list.innerHTML = '';
  if (playlist.length === 0) {
    list.innerHTML = '<li class="empty-list">Noch keine Musik geladen.</li>';
    return;
  }
  playlist.forEach((file, index) => {
    const li = document.createElement('li');
    li.textContent = file.name.replace(/\.[^/.]+$/, ""); // Ohne Dateiendung
    if (index === currentIndex) li.classList.add('active');
    li.onclick = () => playTrack(index);
    list.appendChild(li);
  });
}

function playTrack(index) {
  if (index < 0 || index >= playlist.length) return;
  currentIndex = index;
  const file = playlist[index];
  
  if (file.url) {
      audioPlayer.src = file.url;
  } else {
      audioPlayer.src = URL.createObjectURL(file);
  }
  
  audioPlayer.play().then(() => {
    isPlaying = true;
    updateWaveState(true);
    updateButtonState(true);
  }).catch(e => console.warn('Hui:', e));

  // Player Texte updaten
  const titleEl = document.querySelector('.player-title');
  if(titleEl) titleEl.textContent = file.name.replace(/\.[^/.]+$/, "");
  const artistEl = document.querySelector('.player-artist');
  if(artistEl) artistEl.textContent = translations[currentLang].player_artist_lib;

  renderPlaylist();
}

// Play / Pause umschalten
window.toggleAudio = function() {
  if (playlist.length === 0) {
    document.getElementById('audioFileInput').click();
    return;
  }
  if (isPlaying) {
    audioPlayer.pause();
    isPlaying = false;
  } else {
    audioPlayer.play();
    isPlaying = true;
  }
  updateWaveState(isPlaying);
  updateButtonState(isPlaying);
};

// Fortschrittsbalken und Zeit
const progFill = document.querySelector('.prog-fill');
const progBar = document.querySelector('.prog-bar');
const timeC = document.getElementById('timeCurrent');
const timeT = document.getElementById('timeTotal');

function formatTime(sec) {
  if (isNaN(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

let isDraggingProgress = false;

audioPlayer.addEventListener('timeupdate', () => {
  if (!audioPlayer.duration || isDraggingProgress) return;
  const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  progFill.style.width = `${progress}%`;
  timeC.textContent = formatTime(audioPlayer.currentTime);
  timeT.textContent = formatTime(audioPlayer.duration);
});

function updateProgressFromEvent(e) {
  const rect = progBar.getBoundingClientRect();
  let clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches.length > 0 ? e.touches[0].clientX : 0);
  if (e.type === 'touchend' && e.changedTouches && e.changedTouches.length > 0) {
    clientX = e.changedTouches[0].clientX;
  }
  let pos = (clientX - rect.left) / rect.width;
  pos = Math.max(0, Math.min(1, pos));
  progFill.style.width = `${pos * 100}%`;
  timeC.textContent = formatTime(pos * audioPlayer.duration);
  return pos;
}

function startDrag(e) {
  if (!audioPlayer.duration) return;
  isDraggingProgress = true;
  updateProgressFromEvent(e);
  
  window.addEventListener('mousemove', drag);
  window.addEventListener('touchmove', drag, {passive: true});
  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('touchend', stopDrag);
}

function drag(e) {
  if (isDraggingProgress) updateProgressFromEvent(e);
}

function stopDrag(e) {
  if (isDraggingProgress) {
    const pos = updateProgressFromEvent(e);
    audioPlayer.currentTime = pos * audioPlayer.duration;
    isDraggingProgress = false;
    
    window.removeEventListener('mousemove', drag);
    window.removeEventListener('touchmove', drag);
    window.removeEventListener('mouseup', stopDrag);
    window.removeEventListener('touchend', stopDrag);
  }
}

progBar.addEventListener('mousedown', startDrag);
progBar.addEventListener('touchstart', startDrag, {passive: true});

// Nächstes / Vorheriges
document.getElementById('btnNext').onclick = () => {
  if (playlist.length === 0) return;
  let next = isShuffle ? Math.floor(Math.random() * playlist.length) : (currentIndex + 1) % playlist.length;
  playTrack(next);
};
document.getElementById('btnPrev').onclick = () => {
  if (playlist.length === 0) return;
  let prev = (currentIndex - 1 + playlist.length) % playlist.length;
  playTrack(prev);
};

// Shuffle
document.getElementById('btnShuffle').onclick = function() {
  isShuffle = !isShuffle;
  this.style.color = isShuffle ? 'var(--gold2)' : 'var(--dim)';
};

// Menü Popup in Player
document.getElementById('btnMenuPlayer').onclick = () => {
  document.getElementById('playlistPopup').classList.toggle('show');
};

// Wenn Song zu Ende → nächstes
audioPlayer.addEventListener('ended', () => {
  if (playlist.length > 0) {
    document.getElementById('btnNext').click();
  } else {
    isPlaying = false;
    updateWaveState(false);
    updateButtonState(false);
  }
});

// Welle leuchtet & Logo strahlt
function updateWaveState(playing) {
  document.querySelectorAll('.wbar').forEach((b) => {
    if (playing) {
      b.style.animationDuration = (0.35 + Math.random() * 0.55) + 's';
      b.style.opacity = '1';
      b.style.filter  = 'drop-shadow(0 0 5px rgba(201,168,76,0.65))';
    } else {
      b.style.animationDuration = (0.95 + Math.random() * 0.6) + 's';
      b.style.opacity = '0.75';
      b.style.filter  = 'none';
    }
  });

  // Feine goldene Welle im Player-Zentrum
  document.querySelectorAll('.aring').forEach(a => {
    if (playing) a.classList.add('active');
    else a.classList.remove('active');
  });
}

// Buttons updaten
function updateButtonState(playing) {
  const btnSpan = document.querySelector('#btnPlay span');
  const btnLoad = document.getElementById('btnLoad');
  
  if (btnSpan) btnSpan.textContent = playing ? translations[currentLang].btn_pause : translations[currentLang].btn_play;
  if (btnLoad) {
    btnLoad.innerHTML = playing ? translations[currentLang].btn_stop : translations[currentLang].btn_load;
    if (playing) {
      btnLoad.onclick = () => { audioPlayer.pause(); isPlaying=false; updateWaveState(false); updateButtonState(false); };
    } else {
      btnLoad.onclick = () => document.getElementById('audioFileInput').click();
    }
  }
  
  const playBtnPlayer = document.getElementById('playBtnPlayer');
  if (playBtnPlayer) {
     playBtnPlayer.textContent = playing ? '⏸' : '▶';
     playBtnPlayer.style.boxShadow=playing?'0 0 55px rgba(201,168,76,0.7)':'0 0 28px rgba(201,168,76,0.35)';
  }
}

// ── HAMBURGER MENÜ ──
const hamburger    = document.getElementById('hamburger');
const menuPanel    = document.getElementById('menuPanel');
const menuOverlay  = document.getElementById('menuOverlay');

function toggleMenu() {
  const isOpen = menuPanel.classList.contains('open');
  hamburger.classList.toggle('open');
  menuPanel.classList.toggle('open');
  menuOverlay.classList.toggle('open');
  document.body.style.overflow = isOpen ? '' : 'hidden';
}

hamburger.addEventListener('click', toggleMenu);
menuOverlay.addEventListener('click', toggleMenu);

// Menü-Links schließen das Menü
document.querySelectorAll('.menu-nav a').forEach(a => {
  a.addEventListener('click', toggleMenu);
});

// ── ÜBER MICH OVERLAY ──
const aboutOverlay  = document.getElementById('aboutMeOverlay');
const aboutCloseBtn = document.getElementById('aboutCloseBtn');
const menuAboutMe   = document.getElementById('menuAboutMe');

function openAboutMe() {
  aboutOverlay.style.display = 'block';
  requestAnimationFrame(() => {
    aboutOverlay.classList.add('open');
  });
  document.body.style.overflow = 'hidden';
}
function closeAboutMe() {
  aboutOverlay.classList.remove('open');
  setTimeout(() => {
    aboutOverlay.style.display = 'none';
  }, 400);
  document.body.style.overflow = '';
}

if (menuAboutMe) {
  menuAboutMe.addEventListener('click', (e) => {
    e.preventDefault();
    openAboutMe();
  });
}
if (aboutCloseBtn) {
  aboutCloseBtn.addEventListener('click', closeAboutMe);
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && aboutOverlay.classList.contains('open')) {
    closeAboutMe();
  }
});

// ── MEDITATIONEN MENÜ LINK ──
const menuMeditationen = document.getElementById('menuMeditationen');
if (menuMeditationen) {
  menuMeditationen.addEventListener('click', (e) => {
    e.preventDefault();
    playlist = [
      { name: '432 All My Energy',             url: '/audio/meditationen/432 ALL MY ENERGY.mp3' },
      { name: '432 Elysian Silence',            url: '/audio/meditationen/432 Elysian Silence.mp3' },
      { name: '432 Goodnight Long',             url: '/audio/meditationen/432 Goodnight LONG.mp3' },
      { name: '432 Hindi Meditation',           url: '/audio/meditationen/432 Hindi Medit.mp3' },
      { name: '432 Innere Ruhe in dir',         url: '/audio/meditationen/432 Innere Ruhe in dir.mp3' },
      { name: '432 Relaxed Thoughts',           url: '/audio/meditationen/432 Relaxed thoughts.mp3' },
      { name: 'Freie Gedanken 432',             url: '/audio/meditationen/Freie Gedanken 432.mp3' },
      { name: 'Ruhe in der Stille #6 432 Hz',   url: '/audio/meditationen/Ruhe in der Stille #6 432 Hz.mp3' },
      { name: 'Wonderful Natur #5 432 Hz',      url: '/audio/meditationen/Wonderful Natur #5 432 Hz.mp3' }
    ];
    currentIndex = 0;
    playTrack(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ── SCHLAFMUSIK MENÜ LINK ──
const menuSchlafmusik = document.getElementById('menuSchlafmusik');
if (menuSchlafmusik) {
  menuSchlafmusik.addEventListener('click', (e) => {
    e.preventDefault();
    playlist = [
      { name: '432 Goodnight Long', url: '/audio/schlafmusik/432 Goodnight LONG.mp3' }
    ];
    currentIndex = 0;
    playTrack(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ── HEILKLÄNGE MENÜ LINK ──
const menuHeilklaenge = document.getElementById('menuHeilklaenge');
if (menuHeilklaenge) {
  menuHeilklaenge.addEventListener('click', (e) => {
    e.preventDefault();
    playlist = [];
    for (let i = 1; i <= 11; i++) {
      playlist.push({
        name: `Kristallklang · Schale ${i}`,
        url: `/audio/klangschalen/${i}.mp3`
      });
    }
    currentIndex = 0;
    playTrack(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ── 432 HZ PLAYER MENÜ LINK ──
const menuPlayer = document.getElementById('menuPlayer');
if (menuPlayer) {
  menuPlayer.addEventListener('click', (e) => {
    e.preventDefault();
    const playerSection = document.querySelector('.player-glass');
    if (playerSection) {
      playerSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

// Second Play Button (inside mock player)
const playBtnPlayer = document.getElementById('playBtnPlayer');
if (playBtnPlayer) {
    playBtnPlayer.onclick=function(){
        window.toggleAudio();
    };
}

// ── FEATURE MODALS ──
const featureModal = document.getElementById('featureModal');
const featureOverlay = document.getElementById('featureOverlay');
const featureModalTitle = document.getElementById('featureModalTitle');
const featureModalDesc = document.getElementById('featureModalDesc');

window.openFeatureModal = function(id) {
  if (translations[currentLang][`modal_feat_${id}_title`]) {
    featureModalTitle.innerHTML = translations[currentLang][`modal_feat_${id}_title`];
    featureModalDesc.innerHTML = translations[currentLang][`modal_feat_${id}_desc`];
    
    const featureModalActions = document.getElementById('featureModalActions');
    if (featureModalActions) {
      featureModalActions.innerHTML = '';
      if (id === '3' || id === '4') {
        const btn = document.createElement('button');
        btn.className = 'modal-btn-play';
        btn.innerHTML = translations[currentLang].modal_load_audio || "🎵 Beispiele abspielen";
        btn.onclick = () => {
          playlist = [];
          if (id === '3') {
            for (let i = 1; i <= 11; i++) {
              playlist.push({
                name: `Kristallklang Schale ${i}`,
                url: `/audio/klangschalen/${i}.mp3`
              });
            }
          } else if (id === '4') {
            for (let i = 1; i <= 2; i++) {
              playlist.push({
                name: `Dhyana Meditation Session ${i}`,
                url: `/audio/dhyana/${i}.mp3`
              });
            }
          }
          currentIndex = 0;
          playTrack(0);
          window.closeFeatureModal();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        featureModalActions.appendChild(btn);
      }
    }

    featureModal.classList.add('show');
    featureOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
};

window.closeFeatureModal = function() {
  featureModal.classList.remove('show');
  featureOverlay.classList.remove('show');
  document.body.style.overflow = '';
};

if (featureOverlay) {
    featureOverlay.addEventListener('click', window.closeFeatureModal);
}

document.querySelectorAll('.fcard-feat[data-feature]').forEach(card => {
  card.addEventListener('click', () => {
    const featureId = card.getAttribute('data-feature');
    window.openFeatureModal(featureId);
  });
});

// ── SLEEP TIMER ──
let sleepTimerDuration = 0; // in minutes
let sleepTimerInterval = null;

const btnSleepTimer = document.getElementById('btnSleepTimer');
const sleepTimerBadge = document.getElementById('sleepTimerBadge');

if (btnSleepTimer) {
  btnSleepTimer.addEventListener('click', () => {
    // Cycle: 0 -> 15 -> 30 -> 60 -> 0 (off)
    if (sleepTimerDuration === 0) sleepTimerDuration = 15;
    else if (sleepTimerDuration === 15) sleepTimerDuration = 30;
    else if (sleepTimerDuration === 30) sleepTimerDuration = 60;
    else sleepTimerDuration = 0;

    if (sleepTimerDuration === 0) {
      sleepTimerBadge.style.display = 'none';
      btnSleepTimer.style.opacity = '1';
      btnSleepTimer.style.filter = 'none';
      clearInterval(sleepTimerInterval);
    } else {
      sleepTimerBadge.style.display = 'block';
      let minStr = translations[currentLang].timer_min ? translations[currentLang].timer_min.toLowerCase() : "m";
      sleepTimerBadge.textContent = sleepTimerDuration + minStr;
      btnSleepTimer.style.opacity = '1';
      btnSleepTimer.style.filter = 'drop-shadow(0 0 8px rgba(201,168,76,0.8))';

      clearInterval(sleepTimerInterval);
      let timeRemaining = sleepTimerDuration * 60; // in seconds
      
      sleepTimerInterval = setInterval(() => {
        timeRemaining--;
        if (timeRemaining <= 0) {
          // Pause audio if playing
          if (isPlaying) {
             window.toggleAudio();
          }
          clearInterval(sleepTimerInterval);
          sleepTimerDuration = 0;
          sleepTimerBadge.style.display = 'none';
          btnSleepTimer.style.filter = 'none';
        } else {
          sleepTimerBadge.textContent = Math.ceil(timeRemaining / 60) + minStr;
        }
      }, 1000);
    }
  });
}

const contactForm = document.getElementById('auraqContactForm');
const formResult = document.getElementById('formResult');
const submitBtn = document.getElementById('submitBtn');

if (contactForm) {
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(contactForm);
    const object = Object.fromEntries(formData);
    const json = JSON.stringify(object);

    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
    formResult.style.color = 'var(--gold)';
    formResult.textContent = currentLang === 'de' ? 'Sende...' : (currentLang === 'pl' ? 'Wysyłanie...' : (currentLang === 'es' ? 'Enviando...' : 'Sending...'));

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: json
    })
    .then(async (response) => {
      let json = await response.json();
      if (response.status == 200) {
        formResult.style.color = '#4ade80';
        formResult.textContent = translations[currentLang].contact_success;
        contactForm.reset();
      } else {
        formResult.style.color = '#f87171';
        formResult.textContent = translations[currentLang].contact_error;
      }
    })
    .catch(() => {
      formResult.style.color = '#f87171';
      formResult.textContent = translations[currentLang].contact_error;
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      setTimeout(() => { formResult.textContent = ""; }, 5000);
    });
  });
}

// ── LANDING PAGE BUTTON LOGIK ──
const btnHeroDiveIn = document.getElementById('btnHeroDiveIn');
const btnHeroDiscovery = document.getElementById('btnHeroDiscovery');

if (btnHeroDiveIn) {
  btnHeroDiveIn.addEventListener('click', () => {
    const menuMed = document.getElementById('menuMeditationen');
    if (menuMed) {
      menuMed.click();
      const playerSec = document.querySelector('.player-wrap');
      if (playerSec) playerSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

if (btnHeroDiscovery) {
  btnHeroDiscovery.addEventListener('click', () => {
    const featSec = document.getElementById('featuresSection');
    if (featSec) featSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}


