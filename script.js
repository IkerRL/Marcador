// 1. LISTA OFICIAL DE LOS 14 EQUIPOS
const equipos = [
    { nombre: "Rose Devil", logo: "logo1.png" },
    { nombre: "Golden Sex", logo: "logo2.png" },
    { nombre: "Al-dedillo VC", logo: "logo3.png" },
    { nombre: "LOS AKRTONA2", logo: "logo4.png" },
    { nombre: "Crimson Eclipse", logo: "logo5.png" },
    { nombre: "Makaco NinjaPelocho", logo: "logo6.png" },
    { nombre: "Bloody Fruit", logo: "logo7.png" },
    { nombre: "Hijas del Kaos", logo: "logo8.png" },
    { nombre: "Konoha Makaca", logo: "logo9.png" },
    { nombre: "Team Obrikat", logo: "logo10.png" },
    { nombre: "TETONES", logo: "logo11.png" },
    { nombre: "GOATS", logo: "logo12.png" },
    { nombre: "SPIDYBOOBS", logo: "logo13.png" },
    { nombre: "MUGIWARAS", logo: "logo14.png" },
    { nombre: "Miaus", logo: "logo15.png" }
];

let sideSelecting = 'left';

// Generar la lista en el menú modal al cargar la página
const grid = document.getElementById('team-grid');
equipos.forEach(eq => {
    const div = document.createElement('div');
    div.className = 'team-option';
    // Usamos el logo y nombre definidos en la lista superior
    div.innerHTML = `<img src="${eq.logo}" onerror="this.src='placeholder.png'"><span>${eq.nombre}</span>`;
    div.onclick = () => selectTeam(eq.nombre, eq.logo);
    grid.appendChild(div);
});

// Abrir el selector (Izquierda o Derecha)
function openSelector(side) {
    if (window.isPantalla) return;
    sideSelecting = side;
    document.getElementById('team-selector').style.display = 'flex';
}

// Cerrar el selector
function closeSelector() {
    document.getElementById('team-selector').style.display = 'none';
    const searchInput = document.getElementById('team-search-input');
    if (searchInput) {
        searchInput.value = '';
        filterTeams('');
    }
}

// Actualizar el equipo en el marcador
function selectTeam(nombre, logo) {
    document.getElementById(`name-${sideSelecting}`).innerText = nombre;
    document.getElementById(`img-${sideSelecting}`).src = logo;
    closeSelector();
    broadcastState();
}

// --- LÓGICA DE DETALLES DE MAPAS (BO3/BO5) ---
let mapsLeft = 0;
let mapsRight = 0;

function changeMapWin(side, event) {
    if (window.isPantalla) return;
    event.preventDefault();
    
    let maps = (side === 'left') ? mapsLeft : mapsRight;
    
    if (event.type === 'click') {
        if (maps < 3) maps++;
    } else if (event.type === 'contextmenu') {
        if (maps > 0) maps--;
    }
    
    if (side === 'left') {
        mapsLeft = maps;
    } else {
        mapsRight = maps;
    }
    
    updateMapsUI();
    broadcastState();
}

