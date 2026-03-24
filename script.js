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
    { nombre: "MUGIWARAS", logo: "logo14.png" }
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
}

// --- LÓGICA DE PUNTUACIÓN ---

function changeScore(side) {
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
    }
}

// Poner ambos marcadores a 0
function resetScores() {
    document.getElementById('score-left').innerText = "0";
    document.getElementById('score-right').innerText = "0";
}

// CONTROL POR TECLADO
window.addEventListener('keydown', (e) => {
    // R para resetear todo a cero
    if (e.key === 'r' || e.key === 'R') {
        resetScores();
    }
    // Escape para cerrar el menú de equipos si se abre por error
    if (e.key === 'Escape') {
        closeSelector();
    }
});
