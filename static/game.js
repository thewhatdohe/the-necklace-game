// ═══════════════════════════════════════════════
//  THE NECKLACE — PARKOUR QUIZ GAME
// ═══════════════════════════════════════════════

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// ── CONSTANTS ──────────────────────────────────
const GRAVITY = 0.55;
const JUMP_FORCE = -13.5;
const MOVE_SPEED = 4.2;
const ENERGY_MAX = 500;
const ENERGY_MOVE_COST = 0.18;   // per frame while moving
const ENERGY_JUMP_COST = 12;
const ENERGY_CORRECT = 150;
const PLATFORM_W = 160;
const PLATFORM_H = 18;
const PLAYER_W = 28;
const PLAYER_H = 42;

// ── STATE ──────────────────────────────────────
let state = 'idle'; // idle | playing | question | dead | win
let questions = [];
let questionIndex = 0;
let answeredCount = 0;
let correctCount = 0;
let energy = ENERGY_MAX;
let maxHeightReached = 0;
let cameraY = 0;

const keys = {};
let gameLoop = null;

// ── PLAYER ─────────────────────────────────────
const player = {
    x: 0, y: 0,
    vx: 0, vy: 0,
    onGround: false,
    facing: 1, // 1=right, -1=left
    animFrame: 0,
    animTimer: 0,
    jumpPressed: false,
};

// ── PLATFORMS ──────────────────────────────────
let platforms = [];
let questionPlatforms = []; // indices of platforms with questions
let answeredPlatforms = new Set();

// ── PARTICLES ──────────────────────────────────
let particles = [];

// ── STARS ──────────────────────────────────────
let stars = [];

// ── INIT ───────────────────────────────────────
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Generate stars once
function generateStars() {
    stars = [];
    for (let i = 0; i < 180; i++) {
        stars.push({
            x: Math.random(),
            y: Math.random() * 8000,
            r: Math.random() * 1.5 + 0.3,
            a: Math.random() * 0.8 + 0.2,
            twinkle: Math.random() * Math.PI * 2,
        });
    }
}

function generatePlatforms() {
    platforms = [];
    // Ground platform
    platforms.push({
        x: canvas.width / 2 - 200,
        y: canvas.height - 80,
        w: 400,
        h: PLATFORM_H,
        type: 'ground',
        qIndex: -1,
    });

    // Generate ascending platforms
    const totalPlatforms = 55;
    let lastY = canvas.height - 80;
    let lastX = canvas.width / 2 - 200;

    // Place question platforms evenly — every ~5 regular platforms
    const qEvery = Math.floor(totalPlatforms / 10);

    for (let i = 0; i < totalPlatforms; i++) {
        const isQPlat = (i % qEvery === qEvery - 1) && questionPlatforms.length < 10;
        const w = isQPlat ? 190 : PLATFORM_W + Math.random() * 60 - 30;
        // Move up by 80-140px each platform
        const yStep = 90 + Math.random() * 60;
        const py = lastY - yStep;
        // Shift x within reachable range
        const maxShift = 220;
        const px = Math.max(40, Math.min(canvas.width - w - 40,
            lastX + (Math.random() * maxShift * 2 - maxShift)));

        const plat = {
            x: px,
            y: py,
            w: w,
            h: PLATFORM_H,
            type: isQPlat ? 'question' : 'normal',
            qIndex: isQPlat ? questionPlatforms.length : -1,
            triggered: false,
        };

        if (isQPlat) questionPlatforms.push(platforms.length);
        platforms.push(plat);
        lastY = py;
        lastX = px;
    }
}

async function fetchQuestions() {
    try {
        const res = await fetch('/api/questions');
        questions = await res.json();
    } catch (e) {
        console.error('Failed to load questions', e);
    }
}

// ── ENTRY ──────────────────────────────────────
async function startGame() {
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    await fetchQuestions();
    resetGame();
}

function resetGame() {
    questionIndex = 0;
    answeredCount = 0;
    correctCount = 0;
    energy = ENERGY_MAX;
    maxHeightReached = 0;
    cameraY = 0;
    answeredPlatforms = new Set();
    particles = [];

    generateStars();
    generatePlatforms();

    // Spawn player on ground platform
    const ground = platforms[0];
    player.x = ground.x + ground.w / 2 - PLAYER_W / 2;
    player.y = ground.y - PLAYER_H;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.facing = 1;

    state = 'playing';
    updateHUD();

    if (gameLoop) cancelAnimationFrame(gameLoop);
    loop();
}

function restartGame() {
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('end-screen').classList.remove('win-bg');
    document.getElementById('game-screen').classList.remove('hidden');
    resetGame();
}