function updateMapsUI() {
    const dotsLeft = document.querySelectorAll('#maps-left .map-win-dot');
    dotsLeft.forEach((dot) => {
        const dotIdx = parseInt(dot.getAttribute('data-idx'));
        if (dotIdx < mapsLeft) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    
    const dotsRight = document.querySelectorAll('#maps-right .map-win-dot');
    dotsRight.forEach((dot) => {
        const dotIdx = parseInt(dot.getAttribute('data-idx'));
        if (dotIdx < mapsRight) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// Bind context menu listeners for map dots
setTimeout(() => {
    const mapsLeftEl = document.getElementById('maps-left');
    const mapsRightEl = document.getElementById('maps-right');
    if (mapsLeftEl) {
        mapsLeftEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            changeMapWin('left', e);
        });
    }
    if (mapsRightEl) {
        mapsRightEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            changeMapWin('right', e);
        });
    }
}, 500);

// --- LÓGICA DE ALERTA MATCH POINT ---
function checkMatchPoint() {
    const scoreLeftEl = document.getElementById('score-left');
    const scoreRightEl = document.getElementById('score-right');
    if (!scoreLeftEl || !scoreRightEl) return;

    const scoreLeft = parseInt(scoreLeftEl.innerText) || 0;
    const scoreRight = parseInt(scoreRightEl.innerText) || 0;
    
    const mpLeft = document.getElementById('mp-left');
    const mpRight = document.getElementById('mp-right');
    
    if (mpLeft) mpLeft.style.display = (scoreLeft === 12) ? 'block' : 'none';
    if (mpRight) mpRight.style.display = (scoreRight === 12) ? 'block' : 'none';
}

// --- LÓGICA DE PUNTUACIÓN ---

// Disparar animación de salto en el marcador al cambiar
function triggerScorePop(side) {
    const scoreEl = document.getElementById(`score-${side}`);
    if (scoreEl) {
        scoreEl.classList.remove('pop-anim');
        void scoreEl.offsetWidth; // Forzar reflujo
        scoreEl.classList.add('pop-anim');
    }
}

function changeScore(side) {
    if (window.isPantalla) return;
    const scoreEl = document.getElementById(`score-${side}`);
    let currentScore = parseInt(scoreEl.innerText) || 0;
    
    currentScore++;

    // REGLA DE ORO: Si alguien llega a 14, la partida termina y todo vuelve a 0
    if (currentScore >= 14) {
        console.log("Partida finalizada por 13 rondas.");
        resetScores();
    } else {
        scoreEl.innerText = currentScore;
        triggerScorePop(side);
        checkMatchPoint();
    }
    broadcastState();
}

function decrementScore(side) {
    if (window.isPantalla) return;
    const scoreEl = document.getElementById(`score-${side}`);
    let currentScore = parseInt(scoreEl.innerText) || 0;
    if (currentScore > 0) {
        currentScore--;
        scoreEl.innerText = currentScore;
        triggerScorePop(side);
        checkMatchPoint();
        broadcastState();
    }
}

// Bind context menu listeners for score boxes
setTimeout(() => {
    const scoreLeftEl = document.getElementById('score-left');
    const scoreRightEl = document.getElementById('score-right');
    if (scoreLeftEl) {
        scoreLeftEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            decrementScore('left');
        });
    }
    if (scoreRightEl) {
        scoreRightEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            decrementScore('right');
        });
    }
}, 500);

// Poner ambos marcadores a 0
function resetScores() {
    document.getElementById('score-left').innerText = "0";
    document.getElementById('score-right').innerText = "0";
    mapsLeft = 0;
    mapsRight = 0;
    updateMapsUI();
    checkMatchPoint();
    triggerScorePop('left');
    triggerScorePop('right');
    broadcastState();
}

// --- LÓGICA DE INTERCAMBIO (SWAP SIDES) ---
function swapSides() {
    if (window.isPantalla) return;
    
    // Swap rondas
    const scoreLeftEl = document.getElementById('score-left');
    const scoreRightEl = document.getElementById('score-right');
    const tempScore = scoreLeftEl.innerText;
    scoreLeftEl.innerText = scoreRightEl.innerText;
    scoreRightEl.innerText = tempScore;
    
    // Swap team names
    const nameLeftEl = document.getElementById('name-left');
    const nameRightEl = document.getElementById('name-right');
    const tempName = nameLeftEl.innerText;
    nameLeftEl.innerText = nameRightEl.innerText;
    nameRightEl.innerText = tempName;
    
    // Swap team images
    const imgLeftEl = document.getElementById('img-left');
    const imgRightEl = document.getElementById('img-right');
    const tempImg = imgLeftEl.src;
    imgLeftEl.src = imgRightEl.src;
    imgRightEl.src = tempImg;
    
    // Swap map wins variables
    const tempMaps = mapsLeft;
    mapsLeft = mapsRight;
    mapsRight = tempMaps;
    
    // Trigger animations on both scores
    triggerScorePop('left');
    triggerScorePop('right');
    
    // Update UIs
    updateMapsUI();
    checkMatchPoint();
    
    // Broadcast
    broadcastState();
}

// --- FILTRO DE BÚSQUEDA EN SELECTOR ---
function filterTeams(query) {
    const cleanQuery = query.toLowerCase().trim();
    const options = document.querySelectorAll('.team-option');
    options.forEach(opt => {
        const teamName = opt.querySelector('span').innerText.toLowerCase();
        if (teamName.includes(cleanQuery)) {
            opt.style.display = 'block';
        } else {
            opt.style.display = 'none';
        }
    });
}

// CONTROL POR TECLADO
window.addEventListener('keydown', (e) => {
    if (window.isPantalla) return;
    // R para resetear todo a cero
    if (e.key === 'r' || e.key === 'R') {
        resetScores();
    }
    // Escape para cerrar el menú de equipos si se abre por error
    if (e.key === 'Escape') {
        closeSelector();
    }
});

