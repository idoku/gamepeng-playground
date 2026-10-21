// Ported from the public Astrocade Neon Snake Arena game script.
// Astrocade runtime APIs are replaced with local settings and offline storage.
window.gameConfig = {
    settings: {
        playerColor: '#39ff14',
        arenaWidth: 1500,
        arenaHeight: 1500,
        foodCount: 40,
        aiCount: 5,
        speedMultiplier: 1,
        startingLength: 8,
        growthRate: 1
    }
};

// Game Overview:
        // Neon Snake Arena is a competitive multiplayer-style snake game where players control
        // a glowing green snake in a vibrant neon arena. Navigate to collect food pellets and
        // grow longer while avoiding walls and other snakes. Compete against AI opponents for
        // the top position on the real-time leaderboard. Features smooth controls optimized for
        // both mobile touch and desktop mouse/keyboard, instant respawn, and endless gameplay.

        async function run(mode) {
            const gameWorld = document.getElementById('game-world');
            const canvas = document.getElementById('game-canvas');
            const ctx = canvas.getContext('2d');

            // Initialize display and resize handling
            function resizeCanvas() {
                const width = gameWorld.clientWidth;
                const height = gameWorld.clientHeight;
                if (canvas.width !== width || canvas.height !== height) {
                    canvas.width = width;
                    canvas.height = height;
                }
            }
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);

            // Game constants
            const SEGMENT_RADIUS = 14;
            const HEAD_RADIUS = 18;
            const FOOD_RADIUS = 10;
            const BASE_SPEED = 180; // pixels per second
            const TURN_SPEED = 8.0; // radians per second
            const SEGMENT_SPACING = 15;
            const MAX_SNAKE_LENGTH = 500;
            const RESPAWN_TIME = 1.5;
            const segmentSprites = Object.create(null);

            function segmentSprite(color, radius) {
                const key = color + ':' + radius;
                if (segmentSprites[key]) return segmentSprites[key];
                const sprite = document.createElement('canvas');
                const padding = radius + 32;
                sprite.width = padding * 2;
                sprite.height = padding * 2;
                const spriteCtx = sprite.getContext('2d');
                if (!spriteCtx) return null;
                spriteCtx.shadowBlur = 10;
                spriteCtx.shadowColor = color;
                spriteCtx.strokeStyle = 'rgba(0,0,0,0.8)';
                spriteCtx.lineWidth = 2;
                spriteCtx.fillStyle = color;
                spriteCtx.beginPath();
                spriteCtx.arc(padding, padding, radius, 0, Math.PI * 2);
                spriteCtx.fill();
                spriteCtx.stroke();
                const gradient = spriteCtx.createRadialGradient(
                    padding - radius * 0.3, padding - radius * 0.3, radius * 0.1,
                    padding, padding, radius
                );
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
                gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
                spriteCtx.fillStyle = gradient;
                spriteCtx.beginPath();
                spriteCtx.arc(padding, padding, radius, 0, Math.PI * 2);
                spriteCtx.fill();
                segmentSprites[key] = sprite;
                return sprite;
            }

            // Game state
            let playerSnake = null;
            let aiSnakes = [];
            let foodPellets = [];
            let camera = { x: 0, y: 0 };
            let playerKills = 0;
            let isPlayerDead = false;
            let respawnTimer = 0;
            let lastTime = 0;
            let playerBestLength = 0;
            let framePending = false;
            let lastShownLength = -1;
            let lastShownKills = -1;
            let leaderboardSignature = '';
            let paused = false;
            window.NeonClub.attach({
                isPaused() { return paused; },
                pause(value) { paused = value; lastTime = performance.now(); if (!value) scheduleFrame(); },
                togglePause() {
                    paused = !paused;
                    document.getElementById('pause-button').textContent = paused ? '继续' : '暂停';
                    lastTime = performance.now();
                    if (!paused) scheduleFrame();
                },
                continueGame() {
                    hideDeathScreen();
                    respawnSnake(playerSnake, true);
                    paused = false;
                    document.getElementById('pause-button').textContent = '暂停';
                    lastTime = performance.now();
                    scheduleFrame();
                }
            });

            // Control state
            let targetDirection = { x: 1, y: 0 };
            let mousePos = null;
            let touchPos = null;

            // Audio Context for feedback
            let audioCtx = null;
            function playEatSound(isSuper = false) {
                try {
                    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(isSuper ? 880 : 440, audioCtx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(isSuper ? 1760 : 880, audioCtx.currentTime + 0.1);
                    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.1);
                } catch (e) {}
            }
            // Snake class
            class Snake {
                constructor(x, y, color, isPlayer = false) {
                    this.isPlayer = isPlayer;
                    this.color = color;
                    this.direction = Math.random() * Math.PI * 2;
                    this.targetDirection = this.direction;
                    this.segments = [];
                    this.length = window.gameConfig.settings.startingLength;

                    // Initialize segments
                    for (let i = 0; i < this.length; i++) {
                        this.segments.push({
                            x: x - i * SEGMENT_SPACING * Math.cos(this.direction),
                            y: y - i * SEGMENT_SPACING * Math.sin(this.direction)
                        });
                    }

                    this.isDead = false;
                }

                get head() {
                    return this.segments[0];
                }

                update(deltaTime) {
                    if (this.isDead) return;

                    // Smooth rotation toward target
                    let angleDiff = this.targetDirection - this.direction;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                    const rotationAmount = Math.min(Math.abs(angleDiff), TURN_SPEED * deltaTime) * Math.sign(angleDiff);
                    this.direction += rotationAmount;

                    // Move head
                    const speed = BASE_SPEED * window.gameConfig.settings.speedMultiplier;
                    const moveX = Math.cos(this.direction) * speed * deltaTime;
                    const moveY = Math.sin(this.direction) * speed * deltaTime;

                    const newHeadX = this.segments[0].x + moveX;
                    const newHeadY = this.segments[0].y + moveY;

                    this.segments[0].x = newHeadX;
                    this.segments[0].y = newHeadY;

                    // Update body segments to follow smoothly with spacing
                    for (let i = 1; i < this.segments.length; i++) {
                        const prev = this.segments[i - 1];
                        const curr = this.segments[i];

                        const dX = prev.x - curr.x;
                        const dY = prev.y - curr.y;
                        const d = Math.sqrt(dX * dX + dY * dY);

                        if (d > SEGMENT_SPACING) {
                            const angle = Math.atan2(dY, dX);
                            curr.x = prev.x - Math.cos(angle) * SEGMENT_SPACING;
                            curr.y = prev.y - Math.sin(angle) * SEGMENT_SPACING;
                        }
                    }
                }

                grow(amount) {
                    if (this.segments.length >= MAX_SNAKE_LENGTH) return;

                    const tail = this.segments[this.segments.length - 1];
                    for (let i = 0; i < amount; i++) {
                        if (this.segments.length >= MAX_SNAKE_LENGTH) break;
                        this.segments.push({ x: tail.x, y: tail.y });
                    }
                    this.length = this.segments.length;
                }

                checkWallCollision(arenaWidth, arenaHeight) {
                    const head = this.head;
                    return head.x < HEAD_RADIUS ||
                           head.x > arenaWidth - HEAD_RADIUS ||
                           head.y < HEAD_RADIUS ||
                           head.y > arenaHeight - HEAD_RADIUS;
                }

                checkSnakeCollision(otherSnake, startIndex = 0) {
                    const head = this.head;
                    const checkRadius = HEAD_RADIUS + SEGMENT_RADIUS;

                    for (let i = startIndex; i < otherSnake.segments.length; i++) {
                        const segment = otherSnake.segments[i];
                        const dx = head.x - segment.x;
                        const dy = head.y - segment.y;
                        if (dx * dx + dy * dy < checkRadius * checkRadius) {
                            return true;
                        }
                    }
                    return false;
                }

                checkFoodCollision(food) {
                    const head = this.head;
                    const dx = head.x - food.x;
                    const dy = head.y - food.y;
                    const radius = HEAD_RADIUS + FOOD_RADIUS;
                    return dx * dx + dy * dy < radius * radius;
                }

                die() {
                    this.isDead = true;
                }

                render(ctx, cameraX, cameraY) {
                    if (this.isDead) return;

                    // Draw body segments (from tail to neck)
                    for (let i = this.segments.length - 1; i >= 0; i--) {
                        const segment = this.segments[i];
                        const isHead = i === 0;
                        const radius = isHead ? HEAD_RADIUS : SEGMENT_RADIUS;

                        const sprite = segmentSprite(this.color, radius);
                        const screenX = segment.x - cameraX;
                        const screenY = segment.y - cameraY;
                        const padding = radius + 32;
                        if (screenX + padding < 0 || screenX - padding > canvas.width ||
                            screenY + padding < 0 || screenY - padding > canvas.height) continue;
                        // The cached bitmap contains the original glow, stroke and gradient.
                        ctx.drawImage(sprite, screenX - padding, screenY - padding);

                        // Eyes for head
                        if (isHead) {
                            ctx.shadowBlur = 0;
                            const eyeOffset = radius * 0.5;
                            const eyeRadius = radius * 0.25;
                            const pupilRadius = eyeRadius * 0.5;

                            // Left Eye
                            const lx = segment.x + Math.cos(this.direction - 0.7) * eyeOffset;
                            const ly = segment.y + Math.sin(this.direction - 0.7) * eyeOffset;
                            ctx.fillStyle = 'white';
                            ctx.beginPath();
                            ctx.arc(lx - cameraX, ly - cameraY, eyeRadius, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.fillStyle = 'black';
                            ctx.beginPath();
                            ctx.arc(lx - cameraX, ly - cameraY, pupilRadius, 0, Math.PI * 2);
                            ctx.fill();

                            // Right Eye
                            const rx = segment.x + Math.cos(this.direction + 0.7) * eyeOffset;
                            const ry = segment.y + Math.sin(this.direction + 0.7) * eyeOffset;
                            ctx.fillStyle = 'white';
                            ctx.beginPath();
                            ctx.arc(rx - cameraX, ry - cameraY, eyeRadius, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.fillStyle = 'black';
                            ctx.beginPath();
                            ctx.arc(rx - cameraX, ry - cameraY, pupilRadius, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }

                    ctx.shadowBlur = 0;
                }
            }

            // AI Snake class with behavior
            class AISnake extends Snake {
                constructor(x, y, color) {
                    super(x, y, color, false);
                    this.aiTimer = 0;
                    this.avoidanceTimer = 0;
                }

                updateAI(deltaTime, foodPellets, allSnakes, arenaWidth, arenaHeight) {
                    if (this.isDead) return;

                    this.aiTimer += deltaTime;
                    this.avoidanceTimer -= deltaTime;

                    // Wall avoidance - highest priority
                    const head = this.head;
                    const wallMargin = 100;
                    let avoidDirection = null;

                    if (head.x < wallMargin) {
                        avoidDirection = 0; // Move right
                    } else if (head.x > arenaWidth - wallMargin) {
                        avoidDirection = Math.PI; // Move left
                    } else if (head.y < wallMargin) {
                        avoidDirection = Math.PI / 2; // Move down
                    } else if (head.y > arenaHeight - wallMargin) {
                        avoidDirection = -Math.PI / 2; // Move up
                    }

                    if (avoidDirection !== null) {
                        this.targetDirection = avoidDirection;
                        return;
                    }

                    // Snake collision avoidance
                    if (this.avoidanceTimer <= 0) {
                        for (const snake of allSnakes) {
                            if (snake === this || snake.isDead) continue;

                            // Check if any segment is close
                            for (const segment of snake.segments) {
                                const dx = segment.x - head.x;
                                const dy = segment.y - head.y;
                                if (dx * dx + dy * dy < 80 * 80) {
                                    // Turn away from the segment
                                    const angleToSegment = Math.atan2(dy, dx);
                                    this.targetDirection = angleToSegment + Math.PI + (Math.random() - 0.5) * 1;
                                    this.avoidanceTimer = 0.5;
                                    return;
                                }
                            }
                        }
                    }

                    // Food seeking behavior (update every 0.5 seconds)
                    if (this.aiTimer > 0.5) {
                        this.aiTimer = 0;

                        // Find nearest food
                        let nearestFood = null;
                        let nearestDist = Infinity;

                        for (const food of foodPellets) {
                            const dx = food.x - head.x;
                            const dy = food.y - head.y;
                            const distSquared = dx * dx + dy * dy;

                            if (distSquared < nearestDist) {
                                nearestDist = distSquared;
                                nearestFood = food;
                            }
                        }

                        if (nearestFood) {
                            const dx = nearestFood.x - head.x;
                            const dy = nearestFood.y - head.y;
                            this.targetDirection = Math.atan2(dy, dx);
                        }

                        // Add some randomness
                        if (Math.random() < 0.1) {
                            this.targetDirection += (Math.random() - 0.5) * 1.5;
                        }
                    }
                }
            }

            // Food pellet
            class Food {
                constructor(x, y, value = 1, color = '#ffff00') {
                    this.x = x;
                    this.y = y;
                    this.value = value;
                    this.color = color;
                    this.pulseTimer = Math.random() * Math.PI * 2;
                    this.isSuper = value > 1;
                }

                update(deltaTime) {
                    this.pulseTimer += deltaTime * (this.isSuper ? 6 : 3);
                }

                render(ctx, cameraX, cameraY) {
                    const baseRadius = this.isSuper ? FOOD_RADIUS * 1.5 : FOOD_RADIUS;
                    const scale = 1 + Math.sin(this.pulseTimer) * 0.2;
                    const radius = baseRadius * scale;
                    const screenX = this.x - cameraX;
                    const screenY = this.y - cameraY;
                    const glowExtent = radius * 1.8 + (this.isSuper ? 40 : 24);
                    if (screenX + glowExtent < 0 || screenX - glowExtent > canvas.width ||
                        screenY + glowExtent < 0 || screenY - glowExtent > canvas.height) return;

                    // Bloom/Neon Outer Ring
                    ctx.shadowBlur = this.isSuper ? 20 : 12;
                    ctx.shadowColor = this.color;

                    // Translucent Outer Ring
                    ctx.fillStyle = this.color;
                    ctx.globalAlpha = 0.3;
                    ctx.beginPath();
                    ctx.arc(this.x - cameraX, this.y - cameraY, radius * 1.8, 0, Math.PI * 2);
                    ctx.fill();

                    // Semi-translucent Middle Ring
                    ctx.globalAlpha = 0.6;
                    ctx.beginPath();
                    ctx.arc(this.x - cameraX, this.y - cameraY, radius * 1.3, 0, Math.PI * 2);
                    ctx.fill();

                    // Solid Core
                    ctx.globalAlpha = 1.0;
                    ctx.beginPath();
                    ctx.arc(this.x - cameraX, this.y - cameraY, radius * 0.8, 0, Math.PI * 2);
                    ctx.fill();

                    // Center Highlight
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(this.x - cameraX, this.y - cameraY, radius * 0.4, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = 1.0;
                }
            }
            // XHS offline save: keep only the player's best length on this device.
            async function loadProgress() {
                await window.NeonClub.ready;
                playerBestLength = window.NeonClub.store.snapshot().best;
            }

            // Initialize game
            function initGame() {
                const arenaWidth = window.gameConfig.settings.arenaWidth;
                const arenaHeight = window.gameConfig.settings.arenaHeight;

                // Create player snake
                const playerX = arenaWidth / 2;
                const playerY = arenaHeight / 2;
                playerSnake = new Snake(playerX, playerY, window.gameConfig.settings.playerColor, true);
                playerKills = 0;
                isPlayerDead = false;
                hideDeathScreen();

                // SNAP CAMERA on initial load to ensure player is visible immediately
                camera.x = playerSnake.head.x - canvas.width / 2;
                camera.y = playerSnake.head.y - canvas.height / 2;

                // Create AI snakes
                aiSnakes = [];
                const aiColors = ['#ff00ff', '#00ffff', '#ffff00', '#ff8800', '#8800ff', '#ff0066', '#00ff88', '#ff88ff', '#88ffff', '#ffff88', '#ff8888', '#88ff88'];
                for (let i = 0; i < window.gameConfig.settings.aiCount; i++) {
                    let x, y, tooClose;
                    do {
                        x = Math.random() * (arenaWidth - 200) + 100;
                        y = Math.random() * (arenaHeight - 200) + 100;

                        // Check if too close to player
                        const dx = x - playerX;
                        const dy = y - playerY;
                        tooClose = Math.sqrt(dx * dx + dy * dy) < 200;
                    } while (tooClose);

                    const color = aiColors[i % aiColors.length];
                    aiSnakes.push(new AISnake(x, y, color));
                }

                // Build once before animation starts to avoid a new blur per segment or a first-frame hitch.
                [playerSnake, ...aiSnakes].forEach(snake => {
                    segmentSprite(snake.color, HEAD_RADIUS);
                    segmentSprite(snake.color, SEGMENT_RADIUS);
                });

                // Create food pellets
                foodPellets = [];
                for (let i = 0; i < window.gameConfig.settings.foodCount; i++) {
                    spawnFood();
                }

                // Update HUD
                lastShownLength = -1;
                lastShownKills = -1;
                leaderboardSignature = '';
                updateHUD(true);
            }

            function spawnFood(value = 1, color = null, x = null, y = null) {
                const arenaWidth = window.gameConfig.settings.arenaWidth;
                const arenaHeight = window.gameConfig.settings.arenaHeight;
                const margin = 50;

                let fx = x, fy = y;
                if (fx === null || fy === null) {
                    fx = Math.random() * (arenaWidth - margin * 2) + margin;
                    fy = Math.random() * (arenaHeight - margin * 2) + margin;
                }

                if (color === null) {
                    const colors = ['#00ffff', '#39ff14', '#ffff33', '#ff007f', '#ff3131', '#bc13fe'];
                    color = colors[Math.floor(Math.random() * colors.length)];
                }

                foodPellets.push(new Food(fx, fy, value, color));
            }

            function handleSnakeDeath(snake) {
                if (snake.isDead) return;
                snake.die();

                // Drop super orbs
                snake.segments.forEach((seg, i) => {
                    if (i % 2 === 0) spawnFood(3, snake.color, seg.x, seg.y);
                });

                if (snake.isPlayer) {
                    isPlayerDead = true;
                    showDeathScreen();
                } else {
                    setTimeout(() => respawnSnake(snake, false), 1500);
                }
            }

            function respawnSnake(snake, isPlayer = false) {
                const arenaWidth = window.gameConfig.settings.arenaWidth;
                const arenaHeight = window.gameConfig.settings.arenaHeight;
                const margin = 100;

                let x, y, tooClose;
                do {
                    x = Math.random() * (arenaWidth - margin * 2) + margin;
                    y = Math.random() * (arenaHeight - margin * 2) + margin;
                    tooClose = false;

                    // Check if too close to other snakes
                    const allSnakes = [playerSnake, ...aiSnakes].filter(s => s && !s.isDead && s !== snake);
                    for (const other of allSnakes) {
                        const dx = x - other.head.x;
                        const dy = y - other.head.y;
                        if (Math.sqrt(dx * dx + dy * dy) < 200) {
                            tooClose = true;
                            break;
                        }
                    }
                } while (tooClose);

                const color = isPlayer ? window.gameConfig.settings.playerColor : snake.color;
                const newSnake = isPlayer ? new Snake(x, y, color, true) : new AISnake(x, y, color);

                if (isPlayer) {
                    playerSnake = newSnake;
                    playerKills = 0;
                    isPlayerDead = false;

                    // SNAP CAMERA on respawn to prevent delay and disorienting movement
                    camera.x = playerSnake.head.x - canvas.width / 2;
                    camera.y = playerSnake.head.y - canvas.height / 2;

                    // Spawn immediate food nearby to ensure player can grow within 10s as requested
                    for (let i = 0; i < 5; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const dist = 100 + Math.random() * 150;
                        spawnFood(1, '#ffff00',
                            playerSnake.head.x + Math.cos(angle) * dist,
                            playerSnake.head.y + Math.sin(angle) * dist
                        );
                    }
                } else {
                    const index = aiSnakes.indexOf(snake);
                    aiSnakes[index] = newSnake;
                }

                return newSnake;
            }

            function updateHUD(force = false) {
                const length = playerSnake ? playerSnake.length : 0;
                window.NeonClub.progress(length);
                if (length !== lastShownLength) {
                    document.getElementById('length-display').textContent = length;
                    lastShownLength = length;
                }
                if (playerKills !== lastShownKills) {
                    document.getElementById('kills-display').textContent = playerKills;
                    lastShownKills = playerKills;
                }

                // Update leaderboard
                const allSnakes = [playerSnake, ...aiSnakes].filter(s => s && !s.isDead);
                allSnakes.sort((a, b) => b.length - a.length);
                const top5 = allSnakes.slice(0, 5);
                const signature = top5.map(s => s.color + ':' + s.length + ':' + s.isPlayer).join('|');
                if (!force && signature === leaderboardSignature) return;
                leaderboardSignature = signature;

                const leaderboardContent = document.getElementById('leaderboard-content');
                leaderboardContent.innerHTML = '';

                top5.forEach((snake, index) => {
                    const entry = document.createElement('div');
                    entry.className = 'leaderboard-entry' + (snake.isPlayer ? ' player' : '');

                    const rank = document.createElement('span');
                    rank.className = 'leaderboard-rank';
                    rank.textContent = (index + 1) + '.';

                    const colorDot = document.createElement('div');
                    colorDot.className = 'leaderboard-color';
                    colorDot.style.backgroundColor = snake.color;

                    const length = document.createElement('span');
                    length.className = 'leaderboard-length';
                    length.textContent = snake.length;

                    entry.appendChild(rank);
                    entry.appendChild(colorDot);
                    entry.appendChild(length);
                    leaderboardContent.appendChild(entry);
                });
            }

            function showDeathScreen() {
                const deathScreen = document.getElementById('death-screen');
                document.getElementById('final-length').textContent = playerSnake.length;
                document.getElementById('final-kills').textContent = playerKills;

                window.NeonClub.result(playerSnake.length, playerKills, playerSnake.head.y - camera.y);
                playerBestLength = window.NeonClub.store.snapshot().best;
                document.getElementById('best-length').textContent = playerBestLength;

                deathScreen.classList.remove('hidden');
                respawnTimer = RESPAWN_TIME;
            }

            function hideDeathScreen() {
                document.getElementById('death-screen').classList.add('hidden');
            }

            // Input handling
            function updateMousePosition(e) {
                const rect = canvas.getBoundingClientRect();
                mousePos = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
            }

            function updateTouchPosition(e) {
                if (e.touches.length > 0) {
                    const rect = canvas.getBoundingClientRect();
                    touchPos = {
                        x: e.touches[0].clientX - rect.left,
                        y: e.touches[0].clientY - rect.top
                    };
                }
            }

            canvas.addEventListener('mousemove', updateMousePosition);
            canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                updateTouchPosition(e);
            });
            canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                updateTouchPosition(e);
            });
            canvas.addEventListener('touchend', () => {
                touchPos = null;
            });
            canvas.addEventListener('touchcancel', () => { touchPos = null; });

            // Arrow key controls
            const keys = {};
            window.addEventListener('keydown', (e) => {
                keys[e.key] = true;
            });
            window.addEventListener('keyup', (e) => {
                keys[e.key] = false;
            });

            function updatePlayerDirection() {
                if (!playerSnake || playerSnake.isDead) return;

                const controlPos = touchPos || mousePos;
                if (controlPos) {
                    const worldX = controlPos.x + camera.x;
                    const worldY = controlPos.y + camera.y;
                    const dx = worldX - playerSnake.head.x;
                    const dy = worldY - playerSnake.head.y;
                    playerSnake.targetDirection = Math.atan2(dy, dx);
                }

                if (keys['ArrowUp'] || keys['w'] || keys['W']) playerSnake.targetDirection = -Math.PI / 2;
                if (keys['ArrowDown'] || keys['s'] || keys['S']) playerSnake.targetDirection = Math.PI / 2;
                if (keys['ArrowLeft'] || keys['a'] || keys['A']) playerSnake.targetDirection = Math.PI;
                if (keys['ArrowRight'] || keys['d'] || keys['D']) playerSnake.targetDirection = 0;
            }

            function updateCamera() {
                if (!playerSnake || playerSnake.isDead) return;

                const targetX = playerSnake.head.x - canvas.width / 2;
                const targetY = playerSnake.head.y - canvas.height / 2;

                // Keep the accepted camera response.
                camera.x += (targetX - camera.x) * 0.1;
                camera.y += (targetY - camera.y) * 0.1;
            }

            function drawBackground() {
                // Midnight deep blue near black
                ctx.fillStyle = '#02040a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const arenaWidth = window.gameConfig.settings.arenaWidth;
                const arenaHeight = window.gameConfig.settings.arenaHeight;

                // Subtle grid/circuit texture
                ctx.save();
                ctx.translate(-camera.x % 100, -camera.y % 100);
                ctx.strokeStyle = 'rgba(0, 100, 255, 0.05)';
                ctx.lineWidth = 1;

                ctx.beginPath();
                // Vertical lines
                for (let x = -100; x < canvas.width + 100; x += 100) {
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, canvas.height);
                }

                // Horizontal lines
                for (let y = -100; y < canvas.height + 100; y += 100) {
                    ctx.moveTo(0, y);
                    ctx.lineTo(canvas.width, y);
                }
                ctx.stroke();

                // Small blue dots at intersections
                ctx.fillStyle = 'rgba(0, 100, 255, 0.1)';
                ctx.beginPath();
                for (let x = -100; x < canvas.width + 100; x += 100) {
                    for (let y = -100; y < canvas.height + 100; y += 100) {
                        ctx.moveTo(x + 2, y);
                        ctx.arc(x, y, 2, 0, Math.PI * 2);
                    }
                }
                ctx.fill();
                ctx.restore();

                // Arena Boundary
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
                ctx.lineWidth = 6;
                ctx.strokeRect(-camera.x, -camera.y, arenaWidth, arenaHeight);

                // Brighter inner boundary line
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
                ctx.lineWidth = 2;
                ctx.strokeRect(-camera.x, -camera.y, arenaWidth, arenaHeight);
            }

            // Game loop
            function scheduleFrame() {
                if (!framePending && !document.hidden) {
                    framePending = true;
                    requestAnimationFrame(gameLoop);
                }
            }

            function gameLoop(timestamp) {
                framePending = false;
                if (document.hidden || paused) {
                    lastTime = timestamp;
                    return;
                }
                const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.11);
                lastTime = timestamp;

                drawBackground();

                if (mode === 'play') {
                    // Handle death state
                    if (isPlayerDead) {
                        // Keep the result until the player chooses to continue or share.
                    } else {
                        updatePlayerDirection();
                        playerSnake.update(deltaTime);

                        const arenaWidth = window.gameConfig.settings.arenaWidth;
                        const arenaHeight = window.gameConfig.settings.arenaHeight;

                        // Player boundary check
                        if (playerSnake.checkWallCollision(arenaWidth, arenaHeight)) {
                            handleSnakeDeath(playerSnake);
                        } else if (playerSnake.checkSnakeCollision(playerSnake, 10)) {
                            handleSnakeDeath(playerSnake);
                        }

                        // Player collisions with AI
                        if (!isPlayerDead) {
                            for (const aiSnake of aiSnakes) {
                                if (aiSnake.isDead) continue;

                                // AI head hits player body/head
                                if (aiSnake.checkSnakeCollision(playerSnake, 0)) {
                                    playerKills++;
                                    handleSnakeDeath(aiSnake);
                                }

                                // Player head hits AI body/head
                                if (playerSnake.checkSnakeCollision(aiSnake, 0)) {
                                    handleSnakeDeath(playerSnake);
                                    break;
                                }
                            }
                        }

                        // Player Food
                        if (!isPlayerDead) {
                            for (let i = foodPellets.length - 1; i >= 0; i--) {
                                if (playerSnake.checkFoodCollision(foodPellets[i])) {
                                    const food = foodPellets.splice(i, 1)[0];
                                    playerSnake.grow(food.value);
                                    playEatSound(food.isSuper);
                                    if (!food.isSuper) spawnFood();
                                }
                            }
                        }

                        // AI Update
                        for (const aiSnake of aiSnakes) {
                            if (aiSnake.isDead) continue;
                            aiSnake.updateAI(deltaTime, foodPellets, [playerSnake, ...aiSnakes], arenaWidth, arenaHeight);
                            aiSnake.update(deltaTime);

                            if (aiSnake.checkWallCollision(arenaWidth, arenaHeight)) {
                                handleSnakeDeath(aiSnake);
                            } else {
                                // AI vs others (AI vs AI or AI vs Player)
                                for (const other of [playerSnake, ...aiSnakes]) {
                                    if (other === aiSnake || other.isDead) continue;
                                    if (aiSnake.checkSnakeCollision(other, 0)) {
                                        if (other.isPlayer) {
                                            playerKills++;
                                        }
                                        handleSnakeDeath(aiSnake);
                                        break;
                                    }
                                }

                                if (!aiSnake.isDead && aiSnake.checkSnakeCollision(aiSnake, 10)) {
                                    handleSnakeDeath(aiSnake);
                                }
                            }

                            // AI Food
                            for (let i = foodPellets.length - 1; i >= 0; i--) {
                                if (aiSnake.checkFoodCollision(foodPellets[i])) {
                                    const food = foodPellets.splice(i, 1)[0];
                                    aiSnake.grow(food.value);
                                    if (!food.isSuper) spawnFood();
                                }
                            }
                        }

                        // Update food
                        foodPellets.forEach(food => food.update(deltaTime));

                        // Update camera
                        updateCamera();

                        // Update HUD
                        updateHUD();
                    }

                    // Render arena bounds
                    const arenaWidth = window.gameConfig.settings.arenaWidth;
                    const arenaHeight = window.gameConfig.settings.arenaHeight;
                    ctx.strokeStyle = '#00ffff';
                    ctx.lineWidth = 10;
                    ctx.shadowBlur = 30;
                    ctx.shadowColor = '#00ffff';
                    ctx.strokeRect(-camera.x, -camera.y, arenaWidth, arenaHeight);
                    ctx.shadowBlur = 0;

                    // Render food
                    foodPellets.forEach(food => food.render(ctx, camera.x, camera.y));

                    // Render snakes
                    aiSnakes.forEach(snake => snake.render(ctx, camera.x, camera.y));
                    if (playerSnake && !playerSnake.isDead) {
                        playerSnake.render(ctx, camera.x, camera.y);
                    }
                } else {
                    // Edit mode - just render static preview
                    updateCamera();

                    const arenaWidth = window.gameConfig.settings.arenaWidth;
                    const arenaHeight = window.gameConfig.settings.arenaHeight;
                    ctx.strokeStyle = '#00ffff';
                    ctx.lineWidth = 4;
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = '#00ffff';
                    ctx.strokeRect(-camera.x, -camera.y, arenaWidth, arenaHeight);
                    ctx.shadowBlur = 0;

                    foodPellets.forEach(food => {
                        food.update(deltaTime);
                        food.render(ctx, camera.x, camera.y);
                    });

                    aiSnakes.forEach(snake => snake.render(ctx, camera.x, camera.y));
                    if (playerSnake) {
                        playerSnake.render(ctx, camera.x, camera.y);
                    }

                    updateHUD();
                }

                if (!isPlayerDead) scheduleFrame();
            }

            // Initialize and start
            if (document.addEventListener) {
                document.addEventListener('visibilitychange', () => {
                    if (!document.hidden) {
                        lastTime = performance.now();
                        scheduleFrame();
                    }
                });
            }
            loadProgress().then(() => {
                initGame();
                lastTime = performance.now();
                scheduleFrame();
            });
        }
document.getElementById('start-button').addEventListener('click', function () {
    if (document.getElementById('start-button').disabled) return;
    document.getElementById('start-button').disabled = true;
    document.getElementById('launch').hidden = true;
    run('play');
});