// ── INPUT ──────────────────────────────────────
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if ((e.code === 'Space' || e.code === 'ArrowUp') && !keys._jumpLatch) {
        keys._jumpLatch = true;
        tryJump();
    }
});
window.addEventListener('keyup', e => {
    keys[e.code] = false;
    if (e.code === 'Space' || e.code === 'ArrowUp') keys._jumpLatch = false;
});

function tryJump() {
    if (state !== 'playing') return;
    if (player.onGround) {
        if (energy < ENERGY_JUMP_COST) { showToast('⚡ Not enough energy!'); return; }
        player.vy = JUMP_FORCE;
        player.onGround = false;
        energy -= ENERGY_JUMP_COST;
        spawnParticles(player.x + PLAYER_W / 2, player.y + PLAYER_H, '#c9a84c', 6);
        updateHUD();
    }
}

// ── PHYSICS ────────────────────────────────────
function updatePlayer() {
    if (state !== 'playing') return;

    // Horizontal movement
    let moving = false;
    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.vx = -MOVE_SPEED;
        player.facing = -1;
        moving = true;
    } else if (keys['ArrowRight'] || keys['KeyD']) {
        player.vx = MOVE_SPEED;
        player.facing = 1;
        moving = true;
    } else {
        player.vx *= 0.78;
    }

    if (moving && player.onGround) {
        energy -= ENERGY_MOVE_COST;
        if (energy < 0) energy = 0;
    }
    // Small cost in air too
    if (moving && !player.onGround) energy -= ENERGY_MOVE_COST * 0.4;

    // Gravity
    player.vy += GRAVITY;
    player.x += player.vx;
    player.y += player.vy;

    // Animate
    if (moving || !player.onGround) {
        player.animTimer++;
        if (player.animTimer > 8) { player.animTimer = 0; player.animFrame = (player.animFrame + 1) % 4; }
    } else {
        player.animFrame = 0;
    }

    // Wrap horizontally
    if (player.x + PLAYER_W < 0) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -PLAYER_W;

    // Platform collision
    player.onGround = false;
    for (let p of platforms) {
        const screenY = p.y - cameraY;
        // Only check visible-ish platforms
        if (screenY < -100 || screenY > canvas.height + 100) continue;

        if (
            player.x + PLAYER_W > p.x + 4 &&
            player.x < p.x + p.w - 4 &&
            player.y + PLAYER_H > p.y &&
            player.y + PLAYER_H < p.y + p.h + player.vy + 2 &&
            player.vy >= 0
        ) {
            player.y = p.y - PLAYER_H;
            player.vy = 0;
            player.onGround = true;

            // Trigger question platform
            if (p.type === 'question' && !p.triggered && !answeredPlatforms.has(p.qIndex)) {
                p.triggered = true;
                triggerQuestion(p.qIndex);
            }
        }
    }

    // Camera follow — smooth
    const targetCameraY = player.y - canvas.height * 0.55;
    cameraY += (targetCameraY - cameraY) * 0.06;

    // Height tracking (world units: pixels / 10)
    const worldHeight = Math.max(0, (canvas.height - 80 - player.y) / 10);
    if (worldHeight > maxHeightReached) maxHeightReached = worldHeight;

    // Energy death
    if (energy <= 0) {
        energy = 0;
        triggerDeath();
        return;
    }

    // Fall death
    if (player.y - cameraY > canvas.height + 200) {
        energy = 0;
        triggerDeath();
        return;
    }

    // Win condition — reached top platform
    const topPlat = platforms[platforms.length - 1];
    if (player.y < topPlat.y + 50 && player.onGround) {
        triggerWin();
        return;
    }

    updateHUD();
}

// ── QUESTION SYSTEM ────────────────────────────
function triggerQuestion(qIdx) {
    if (qIdx >= questions.length) return;
    state = 'question';

    const q = questions[qIdx];
    document.getElementById('q-number').textContent = `QUESTION ${qIdx + 1} OF ${questions.length}`;
    document.getElementById('q-text').textContent = q.question;
    document.getElementById('q-feedback').textContent = '';
    document.getElementById('q-energy-gain').textContent = '';
    document.getElementById('q-energy-gain').className = 'q-energy-gain';

    const grid = document.getElementById('options-grid');
    grid.innerHTML = '';
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'opt-btn';
        btn.textContent = opt;
        btn.onclick = () => selectAnswer(i, q, btn);
        grid.appendChild(btn);
    });

    const cont = document.getElementById('btn-continue');
    cont.classList.remove('visible');

    document.getElementById('question-modal').classList.remove('hidden');
    currentQuestionIdx = qIdx;
}

let currentQuestionIdx = 0;