// ================================================================
// SINCRONIZACIÓN EN VIVO (MQTT via HiveMQ)
// ================================================================
const syncToggleBtn        = document.getElementById('syncToggleBtn');
const syncPanel            = document.getElementById('syncPanel');
const syncPulse            = document.getElementById('syncPulse');
const syncStatusBadge      = document.getElementById('syncStatusBadge');
const syncRoomInput        = document.getElementById('syncRoomInput');
const btnSyncConnect       = document.getElementById('btnSyncConnect');
const btnSyncCopyLink      = document.getElementById('btnSyncCopyLink');
const btnSyncDisconnect    = document.getElementById('btnSyncDisconnect');
const syncConnectedActions = document.getElementById('syncConnectedActions');
const syncBrokerInput      = document.getElementById('syncBrokerInput');
const syncTopicInput       = document.getElementById('syncTopicInput');

let mqttClient = null;
let mqttTopic  = '';
let isApplyingSyncState = false;

// Historial de mensajes para evitar duplicados (self-echo)
const MSG_HISTORIAL = new Set();

// Toggle panel
if (syncToggleBtn) {
    syncToggleBtn.addEventListener('click', () => {
        syncPanel.classList.toggle('active');
    });
}
const monkeyRight = document.getElementById('monkeyRight');
if (monkeyRight) {
    monkeyRight.addEventListener('click', (e) => {
        e.stopPropagation();
        syncPanel.classList.toggle('active');
    });
}

const monkeyLeft = document.getElementById('monkeyLeft');
const timerPanel = document.getElementById('timerPanel');
if (monkeyLeft) {
    monkeyLeft.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.isPantalla) return;
        timerPanel.classList.toggle('active');
    });
}

document.addEventListener('click', (e) => {
    const isMonkeyClick = monkeyRight && monkeyRight.contains(e.target);
    const isToggleClick = syncToggleBtn && syncToggleBtn.contains(e.target);
    if (!isMonkeyClick && !isToggleClick && syncPanel && !syncPanel.contains(e.target)) {
        syncPanel.classList.remove('active');
    }

    const isMonkeyLeftClick = monkeyLeft && monkeyLeft.contains(e.target);
    if (!isMonkeyLeftClick && timerPanel && !timerPanel.contains(e.target)) {
        timerPanel.classList.remove('active');
    }
});

// Generar código de sala aleatorio
function generateRandomRoom() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'MARCADOR-';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Auto-rellenar sala desde URL o generar una nueva
const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');
const isPantalla = urlParams.get('pantalla') === 'true';
const isAdmin = urlParams.get('admin') === 'true';

// Determinar el rol/modo de forma dinámica
if (roomParam) {
    window.roomName = roomParam;
    
    // Si tiene sala por URL pero no tiene &admin=true, por defecto actúa como Pantalla
    if (!isAdmin) {
        window.isPantalla = true;
        document.body.classList.add('pantalla-mode');
        
        // Si es el modo de pantalla limpia de OBS, añadimos obs-mode para desactivar interacciones
        if (isPantalla) {
            document.body.classList.add('obs-mode');
        }
    }
    
    // Conectar automáticamente a la sala
    if (syncRoomInput) syncRoomInput.value = roomParam;
    setTimeout(() => connectMQTT(roomParam), 600);
} else {
    // Si abrimos la URL raíz sin parámetros, es modo Admin por defecto y genera código de sala
    if (syncRoomInput) syncRoomInput.value = generateRandomRoom();
}

// Actualizar UI de estado de conexión
function updateConnectionStatus(status) {
    if (!syncPulse || !syncStatusBadge) return;
    syncPulse.className = 'pulse-icon';
    syncStatusBadge.className = 'status-badge';

    if (status === 'disconnected') {
        syncPulse.classList.add('red');
        syncStatusBadge.classList.add('status-disconnected');
        syncStatusBadge.textContent = 'DESCONECTADO';
        if (btnSyncConnect) btnSyncConnect.style.display = 'inline-block';
        if (syncConnectedActions) syncConnectedActions.style.display = 'none';
        if (syncRoomInput) syncRoomInput.disabled = false;
    } else if (status === 'connecting') {
        syncPulse.classList.add('yellow');
        syncStatusBadge.classList.add('status-connecting');
        syncStatusBadge.textContent = 'CONECTANDO...';
        if (btnSyncConnect) btnSyncConnect.style.display = 'none';
        if (syncConnectedActions) syncConnectedActions.style.display = 'none';
        if (syncRoomInput) syncRoomInput.disabled = true;
    } else if (status === 'connected') {
        syncPulse.classList.add('green');
        syncStatusBadge.classList.add('status-connected');
        syncStatusBadge.textContent = `SALA: ${syncRoomInput.value}`;
        if (btnSyncConnect) btnSyncConnect.style.display = 'none';
        if (syncConnectedActions) syncConnectedActions.style.display = 'flex';
        if (syncRoomInput) syncRoomInput.disabled = true;
    }
}

