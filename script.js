// ==========================================================================
// 1. LISTA OFICIAL DE LOS 14 EQUIPOS
// ==========================================================================
const GRUPOS = {
    A: [
        { nombre: "RHK", jugadores: ["Satha", "Makflat"], logo: "logo1.png" },
        { nombre: "AK2", jugadores: ["Kira", "Serax"], logo: "logo2.png" },
        { nombre: "ENB", jugadores: ["レックウザ ", "Militantedelsoe"], logo: "logo5.png" }
    ],
    B: [
        { nombre: "KZN", jugadores: ["Alezita", "Sarix"], logo: "logo4.png" },
        { nombre: "DTM", jugadores: ["JoKker", "Pepardo"], logo: "logo7.png" },
        { nombre: "SKR", jugadores: ["Gustavo", "Carlos"], logo: "logo14.png" }
    ],
    C: [
        { nombre: "SR?", jugadores: ["KrypT", "IAngeil-"], logo: "logo11.png" },
        { nombre: "ThB", jugadores: ["Brrokeen", "Pipe"], logo: "logo3.png" },
        { nombre: "STP", jugadores: ["TheDori", "Sotomi"], logo: "logo9.png" }
    ],
    D: [
        { nombre: "CMC", jugadores: ["MakaQuillo", "Max"], logo: "logo6.png" },
        { nombre: "M&L", jugadores: ["Marru", "Lauliet"], logo: "logo13.png" },
        { nombre: "MRK", jugadores: ["Acid", "Bru"], logo: "logo10.png" }
    ]
};

const equipos = Object.values(GRUPOS).flat();

// ==========================================================================
// 2. CONFIGURACIÓN Y ESTADO DE LA APLICACIÓN
// ==========================================================================
let sideSelecting = 'left';
let gameFormat = 'BO3'; // BO1, BO3, BO5
let activeTheme = 'valorant'; // valorant, cyberpunk, retrowave
let isAudioMuted = false;
let mapsLeft = 0;
let mapsRight = 0;
let activeTimer = null; // { type, duration, endTime, intervalId }
let audioContextUnlocked = false;

// MQTT Sync Variables
let mqttClient = null;
let mqttTopic = '';
let isApplyingSyncState = false;
const MSG_HISTORIAL = new Set();

// ==========================================================================
// 3. INICIALIZACIÓN DE LA INTERFAZ AL CARGAR LA PÁGINA
// ==========================================================================
window.addEventListener('load', () => {
    // Generar la lista de equipos en la consola administrativa
    generateAdminTeamsList();

    // Configurar controladores de eventos para clics y atajos
    setupInteractiveEvents();

    // Cargar estado de almacenamiento local para persistencia
    loadLocalStorageState();

    // Desbloquear audio
    unlockAudio();

    // Auto-conectar MQTT si hay parámetros de sala
    initializeMQTTSync();

    // Iniciar temporizador de shine sweep
    startShineSweepInterval();
});

// Genera el grid de selección en el Tab Equipos de la Consola
function generateAdminTeamsList() {
    const grid = document.getElementById('admin-team-grid');
    if (!grid) return;
    grid.innerHTML = '';

    equipos.forEach(eq => {
        const div = document.createElement('div');
        div.className = 'admin-team-option';
        div.innerHTML = `<img src="${eq.logo}" onerror="this.src='placeholder-team.png'"><span>${eq.nombre}</span>`;
        div.onclick = () => selectTeam(eq.nombre, eq.logo);
        grid.appendChild(div);
    });
}