function selectAnswer(chosen, q, clickedBtn) {
    // Disable all buttons
    document.querySelectorAll('.opt-btn').forEach(b => b.disabled = true);

    const correct = chosen === q.correct;
    clickedBtn.classList.add(correct ? 'correct' : 'wrong');

    if (!correct) {
        document.querySelectorAll('.opt-btn')[q.correct].classList.add('correct');
    }

    answeredCount++;
    if (correct) {
        correctCount++;
        energy = Math.min(ENERGY_MAX, energy + ENERGY_CORRECT);
        document.getElementById('q-energy-gain').textContent = `+${ENERGY_CORRECT} ⚡ Energy gained!`;
        document.getElementById('q-energy-gain').className = 'q-energy-gain positive';
        spawnParticles(canvas.width / 2, canvas.height / 2, '#c9a84c', 20);
    } else {
        document.getElementById('q-energy-gain').textContent = `No energy gained.`;
        document.getElementById('q-energy-gain').className = 'q-energy-gain negative';
    }

    document.getElementById('q-feedback').textContent = q.explanation;
    document.getElementById('btn-continue').classList.add('visible');
    updateHUD();
}

function closeQuestion() {
    answeredPlatforms.add(currentQuestionIdx);
    document.getElementById('question-modal').classList.add('hidden');
    state = 'playing';

    if (answeredCount >= questions.length) {
        triggerWin();
    }
}

// ── END STATES ─────────────────────────────────
function triggerDeath() {
    if (state === 'dead' || state === 'win') return;
    state = 'dead';
    cancelAnimationFrame(gameLoop);

    document.getElementById('end-icon').textContent = '💀';
    document.getElementById('end-title').textContent = 'OUT OF ENERGY';
    document.getElementById('end-sub').textContent = "Mathilde's ambition burned bright but brief...";
    document.getElementById('end-screen').classList.remove('win-bg');

    showEndStats();
}

function triggerWin() {
    if (state === 'win') return;
    state = 'win';
    cancelAnimationFrame(gameLoop);

    document.getElementById('end-icon').textContent = '💎';
    document.getElementById('end-title').textContent = 'ASCENT COMPLETE';
    document.getElementById('end-sub').textContent = 'You have reached the summit of understanding.';
    document.getElementById('end-screen').classList.add('win-bg');

    showEndStats();
}

function showEndStats() {
    document.getElementById('stat-height').textContent = Math.round(maxHeightReached) + 'm';
    document.getElementById('stat-correct').textContent = correctCount + '/' + questions.length;
    document.getElementById('stat-questions').textContent = answeredCount;
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('end-screen').classList.remove('hidden');
}

// ── HUD ────────────────────────────────────────
function updateHUD() {
    const pct = Math.max(0, Math.min(100, (energy / ENERGY_MAX) * 100));
    document.getElementById('energy-bar').style.width = pct + '%';

    const col = pct > 50 ? '#c9a84c' : pct > 25 ? '#e67e22' : '#e74c3c';
    document.getElementById('energy-bar').style.background =
        `linear-gradient(90deg, ${col}88, ${col})`;

    document.getElementById('energy-text').textContent =
        Math.round(energy) + ' / ' + ENERGY_MAX;
    document.getElementById('q-count').textContent =
        `Questions: ${answeredCount}/${questions.length}`;
    document.getElementById('height-display').textContent =
        `Height: ${Math.round(maxHeightReached)}m`;
}