// Conectar al broker MQTT
function connectMQTT(roomName) {
    if (mqttClient) {
        mqttClient.end(true);
        mqttClient = null;
    }

    const broker     = (syncBrokerInput?.value.trim()) || 'wss://broker.hivemq.com:8884/mqtt';
    const topicBase  = (syncTopicInput?.value.trim())  || 'copa_primate_marcador';
    mqttTopic        = `${topicBase}/${roomName.trim()}`;

    console.log(`Conectando a MQTT broker: ${broker} | Tema: ${mqttTopic}`);
    updateConnectionStatus('connecting');

    mqttClient = mqtt.connect(broker, {
        clientId: 'marcador_' + Math.random().toString(16).slice(2, 10),
        clean: true,
        reconnectPeriod: 3000,
    });

    mqttClient.on('connect', () => {
        console.log(`Conectado a MQTT en sala: ${roomName}`);
        updateConnectionStatus('connected');
        mqttClient.subscribe(mqttTopic, { qos: 0 });
        // Pedir estado actual a otros clientes conectados
        publishMQTT({ type: 'REQUEST_STATE' });
    });

    mqttClient.on('message', (topic, payload) => {
        try {
            const msg = JSON.parse(payload.toString());

            // Deduplicar: ignorar mensajes propios
            if (msg._id && MSG_HISTORIAL.has(msg._id)) return;

            console.log('Mensaje MQTT recibido:', msg.type);

            if (msg.type === 'REQUEST_STATE') {
                // Si somos el admin, responder con el estado actual
                if (!window.isPantalla) {
                    broadcastState();
                }
            } else if (msg.type === 'STATE_UPDATE') {
                isApplyingSyncState = true;
                aplicarEstado(msg.state);
                isApplyingSyncState = false;
            }
        } catch (e) {
            console.error('Error al procesar mensaje MQTT:', e);
        }
    });

    mqttClient.on('reconnect', () => {
        console.log('Reconectando a MQTT...');
        updateConnectionStatus('connecting');
    });

    mqttClient.on('error', (err) => {
        console.error('Error MQTT:', err);
        updateConnectionStatus('disconnected');
    });

    mqttClient.on('close', () => {
        console.log('Conexión MQTT cerrada');
        updateConnectionStatus('disconnected');
    });
}

// Publicar mensaje en el tema de la sala
function publishMQTT(msg) {
    if (!mqttClient || !mqttClient.connected) return;
    const id = Math.random().toString(36).slice(2, 10);
    msg._id = id;
    MSG_HISTORIAL.add(id);
    if (MSG_HISTORIAL.size > 200) {
        const first = MSG_HISTORIAL.values().next().value;
        MSG_HISTORIAL.delete(first);
    }
    mqttClient.publish(mqttTopic, JSON.stringify(msg), { qos: 0, retain: false });
}

// Serializar y emitir el estado completo del marcador
function broadcastState() {
    if (isApplyingSyncState) return;
    if (!mqttClient || !mqttClient.connected) return;

    console.log('Publicando estado via MQTT...');

    const state = {
        nameLeft: document.getElementById('name-left').innerText,
        imgLeft: document.getElementById('img-left').getAttribute('src'),
        scoreLeft: document.getElementById('score-left').innerText,
        mapsLeft: mapsLeft,
        nameRight: document.getElementById('name-right').innerText,
        imgRight: document.getElementById('img-right').getAttribute('src'),
        scoreRight: document.getElementById('score-right').innerText,
        mapsRight: mapsRight,
        timerActive: activeTimer !== null,
        timerType: activeTimer ? activeTimer.type : null,
        timerEndTime: activeTimer ? activeTimer.endTime : null,
        timerDuration: activeTimer ? activeTimer.duration : null
    };

    publishMQTT({ type: 'STATE_UPDATE', state });
}