// Configura eventos interactivos de botones de monos, clicks fuera de paneles y teclas
function setupInteractiveEvents() {
    // Toggles de la consola con los monos (compatibilidad)
    const monkeyLeft = document.getElementById('monkeyLeft');
    if (monkeyLeft) {
        monkeyLeft.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.isPantalla) return;
            toggleAdminConsole(true);
            switchAdminTab('tab-tiempos');
        });
    }

    const monkeyRight = document.getElementById('monkeyRight');
    if (monkeyRight) {
        monkeyRight.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.isPantalla) return;
            toggleAdminConsole(true);
            switchAdminTab('tab-sync');
        });
    }

    // Cerrar consola si se hace clic fuera de ella
    document.addEventListener('click', (e) => {
        const consoleEl = document.getElementById('admin-console');
        const triggerEl = document.querySelector('.admin-trigger-btn');
        const monkeyLeftEl = document.getElementById('monkeyLeft');
        const monkeyRightEl = document.getElementById('monkeyRight');

        if (consoleEl && consoleEl.classList.contains('active')) {
            const isClickInside = consoleEl.contains(e.target) ||
                (triggerEl && triggerEl.contains(e.target)) ||
                (monkeyLeftEl && monkeyLeftEl.contains(e.target)) ||
                (monkeyRightEl && monkeyRightEl.contains(e.target));

            if (!isClickInside) {
                toggleAdminConsole(false);
            }
        }
    });

    // Control por teclado
    window.addEventListener('keydown', (e) => {
        if (window.isPantalla) return;

        // R para resetear todo a cero
        if (e.key === 'r' || e.key === 'R') {
            const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA';
            if (!isInput) {
                resetScores();
            }
        }
        // Escape para cerrar la consola
        if (e.key === 'Escape') {
            toggleAdminConsole(false);
        }
    });

    // Eventos de clic derecho en las cajas de rondas del marcador principal
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

    // Eventos de clic derecho en los contenedores de mapas
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
}

// Carga las variables persistentes del LocalStorage
function loadLocalStorageState() {
    const savedTitle = localStorage.getItem('tournamentTitle');
    const savedSubtitle = localStorage.getItem('tournamentSubtitle');
    const savedFormat = localStorage.getItem('gameFormat');
    const savedTheme = localStorage.getItem('activeTheme');
    const savedMute = localStorage.getItem('isAudioMuted');

    if (savedTitle) updateTournamentTitleLocal(savedTitle);
    if (savedSubtitle) updateTournamentSubtitleLocal(savedSubtitle);
    if (savedFormat) setGameFormatLocal(savedFormat);
    if (savedTheme) changeThemePresetLocal(savedTheme);
    if (savedMute === 'true') {
        isAudioMuted = true;
        const btn = document.getElementById('btn-toggle-mute');
        if (btn) btn.innerText = '🔇 Sonido: Silenciado';
    }

    updateAdminConsoleUI();
}

// Inicia el barrido diagonal brillante cada 10 segundos
function startShineSweepInterval() {
    setInterval(() => {
        const leftWrap = document.getElementById('wrapper-left');
        const rightWrap = document.getElementById('wrapper-right');

        if (leftWrap) {
            leftWrap.classList.add('shine-active');
            setTimeout(() => leftWrap.classList.remove('shine-active'), 2000);
        }

        setTimeout(() => {
            if (rightWrap) {
                rightWrap.classList.add('shine-active');
                setTimeout(() => rightWrap.classList.remove('shine-active'), 2000);
            }
        }, 400);
    }, 10000);
}

// ==========================================================================
// 4. LÓGICA DE NAVEGACIÓN Y PESTAÑAS DE LA CONSOLA ADMIN
// ==========================================================================
function toggleAdminConsole(forceState) {
    if (window.isPantalla) return;
    const consoleEl = document.getElementById('admin-console');
    if (!consoleEl) return;

    if (forceState !== undefined) {
        if (forceState) {
            consoleEl.classList.add('active');
            updateAdminConsoleUI();
        } else {
            consoleEl.classList.remove('active');
        }
    } else {
        consoleEl.classList.toggle('active');
        if (consoleEl.classList.contains('active')) {
            updateAdminConsoleUI();
        }
    }
}

function switchAdminTab(tabId) {
    // Desactivar todas las pestañas
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(t => t.classList.remove('active'));

    // Desactivar todos los paneles
    const panels = document.querySelectorAll('.admin-panel-content');
    panels.forEach(p => p.classList.remove('active'));

    // Activar pestaña seleccionada
    const targetTabBtn = document.getElementById(`tab-btn-${tabId.replace('tab-', '')}`);
    if (targetTabBtn) targetTabBtn.classList.add('active');

    const targetPanel = document.getElementById(tabId);
    if (targetPanel) targetPanel.classList.add('active');
}