// ── PARTICLES ──────────────────────────────────
function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        particles.push({
            x, y: y - cameraY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 1,
            decay: Math.random() * 0.03 + 0.02,
            r: Math.random() * 3 + 2,
            color,
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= p.decay;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ── TOAST ──────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

// ── RENDER ─────────────────────────────────────
function drawBackground() {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#070510');
    grad.addColorStop(0.4, '#110c22');
    grad.addColorStop(1, '#1e1040');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars
    const t = Date.now() / 1000;
    for (const s of stars) {
        const screenY = s.y - cameraY * 0.15; // parallax
        if (screenY < -5 || screenY > canvas.height + 5) continue;
        const alpha = s.a * (0.7 + 0.3 * Math.sin(t * 0.8 + s.twinkle));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#e8dfc8';
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, screenY, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawPlatforms() {
    for (let i = 0; i < platforms.length; i++) {
        const p = platforms[i];
        const sy = p.y - cameraY;
        if (sy < -40 || sy > canvas.height + 40) continue;

        const isQ = p.type === 'question';
        const answered = answeredPlatforms.has(p.qIndex);

        if (isQ && !answered) {
            // Glowing question platform
            const glow = ctx.createLinearGradient(p.x, sy, p.x + p.w, sy);
            glow.addColorStop(0, '#3d2a00');
            glow.addColorStop(0.5, '#7a5800');
            glow.addColorStop(1, '#3d2a00');
            ctx.fillStyle = glow;
            ctx.fillRect(p.x, sy, p.w, p.h);

            // Gold top edge
            ctx.fillStyle = '#c9a84c';
            ctx.fillRect(p.x, sy, p.w, 3);

            // Animated shimmer
            const shimX = ((Date.now() / 15) % (p.w + 60)) - 30;
            const shimGrad = ctx.createLinearGradient(p.x + shimX - 20, sy, p.x + shimX + 20, sy);
            shimGrad.addColorStop(0, 'rgba(255,220,100,0)');
            shimGrad.addColorStop(0.5, 'rgba(255,220,100,0.3)');
            shimGrad.addColorStop(1, 'rgba(255,220,100,0)');
            ctx.fillStyle = shimGrad;
            ctx.fillRect(p.x, sy, p.w, p.h);

            // ? Label
            ctx.save();
            ctx.font = 'bold 13px Cinzel, serif';
            ctx.fillStyle = '#ffd700';
            ctx.globalAlpha = 0.9 + 0.1 * Math.sin(Date.now() / 300);
            ctx.textAlign = 'center';
            ctx.fillText('❓ STEP ON ME', p.x + p.w / 2, sy - 8);
            ctx.restore();
        } else if (isQ && answered) {
            // Answered — green tint
            ctx.fillStyle = '#0a2e18';
            ctx.fillRect(p.x, sy, p.w, p.h);
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(p.x, sy, p.w, 3);
        } else if (p.type === 'ground') {
            // Ornate ground
            const gr = ctx.createLinearGradient(p.x, sy, p.x, sy + p.h);
            gr.addColorStop(0, '#3d2a60');
            gr.addColorStop(1, '#1a1030');
            ctx.fillStyle = gr;
            ctx.fillRect(p.x, sy, p.w, p.h);
            ctx.fillStyle = '#7b5fcf';
            ctx.fillRect(p.x, sy, p.w, 2);
        } else {
            // Normal platform — stone
            const gr2 = ctx.createLinearGradient(p.x, sy, p.x, sy + p.h);
            gr2.addColorStop(0, '#2a2040');
            gr2.addColorStop(1, '#160e28');
            ctx.fillStyle = gr2;
            ctx.fillRect(p.x, sy, p.w, p.h);
            ctx.fillStyle = 'rgba(120,100,180,0.5)';
            ctx.fillRect(p.x, sy, p.w, 2);
        }
    }
}

function drawPlayer() {
    const px = player.x;
    const py = player.y - cameraY;
    const w = PLAYER_W;
    const h = PLAYER_H;
    const f = player.facing;

    ctx.save();
    ctx.translate(px + w / 2, py + h / 2);
    if (f === -1) ctx.scale(-1, 1);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.ellipse(0, h / 2 + 4, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Leg animation
    const legSwing = player.onGround ? Math.sin(player.animFrame * 1.5) * 6 : 0;

    // Legs
    ctx.fillStyle = '#2c1a5a';
    ctx.fillRect(-8, h * 0.25, 7, h * 0.45 + legSwing);
    ctx.fillRect(1, h * 0.25, 7, h * 0.45 - legSwing);

    // Shoes
    ctx.fillStyle = '#c9a84c';
    ctx.fillRect(-10, h * 0.25 + h * 0.45 + legSwing, 10, 5);
    ctx.fillRect(-1, h * 0.25 + h * 0.45 - legSwing, 10, 5);

    // Dress / body
    const bodyGrad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    bodyGrad.addColorStop(0, '#4a2875');
    bodyGrad.addColorStop(1, '#2c1a5a');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 2, -h / 2 + 8, w - 4, h * 0.65, 4);
    ctx.fill();

    // Gold trim
    ctx.fillStyle = '#c9a84c';
    ctx.fillRect(-w / 2 + 2, -h / 2 + 8, w - 4, 3);
    ctx.fillRect(-w / 2 + 2, -h / 2 + 8 + h * 0.3, w - 4, 2);

    // Necklace sparkle
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(0, -h / 2 + 16, 3, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#f5d5b0';
    ctx.beginPath();
    ctx.arc(0, -h / 2 - 1, 9, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#3d1a00';
    ctx.beginPath();
    ctx.arc(0, -h / 2 - 4, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-9, -h / 2 - 4, 4, 8);

    // Eyes
    ctx.fillStyle = '#222';
    ctx.fillRect(3, -h / 2 + 1, 3, 3);

    // Energy indicator above head (low energy = red glow)
    if (energy < 100) {
        ctx.save();
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
        ctx.globalAlpha = 0.4 * pulse;
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(0, -h / 2 - 16, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.restore();
}

// ── MAIN LOOP ──────────────────────────────────
let lastTime = 0;
function loop(ts = 0) {
    gameLoop = requestAnimationFrame(loop);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();
    drawPlatforms();
    drawPlayer();
    updateParticles();
    drawParticles();

    if (state === 'playing') {
        updatePlayer();
    }
}

// Expose for HTML buttons
window.startGame = startGame;
window.restartGame = restartGame;
window.closeQuestion = closeQuestion;