// Aplicar estado recibido de la red
function aplicarEstado(state) {
    if (!state) return;
    console.log('Aplicando estado recibido...');

    if (state.nameLeft !== undefined) document.getElementById('name-left').innerText = state.nameLeft;
    if (state.imgLeft !== undefined) document.getElementById('img-left').src = state.imgLeft;
    
    if (state.scoreLeft !== undefined) {
        const leftEl = document.getElementById('score-left');
        if (leftEl.innerText !== state.scoreLeft) {
            leftEl.innerText = state.scoreLeft;
            triggerScorePop('left');
        }
    }
    
    if (state.mapsLeft !== undefined) {
        mapsLeft = state.mapsLeft;
    }
    
    if (state.nameRight !== undefined) document.getElementById('name-right').innerText = state.nameRight;
    if (state.imgRight !== undefined) document.getElementById('img-right').src = state.imgRight;
    
    if (state.scoreRight !== undefined) {
        const rightEl = document.getElementById('score-right');
        if (rightEl.innerText !== state.scoreRight) {
            rightEl.innerText = state.scoreRight;
            triggerScorePop('right');
        }
    }
    
    if (state.mapsRight !== undefined) {
        mapsRight = state.mapsRight;
    }
    
    updateMapsUI();
    checkMatchPoint();

    // Sincronización del temporizador
    if (state.timerActive !== undefined) {
        if (state.timerActive) {
            const remaining = Math.round((state.timerEndTime - Date.now()) / 1000);
            if (remaining > 0) {
                if (!activeTimer || activeTimer.type !== state.timerType || Math.abs(activeTimer.endTime - state.timerEndTime) > 2000) {
                    startTimer(state.timerType, state.timerDuration, state.timerEndTime);
                }
            } else {
                cancelTimerLocal();
            }
        } else {
            cancelTimerLocal();
        }
    }
}

// Botones del panel
if (btnSyncConnect) {
    btnSyncConnect.addEventListener('click', () => {
        const room = syncRoomInput.value.trim();
        if (!room) { alert('Introduce un código de sala válido.'); return; }
        connectMQTT(room);
    });
}

if (btnSyncDisconnect) {
    btnSyncDisconnect.addEventListener('click', () => {
        if (mqttClient) { mqttClient.end(true); mqttClient = null; }
        updateConnectionStatus('disconnected');
    });
}

if (btnSyncCopyLink) {
    btnSyncCopyLink.addEventListener('click', () => {
        const room     = syncRoomInput.value.trim();
        const shareUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(room)}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            const orig = btnSyncCopyLink.innerHTML;
            btnSyncCopyLink.innerHTML = '✓ ¡COPIADO!';
            setTimeout(() => { btnSyncCopyLink.innerHTML = orig; }, 2000);
        }).catch(() => alert(`Copia este enlace: ${shareUrl}`));
    });
}

// ================================================================
// LÓGICA DE TIEMPO MUERTO Y PAUSA TÉCNICA (CON SONIDO Y SYNC)
// ================================================================
let activeTimer = null; // { type: 'timeout'|'tech', duration: seconds, endTime: timestamp, intervalId: number }

function startTimer(type, duration, remoteEndTime = null) {
    // 1. Cancelar cualquier temporizador activo primero
    cancelTimerLocal();
    
    // 2. Reproducir sonido de transición
    playTransitionSound(type);
    
    // 3. Establecer hora de finalización
    const endTime = remoteEndTime || (Date.now() + duration * 1000);
    
    activeTimer = {
        type: type,
        duration: duration,
        endTime: endTime,
        intervalId: null
    };
    
    // 4. Mostrar interfaz del temporizador
    showTimerUI(type);
    
    // Mostrar tiempo inicial
    const initialRemaining = Math.max(0, Math.round((activeTimer.endTime - Date.now()) / 1000));
    updateTimerDisplay(initialRemaining);
    
    // 5. Iniciar intervalo de cuenta regresiva
    activeTimer.intervalId = setInterval(() => {
        const remaining = Math.max(0, Math.round((activeTimer.endTime - Date.now()) / 1000));
        updateTimerDisplay(remaining);
        
        if (remaining <= 0) {
            playTransitionSound('end');
            cancelTimerLocal();
            // Si somos admin, transmitir el estado finalizado
            if (!window.isPantalla) {
                broadcastState();
            }
        }
    }, 200);
    
    // Si somos administrador y NO es un inicio remoto, emitimos el cambio
    if (!window.isPantalla && !remoteEndTime) {
        broadcastState();
    }
}

