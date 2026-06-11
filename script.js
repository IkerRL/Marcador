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
}

// Actualizar el equipo en el marcador
function selectTeam(nombre, logo) {
    document.getElementById(`name-${sideSelecting}`).innerText = nombre;
    document.getElementById(`img-${sideSelecting}`).src = logo;
    closeSelector();
    broadcastState();
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
    let currentScore = parseInt(scoreEl.innerText);
    
    // Sumamos 1 punto al equipo clickeado
    currentScore++;

    // REGLA DE ORO: Si alguien llega a 13, la partida termina y todo vuelve a 0
    if (currentScore >= 14) {
        console.log("Partida finalizada por 13 rondas.");
        resetScores();
    } else {
        scoreEl.innerText = currentScore;
        triggerScorePop(side);
    }
    broadcastState();
}

// Poner ambos marcadores a 0
function resetScores() {
    document.getElementById('score-left').innerText = "0";
    document.getElementById('score-right').innerText = "0";
    triggerScorePop('left');
    triggerScorePop('right');
    broadcastState();
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
document.addEventListener('click', (e) => {
    const isMonkeyClick = monkeyRight && monkeyRight.contains(e.target);
    const isToggleClick = syncToggleBtn && syncToggleBtn.contains(e.target);
    if (!isMonkeyClick && !isToggleClick && syncPanel && !syncPanel.contains(e.target)) {
        syncPanel.classList.remove('active');
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
        nameRight: document.getElementById('name-right').innerText,
        imgRight: document.getElementById('img-right').getAttribute('src'),
        scoreRight: document.getElementById('score-right').innerText
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
    
    if (state.nameRight !== undefined) document.getElementById('name-right').innerText = state.nameRight;
    if (state.imgRight !== undefined) document.getElementById('img-right').src = state.imgRight;
    
    if (state.scoreRight !== undefined) {
        const rightEl = document.getElementById('score-right');
        if (rightEl.innerText !== state.scoreRight) {
            rightEl.innerText = state.scoreRight;
            triggerScorePop('right');
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