// Sincroniza los controles del panel admin con el estado actual
function updateAdminConsoleUI() {
    const nameLeft = document.getElementById('name-left').innerText;
    const nameRight = document.getElementById('name-right').innerText;
    const scoreLeft = document.getElementById('score-left').innerText;
    const scoreRight = document.getElementById('score-right').innerText;

    // Nombres y Puntos en Rondas
    const adjNameLeft = document.getElementById('adj-name-left');
    const adjNameRight = document.getElementById('adj-name-right');
    const adjScoreLeft = document.getElementById('adj-score-left');
    const adjScoreRight = document.getElementById('adj-score-right');

    if (adjNameLeft) adjNameLeft.innerText = nameLeft;
    if (adjNameRight) adjNameRight.innerText = nameRight;
    if (adjScoreLeft) adjScoreLeft.innerText = scoreLeft;
    if (adjScoreRight) adjScoreRight.innerText = scoreRight;

    // Ajustar Inputs de información
    const titleInput = document.getElementById('input-tournament-title');
    const subtitleInput = document.getElementById('input-tournament-subtitle');
    const displayTitle = document.getElementById('display-title');
    const displaySubtitle = document.getElementById('display-subtitle');

    if (titleInput && displayTitle) titleInput.value = displayTitle.innerText;
    if (subtitleInput && displaySubtitle) subtitleInput.value = displaySubtitle.innerText;

    // Segmented format control (BO1/BO3/BO5)
    document.querySelectorAll('.segment-option').forEach(btn => btn.classList.remove('active'));
    const activeFmtBtn = document.getElementById(`fmt-${gameFormat.toLowerCase()}`);
    if (activeFmtBtn) activeFmtBtn.classList.add('active');

    // Selector de Tema
    const themeSelect = document.getElementById('select-theme');
    if (themeSelect) themeSelect.value = activeTheme;

    // Lado de selección de equipos
    document.querySelectorAll('.side-selector-btn').forEach(btn => btn.classList.remove('active'));
    const sideBtn = document.getElementById(`side-select-${sideSelecting}`);
    if (sideBtn) sideBtn.classList.add('active');
}

// ==========================================================================
// 5. SELECCIÓN DE EQUIPOS
// ==========================================================================
function openSelector(side) {
    if (window.isPantalla) return;
    setSideSelecting(side);
    toggleAdminConsole(true);
    switchAdminTab('tab-equipos');
}

function setSideSelecting(side) {
    sideSelecting = side;
    updateAdminConsoleUI();
}

function selectTeam(nombre, logo) {
    document.getElementById(`name-${sideSelecting}`).innerText = nombre;
    document.getElementById(`img-${sideSelecting}`).src = logo;

    updateAdminConsoleUI();
    broadcastState();
}

// Filtrar la lista de equipos en la consola
function filterAdminTeams(query) {
    const cleanQuery = query.toLowerCase().trim();
    const options = document.querySelectorAll('.admin-team-option');
    options.forEach(opt => {
        const teamName = opt.querySelector('span').innerText.toLowerCase();
        if (teamName.includes(cleanQuery)) {
            opt.style.display = 'block';
        } else {
            opt.style.display = 'none';
        }
    });
}

// Compatibilidad
function filterTeams(query) { filterAdminTeams(query); }
function closeSelector() { toggleAdminConsole(false); }

// ==========================================================================
// 6. GESTIÓN DE MAPAS (BO1 / BO3 / BO5)
// ==========================================================================
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

function setGameFormat(format) {
    setGameFormatLocal(format);
    localStorage.setItem('gameFormat', format);
    broadcastState();
}

function setGameFormatLocal(format) {
    gameFormat = format;
    const scoreboard = document.getElementById('main-scoreboard');
    if (scoreboard) {
        scoreboard.classList.remove('format-bo1', 'format-bo3', 'format-bo5');
        scoreboard.classList.add(`format-${format.toLowerCase()}`);
    }
    updateAdminConsoleUI();
}