function cancelTimerLocal() {
    if (activeTimer) {
        if (activeTimer.intervalId) {
            clearInterval(activeTimer.intervalId);
        }
        activeTimer = null;
    }
    hideTimerUI();
}

function cancelTimer() {
    cancelTimerLocal();
    if (!window.isPantalla) {
        broadcastState();
    }
}

function showTimerUI(type) {
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        mainContainer.classList.add('timer-active');
    }
    
    const overlay = document.getElementById('timer-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.className = 'timer-overlay'; // Restablecer clases
        
        const titleEl = document.getElementById('timer-title');
        const emoticonEl = document.getElementById('timer-emoticon');
        
        if (type === 'timeout') {
            if (titleEl) titleEl.innerText = "TIEMPO MUERTO";
            if (emoticonEl) emoticonEl.innerText = "🙊";
        } else if (type === 'tech') {
            overlay.classList.add('tech-pause');
            if (titleEl) titleEl.innerText = "PAUSA TÉCNICA";
            if (emoticonEl) emoticonEl.innerText = "🦍🚨";
        }
    }
    
    // Cerrar panel flotante si está abierto
    const timerPanel = document.getElementById('timerPanel');
    if (timerPanel) {
        timerPanel.classList.remove('active');
    }
}

function hideTimerUI() {
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        mainContainer.classList.remove('timer-active');
    }
    
    const overlay = document.getElementById('timer-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function updateTimerDisplay(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    const countdownEl = document.getElementById('timer-countdown');
    if (countdownEl) {
        countdownEl.innerText = timeStr;
    }
}

// SINTETIZADOR DE EFECTOS DE SONIDO (WEB AUDIO API)
function playTransitionSound(type) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        if (type === 'timeout') {
            // Sonido de inicio amigable tipo videojuego
            const now = ctx.currentTime;
            
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, now); // C5
            osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
            gain1.gain.setValueAtTime(0.15, now);
            gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.3);

            setTimeout(() => {
                const now2 = ctx.currentTime;
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(659.25, now2); // E5
                osc2.frequency.exponentialRampToValueAtTime(1046.5, now2 + 0.2); // C6
                gain2.gain.setValueAtTime(0.12, now2);
                gain2.gain.exponentialRampToValueAtTime(0.01, now2 + 0.4);
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start(now2);
                osc2.stop(now2 + 0.4);
            }, 100);
        } else if (type === 'tech') {
            // Sonido de alerta/sirena más grave y llamativo
            const now = ctx.currentTime;
            
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc1.type = 'sawtooth';
            osc2.type = 'square';
            
            osc1.frequency.setValueAtTime(330, now); // E4
            osc1.frequency.linearRampToValueAtTime(440, now + 0.25);
            osc1.frequency.linearRampToValueAtTime(330, now + 0.5);
            osc1.frequency.linearRampToValueAtTime(440, now + 0.75);
            
            osc2.frequency.setValueAtTime(333, now); // Detune
            osc2.frequency.linearRampToValueAtTime(443, now + 0.25);
            osc2.frequency.linearRampToValueAtTime(333, now + 0.5);
            osc2.frequency.linearRampToValueAtTime(443, now + 0.75);
            
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.1, now + 0.6);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            
            osc1.start(now);
            osc2.start(now);
            
            osc1.stop(now + 0.85);
            osc2.stop(now + 0.85);
        } else if (type === 'end') {
            // Pitido final clásico
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.setValueAtTime(440, now + 0.15);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.55);
        }
    } catch (e) {
        console.warn("No se pudo reproducir el sonido: ", e);
    }
}

// DESBLOQUEAR AUDIO EN NAVEGADORES
let audioContextUnlocked = false;
function unlockAudio() {
    if (audioContextUnlocked) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            if (ctx.state === 'suspended') {
                const unlock = () => {
                    ctx.resume().then(() => {
                        audioContextUnlocked = true;
                        document.removeEventListener('click', unlock);
                        document.removeEventListener('keydown', unlock);
                        console.log("AudioContext desbloqueado correctamente");
                    });
                };
                document.addEventListener('click', unlock);
                document.addEventListener('keydown', unlock);
            } else {
                audioContextUnlocked = true;
            }
        }
    } catch (e) {
        console.warn("Error al intentar desbloquear AudioContext: ", e);
    }
}
window.addEventListener('load', unlockAudio);