// ==========================================================================
// 7. LÓGICA DE PUNTUACIÓN DE RONDAS & MATCH POINT
// ==========================================================================
function triggerScorePop(side) {
    const scoreEl = document.getElementById(`score-${side}`);
    if (scoreEl) {
        scoreEl.classList.remove('pop-anim');
        void scoreEl.offsetWidth; // Forzar reflujo de renderizado
        scoreEl.classList.add('pop-anim');
    }
}

function changeScore(side) {
    if (window.isPantalla) return;
    const scoreEl = document.getElementById(`score-${side}`);
    let currentScore = parseInt(scoreEl.innerText) || 0;

    currentScore++;

    // Si llega a 14, la partida finaliza por completo y se reinicia
    if (currentScore >= 14) {
        console.log("Partida finalizada por 13 rondas.");
        resetScores();
    } else {
        scoreEl.innerText = currentScore;
        triggerScorePop(side);
        checkMatchPoint();
        updateAdminConsoleUI();
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
        updateAdminConsoleUI();
        broadcastState();
    }
}

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

function resetScores() {
    document.getElementById('score-left').innerText = "0";
    document.getElementById('score-right').innerText = "0";
    mapsLeft = 0;
    mapsRight = 0;

    updateMapsUI();
    checkMatchPoint();
    triggerScorePop('left');
    triggerScorePop('right');
    updateAdminConsoleUI();
    broadcastState();
}

// ==========================================================================
// 8. INTERCAMBIO DE LADOS (SWAP SIDES)
// ==========================================================================
function swapSides() {
    if (window.isPantalla) return;

    // Swap scores
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

    // Activar animaciones en ambos lados
    triggerScorePop('left');
    triggerScorePop('right');

    updateMapsUI();
    checkMatchPoint();
    updateAdminConsoleUI();
    broadcastState();
}

// ==========================================================================
// 9. CONFIGURACIÓN DEL TORNEO (TÍTULOS Y TEMAS)
// ==========================================================================
function updateTournamentTitle(title) {
    updateTournamentTitleLocal(title);
    localStorage.setItem('tournamentTitle', title);
    broadcastState();
}

function updateTournamentTitleLocal(title) {
    const el = document.getElementById('display-title');
    if (el) el.innerText = title;
}

function updateTournamentSubtitle(subtitle) {
    updateTournamentSubtitleLocal(subtitle);
    localStorage.setItem('tournamentSubtitle', subtitle);
    broadcastState();
}

function updateTournamentSubtitleLocal(subtitle) {
    const el = document.getElementById('display-subtitle');
    if (el) el.innerText = subtitle;
}

function changeThemePreset(theme) {
    changeThemePresetLocal(theme);
    localStorage.setItem('activeTheme', theme);
    broadcastState();
}

function changeThemePresetLocal(theme) {
    activeTheme = theme;
    document.body.setAttribute('data-theme', theme);
    updateAdminConsoleUI();
}

function toggleAudioMute() {
    isAudioMuted = !isAudioMuted;
    localStorage.setItem('isAudioMuted', isAudioMuted);

    const btn = document.getElementById('btn-toggle-mute');
    if (btn) {
        btn.innerText = isAudioMuted ? '🔇 Sonido: Silenciado' : '🔊 Sonido: Activado';
    }
}

// ==========================================================================
// 10. SINCRONIZACIÓN EN VIVO (MQTT VIA HIVEMQ)
// ==========================================================================
function initializeMQTTSync() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    const isObs = urlParams.get('pantalla') === 'true';
    const isAdmin = urlParams.get('admin') === 'true';

    if (roomParam) {
        window.roomName = roomParam;

        // Si tiene sala por URL pero no tiene &admin=true, por defecto actúa como Pantalla
        if (!isAdmin) {
            window.isPantalla = true;
            document.body.classList.add('pantalla-mode');

            // Si es el modo de pantalla limpia de OBS, añadimos obs-mode para desactivar interacciones
            if (isObs) {
                document.body.classList.add('obs-mode');
            }
        }

        const roomInput = document.getElementById('consoleSyncRoom');
        if (roomInput) roomInput.value = roomParam;

        setTimeout(() => connectMQTT(roomParam), 600);
    } else {
        // Generar código de sala aleatorio
        const roomInput = document.getElementById('consoleSyncRoom');
        if (roomInput) roomInput.value = generateRandomRoom();
    }
}

function generateRandomRoom() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'MARCADOR-';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function connectMQTTFromConsole() {
    const roomInput = document.getElementById('consoleSyncRoom');
    const room = roomInput ? roomInput.value.trim() : '';
    if (!room) { alert('Introduce un código de sala válido.'); return; }
    connectMQTT(room);
}

function disconnectMQTTFromConsole() {
    if (mqttClient) {
        mqttClient.end(true);
        mqttClient = null;
    }
    updateConnectionStatus('disconnected');
}

function copyLinkFromConsole() {
    const roomInput = document.getElementById('consoleSyncRoom');
    const room = roomInput ? roomInput.value.trim() : '';
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(room)}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
        const btn = document.getElementById('consoleBtnCopyLink');
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '✓ ¡COPIADO!';
            setTimeout(() => { btn.innerHTML = orig; }, 2000);
        }
    }).catch(() => alert(`Copia este enlace: ${shareUrl}`));
}

// Conectar al broker MQTT
function connectMQTT(roomName) {
    if (mqttClient) {
        mqttClient.end(true);
        mqttClient = null;
    }

    const brokerInput = document.getElementById('consoleBrokerInput');
    const topicInput = document.getElementById('consoleTopicInput');

    const broker = (brokerInput?.value.trim()) || 'wss://broker.hivemq.com:8884/mqtt';
    const topicBase = (topicInput?.value.trim()) || 'copa_primate_marcador';
    mqttTopic = `${topicBase}/${roomName.trim()}`;

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

            // Ignorar mensajes propios
            if (msg._id && MSG_HISTORIAL.has(msg._id)) return;

            console.log('Mensaje MQTT recibido:', msg.type);

            if (msg.type === 'REQUEST_STATE') {
                // Si no somos pantalla, responder con el estado actual
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

// Publicar mensaje en el canal MQTT
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

// Emite el estado actual completo
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
        timerDuration: activeTimer ? activeTimer.duration : null,
        // Nuevas variables
        gameFormat: gameFormat,
        activeTheme: activeTheme,
        tournamentTitle: document.getElementById('display-title').innerText,
        tournamentSubtitle: document.getElementById('display-subtitle').innerText
    };

    publishMQTT({ type: 'STATE_UPDATE', state });
}

// Aplica el estado recibido
function aplicarEstado(state) {
    if (!state) return;
    console.log('Aplicando estado recibido de red...');

    if (state.nameLeft !== undefined) document.getElementById('name-left').innerText = state.nameLeft;
    if (state.imgLeft !== undefined) document.getElementById('img-left').src = state.imgLeft;

    if (state.scoreLeft !== undefined) {
        const leftEl = document.getElementById('score-left');
        if (leftEl.innerText !== state.scoreLeft) {
            leftEl.innerText = state.scoreLeft;
            triggerScorePop('left');
        }
    }

    if (state.mapsLeft !== undefined) mapsLeft = state.mapsLeft;

    if (state.nameRight !== undefined) document.getElementById('name-right').innerText = state.nameRight;
    if (state.imgRight !== undefined) document.getElementById('img-right').src = state.imgRight;

    if (state.scoreRight !== undefined) {
        const rightEl = document.getElementById('score-right');
        if (rightEl.innerText !== state.scoreRight) {
            rightEl.innerText = state.scoreRight;
            triggerScorePop('right');
        }
    }

    if (state.mapsRight !== undefined) mapsRight = state.mapsRight;

    // Nuevas configuraciones
    if (state.gameFormat !== undefined) setGameFormatLocal(state.gameFormat);
    if (state.activeTheme !== undefined) changeThemePresetLocal(state.activeTheme);
    if (state.tournamentTitle !== undefined) updateTournamentTitleLocal(state.tournamentTitle);
    if (state.tournamentSubtitle !== undefined) updateTournamentSubtitleLocal(state.tournamentSubtitle);

    updateMapsUI();
    checkMatchPoint();
    updateAdminConsoleUI();

    // Sincronizar temporizadores
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

// Actualiza el indicador de conexión MQTT en la interfaz
function updateConnectionStatus(status) {
    const pulse = document.getElementById('consoleSyncPulse');
    const badge = document.getElementById('consoleSyncStatus');
    const disconnectedControls = document.getElementById('sync-disconnected-controls');
    const connectedControls = document.getElementById('sync-connected-controls');
    const roomInput = document.getElementById('consoleSyncRoom');

    if (!pulse || !badge) return;

    pulse.className = 'pulse-icon';
    badge.className = 'status-badge';

    if (status === 'disconnected') {
        pulse.classList.add('red');
        badge.classList.add('status-disconnected');
        badge.textContent = 'DESCONECTADO';

        if (disconnectedControls) disconnectedControls.style.display = 'block';
        if (connectedControls) connectedControls.style.display = 'none';
        if (roomInput) roomInput.disabled = false;
    } else if (status === 'connecting') {
        pulse.classList.add('yellow');
        badge.classList.add('status-connecting');
        badge.textContent = 'CONECTANDO...';

        if (disconnectedControls) disconnectedControls.style.display = 'none';
        if (connectedControls) connectedControls.style.display = 'none';
        if (roomInput) roomInput.disabled = true;
    } else if (status === 'connected') {
        pulse.classList.add('green');
        badge.classList.add('status-connected');
        badge.textContent = `SALA: ${roomInput ? roomInput.value : ''}`;

        if (disconnectedControls) disconnectedControls.style.display = 'none';
        if (connectedControls) connectedControls.style.display = 'flex';
        if (roomInput) roomInput.disabled = true;
    }
}

// ==========================================================================
// 11. TIMEOUT Y PAUSA TÉCNICA
// ==========================================================================
function startTimer(type, duration, remoteEndTime = null) {
    cancelTimerLocal();

    // Reproducir audio
    playTransitionSound(type);

    const endTime = remoteEndTime || (Date.now() + duration * 1000);

    activeTimer = {
        type: type,
        duration: duration,
        endTime: endTime,
        intervalId: null
    };

    showTimerUI(type);

    const initialRemaining = Math.max(0, Math.round((activeTimer.endTime - Date.now()) / 1000));
    updateTimerDisplay(initialRemaining);

    // Cuenta regresiva activa
    activeTimer.intervalId = setInterval(() => {
        const remaining = Math.max(0, Math.round((activeTimer.endTime - Date.now()) / 1000));
        updateTimerDisplay(remaining);

        if (remaining <= 0) {
            playTransitionSound('end');
            cancelTimerLocal();
            if (!window.isPantalla) {
                broadcastState();
            }
        }
    }, 200);

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
    const mainContainer = document.getElementById('main-scoreboard');
    if (mainContainer) mainContainer.classList.add('timer-active');

    const overlay = document.getElementById('timer-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.className = 'timer-overlay';

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

    // Ocultar consola para que el admin vea la pantalla limpia
    toggleAdminConsole(false);
}

function hideTimerUI() {
    const mainContainer = document.getElementById('main-scoreboard');
    if (mainContainer) mainContainer.classList.remove('timer-active');

    const overlay = document.getElementById('timer-overlay');
    if (overlay) overlay.style.display = 'none';
}

function updateTimerDisplay(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    const countdownEl = document.getElementById('timer-countdown');
    if (countdownEl) countdownEl.innerText = timeStr;
}

// ==========================================================================
// 12. SINTETIZADOR DE EFECTOS DE SONIDO (WEB AUDIO API)
// ==========================================================================
function playTransitionSound(type) {
    if (isAudioMuted) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        if (type === 'timeout') {
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
            const now = ctx.currentTime;
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sawtooth';
            osc2.type = 'square';

            osc1.frequency.setValueAtTime(330, now);
            osc1.frequency.linearRampToValueAtTime(440, now + 0.25);
            osc1.frequency.linearRampToValueAtTime(330, now + 0.5);
            osc1.frequency.linearRampToValueAtTime(440, now + 0.75);

            osc2.frequency.setValueAtTime(333, now);
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
