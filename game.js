// Game Configuration
const config = {
    easy: { 
        speed: 200,
        scoreMultiplier: 1,
        snakeColor: '#4CAF50',
        snakeHeadColor: '#66bb6a',
        initialSize: 3
    },
    medium: { 
        speed: 120,
        scoreMultiplier: 2,
        snakeColor: '#FFA000',
        snakeHeadColor: '#FFB300',
        initialSize: 4
    },
    hard: { 
        speed: 70,
        scoreMultiplier: 4,
        snakeColor: '#D32F2F',
        snakeHeadColor: '#EF5350',
        initialSize: 5
    }
};

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');
const highScoreElement = document.getElementById('highScoreValue');
const levelElement = document.getElementById('levelValue');
const mainMenu = document.getElementById('mainMenu');
const gameArea = document.getElementById('gameArea');
const gameOverScreen = document.getElementById('gameOverScreen');
const highScoresScreen = document.getElementById('highScoresScreen');

// Game State
let gameState = {
    running: false,
    paused: false,
    score: 0,
    highScore: localStorage.getItem('highScore') || 0,
    level: 1,
    difficulty: 'medium',
    powerUpActive: false,
    foodCount: 0,
    megaFoodActive: false
};

// Canvas Setup
canvas.width = 600;
canvas.height = 600;
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Snake Setup
let snake = [{ x: 5, y: 5 }];
let velocityX = 0;
let velocityY = 0;

// Food and Power-up Setup
let food = generateRandomPosition();
let powerUp = null;
const powerUpTypes = ['speed', 'points', 'size'];
let megaFood = null;

// Initialize Game
function initGame() {
    // Initialize game state
    resetGameState();
    
    // Set up event listeners
    setupEventListeners();
    
    // Show main menu
    hideAllScreens();
    mainMenu.classList.remove('hidden');
}

// Event Listeners
function setupEventListeners() {
    // Remove existing event listeners first
    const buttons = {
        'playBtn': startGame,
        'pauseBtn': togglePause,
        'menuBtn': showMainMenu,
        'highScoresBtn': showHighScores,
        'playAgainBtn': startGame,
        'gameOverMenuBtn': showMainMenu,
        'backToMenuBtn': showMainMenu,
        'copyrightBtn': showCopyright
    };

    Object.entries(buttons).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) {
            // Remove old listener and add new one
            element.replaceWith(element.cloneNode(true));
            document.getElementById(id).addEventListener('click', handler);
        } else {
            console.warn(`Button with id '${id}' not found`);
        }
    });

    // Set up difficulty select
    const difficultySelect = document.getElementById('difficultySelect');
    if (difficultySelect) {
        difficultySelect.addEventListener('change', (e) => {
            gameState.difficulty = e.target.value;
        });
    }

    // Set up keyboard controls
    document.addEventListener('keydown', handleKeyPress);
}

// Game Loop
function gameLoop() {
    if (!gameState.running || gameState.paused) return;

    // Check for collisions before updating
    if (checkCollisions()) {
        gameOver();
        return;
    }

    updateGame();
    drawGame();
    
    const speed = config[gameState.difficulty].speed;
    setTimeout(gameLoop, speed);
}

// Update Game State
function updateGame() {
    moveSnake();
    checkCollisions();
    updatePowerUps();
    updateLevel();
}

// Snake Movement
function moveSnake() {
    const newHead = {
        x: snake[0].x + velocityX,
        y: snake[0].y + velocityY
    };
    
    snake.unshift(newHead);
    
    if (checkFoodCollision()) {
        updateScore();
        gameState.foodCount++;
        
        // Check if we should spawn mega food
        if (gameState.foodCount % 6 === 0) {
            megaFood = generateRandomPosition();
            gameState.megaFoodActive = true;
        } else {
            food = generateRandomPosition();
            if (Math.random() < 0.1) generatePowerUp();
        }
    } else if (checkMegaFoodCollision()) {
        updateScore();
        megaFood = null;
        gameState.megaFoodActive = false;
        food = generateRandomPosition();
    } else {
        snake.pop();
    }
}

// Collision Detection
function checkCollisions() {
    const head = snake[0];
    
    // Wall collision
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        return true;
    }
    
    // Self collision
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    return false;
}

// Drawing Functions
function drawGame() {
    clearCanvas();
    drawSnake();
    if (gameState.megaFoodActive) {
        drawMegaFood();
    } else {
        drawFood();
    }
    if (powerUp) drawPowerUp();
}

function drawSnake() {
    snake.forEach((segment, index) => {
        const gradient = ctx.createLinearGradient(
            segment.x * gridSize,
            segment.y * gridSize,
            (segment.x + 1) * gridSize,
            (segment.y + 1) * gridSize
        );
        
        const colors = config[gameState.difficulty];
        gradient.addColorStop(0, colors.snakeColor);
        gradient.addColorStop(1, colors.snakeColor + '99'); // Add transparency
        
        ctx.fillStyle = index === 0 ? colors.snakeHeadColor : gradient;
        ctx.shadowColor = colors.snakeColor;
        ctx.shadowBlur = 10;
        ctx.fillRect(
            segment.x * gridSize,
            segment.y * gridSize,
            gridSize - 2,
            gridSize - 2
        );
        ctx.shadowBlur = 0;
    });
}

// Power-up System
function generatePowerUp() {
    if (Math.random() < 0.2) { // 20% chance to spawn power-up
        powerUp = {
            position: generateRandomPosition(),
            type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)],
            duration: 150,
            blinkCounter: 0
        };
    }
}

function updatePowerUps() {
    if (gameState.powerUpActive) {
        powerUp.duration--;
        if (powerUp.duration <= 0) {
            deactivatePowerUp();
        }
    }
}

function activatePowerUp(type) {
    gameState.powerUpActive = true;
    switch(type) {
        case 'speed':
            config[gameState.difficulty].speed *= 0.75;
            break;
        case 'points':
            config[gameState.difficulty].scoreMultiplier *= 2;
            break;
        case 'size':
            for(let i = 0; i < 3; i++) snake.push({...snake[snake.length-1]});
            break;
    }
}

// Score and Level System
function updateScore() {
    const basePoints = 10;
    const multiplier = config[gameState.difficulty].scoreMultiplier;
    const points = gameState.megaFoodActive ? basePoints * 4 : basePoints;
    gameState.score += points * multiplier;
    scoreElement.textContent = Math.floor(gameState.score);
    
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        highScoreElement.textContent = gameState.highScore;
        localStorage.setItem('highScore', gameState.highScore);
    }
}

function updateLevel() {
    const newLevel = Math.floor(gameState.score / 100) + 1;
    if (newLevel !== gameState.level) {
        gameState.level = newLevel;
        levelElement.textContent = gameState.level;
        increaseSpeed();
    }
}

// Game State Management
function startGame() {
    // Reset game state and initialize snake
    resetGameState();
    initializeSnake();
    food = generateRandomPosition();
    powerUp = null;
    
    // Hide all screens first
    hideAllScreens();
    
    // Show only game area
    gameArea.classList.remove('hidden');
    
    // Set initial direction (moving right)
    velocityX = 1;
    velocityY = 0;
    
    // Start the game
    gameState.running = true;
    gameLoop(); // Remove the setTimeout to start immediately
    megaFood = null;
    gameState.megaFoodActive = false;
    gameState.foodCount = 0;
}

function gameOver() {
    gameState.running = false;
    
    // Save high score
    const highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
    highScores.push(gameState.score);
    highScores.sort((a, b) => b - a);
    highScores.splice(10); // Keep only top 10 scores
    localStorage.setItem('highScores', JSON.stringify(highScores));
    
    // Hide all screens first
    hideAllScreens();
    
    // Update UI and show game over screen
    document.getElementById('finalScore').textContent = gameState.score;
    gameOverScreen.classList.remove('hidden');
    
    // Play game over sound
    playSound('gameOver');
}

function showMainMenu() {
    gameState.running = false;
    hideAllScreens();
    mainMenu.classList.remove('hidden');
}

// Utility Functions
function generateRandomPosition() {
    let newPos;
    do {
        newPos = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    } while (isPositionOccupied(newPos));
    return newPos;
}

function isPositionOccupied(pos) {
    return snake.some(segment => segment.x === pos.x && segment.y === pos.y);
}

// Handle keyboard controls
function handleKeyPress(event) {
    if (!gameState.running || gameState.paused) return;

    // Prevent default arrow key scrolling
    if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
    }

    switch (event.key) {
        case 'ArrowUp':
            if (velocityY !== 1) { // Can't move up if moving down
                velocityX = 0;
                velocityY = -1;
            }
            break;
        case 'ArrowDown':
            if (velocityY !== -1) { // Can't move down if moving up
                velocityX = 0;
                velocityY = 1;
            }
            break;
        case 'ArrowLeft':
            if (velocityX !== 1) { // Can't move left if moving right
                velocityX = -1;
                velocityY = 0;
            }
            break;
        case 'ArrowRight':
            if (velocityX !== -1) { // Can't move right if moving left
                velocityX = 1;
                velocityY = 0;
            }
            break;
        case ' ':
            togglePause();
            break;
    }
}

// Add missing functions
function clearCanvas() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawFood() {
    ctx.fillStyle = '#FF4081';
    ctx.shadowColor = '#FF4081';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(
        (food.x * gridSize) + gridSize/2,
        (food.y * gridSize) + gridSize/2,
        gridSize/2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawPowerUp() {
    if (!powerUp) return;
    
    powerUp.blinkCounter = (powerUp.blinkCounter + 1) % 60;
    if (powerUp.blinkCounter > 30) return; // Blink effect
    
    const colors = {
        speed: '#FFD700',
        points: '#FF1493',
        size: '#00FF00'
    };
    
    ctx.fillStyle = colors[powerUp.type];
    ctx.shadowColor = colors[powerUp.type];
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(
        (powerUp.position.x * gridSize) + gridSize/2,
        (powerUp.position.y * gridSize) + gridSize/2,
        gridSize/2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
}

function checkFoodCollision() {
    return snake[0].x === food.x && snake[0].y === food.y;
}

function togglePause() {
    gameState.paused = !gameState.paused;
    document.getElementById('pauseBtn').textContent = gameState.paused ? 'Resume' : 'Pause';
    if (!gameState.paused) gameLoop();
}

function showHighScores() {
    hideAllScreens();
    highScoresScreen.classList.remove('hidden');
    
    // Get and display high scores
    const highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
    const highScoresList = document.getElementById('highScoresList');
    highScoresList.innerHTML = highScores
        .map((score, index) => `<div>${index + 1}. ${score}</div>`)
        .join('') || '<div>No high scores yet!</div>';
}

function deactivatePowerUp() {
    if (!gameState.powerUpActive) return;
    
    switch(powerUp.type) {
        case 'speed':
            config[gameState.difficulty].speed /= 0.75;
            break;
        case 'points':
            config[gameState.difficulty].scoreMultiplier /= 2;
            break;
    }
    
    gameState.powerUpActive = false;
    powerUp = null;
}

function increaseSpeed() {
    const currentSpeed = config[gameState.difficulty].speed;
    config[gameState.difficulty].speed = Math.max(currentSpeed * 0.95, 50);
}

// Add event listeners for game over screen buttons
document.getElementById('playAgainBtn').addEventListener('click', startGame);
document.getElementById('gameOverMenuBtn').addEventListener('click', showMainMenu);
document.getElementById('backToMenuBtn').addEventListener('click', showMainMenu);

// Add this new function to initialize snake
function initializeSnake() {
    const centerX = Math.floor(tileCount / 2);
    const centerY = Math.floor(tileCount / 2);
    snake = [];
    
    // Create snake with initial size based on difficulty
    const initialSize = config[gameState.difficulty].initialSize;
    for (let i = 0; i < initialSize; i++) {
        snake.push({ x: centerX - i, y: centerY });
    }
}

// Add this function to reset game state
function resetGameState() {
    gameState = {
        running: false,
        paused: false,
        score: 0,
        highScore: localStorage.getItem('highScore') || 0,
        level: 1,
        difficulty: document.getElementById('difficultySelect').value || 'medium',
        powerUpActive: false,
        foodCount: 0,
        megaFoodActive: false
    };
    
    // Reset UI elements
    scoreElement.textContent = '0';
    levelElement.textContent = '1';
    highScoreElement.textContent = gameState.highScore;
}

// Add this function to hide all screens
function hideAllScreens() {
    const screens = [mainMenu, gameArea, gameOverScreen, highScoresScreen];
    screens.forEach(screen => screen.classList.add('hidden'));
}

// Add function to check mega food collision
function checkMegaFoodCollision() {
    if (!megaFood) return false;
    return snake[0].x === megaFood.x && snake[0].y === megaFood.y;
}

// Add function to draw mega food
function drawMegaFood() {
    if (!megaFood) return;
    
    // Create neon blue glow effect
    ctx.shadowColor = '#00f7ff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#00f7ff';
    
    // Draw larger ball
    ctx.beginPath();
    ctx.arc(
        (megaFood.x * gridSize) + gridSize/2,
        (megaFood.y * gridSize) + gridSize/2,
        gridSize - 2,  // 4 times larger than regular food
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // Add inner glow
    ctx.beginPath();
    ctx.arc(
        (megaFood.x * gridSize) + gridSize/2,
        (megaFood.y * gridSize) + gridSize/2,
        (gridSize - 2) * 0.7,
        0,
        Math.PI * 2
    );
    ctx.fillStyle = '#fff';
    ctx.fill();
    
    ctx.shadowBlur = 0;
}

// Add this new function
function showCopyright() {
    const year = new Date().getFullYear();
    alert(`© ${year} Vihanga Wimalaweera\nAll Rights Reserved.`);
}

// Add touch controls
function addTouchControls() {
    const gameArea = document.getElementById('gameArea');
    const touchControls = document.createElement('div');
    touchControls.className = 'touch-controls';
    
    const buttons = [
        { id: 'up', text: '↑', x: 1, y: 0 },
        { id: 'left', text: '←', x: 0, y: 1 },
        { id: 'down', text: '↓', x: 1, y: 2 },
        { id: 'right', text: '→', x: 2, y: 1 }
    ];
    
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = 'touch-btn';
        button.id = `touch-${btn.id}`;
        button.textContent = btn.text;
        
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleTouchControl(btn.id);
        });
        
        touchControls.appendChild(button);
    });
    
    gameArea.appendChild(touchControls);
}

function handleTouchControl(direction) {
    if (!gameState.running || gameState.paused) return;
    
    switch(direction) {
        case 'up':
            if (velocityY !== 1) {
                velocityX = 0;
                velocityY = -1;
            }
            break;
        case 'down':
            if (velocityY !== -1) {
                velocityX = 0;
                velocityY = 1;
            }
            break;
        case 'left':
            if (velocityX !== 1) {
                velocityX = -1;
                velocityY = 0;
            }
            break;
        case 'right':
            if (velocityX !== -1) {
                velocityX = 1;
                velocityY = 0;
            }
            break;
    }
}

// Update canvas size based on screen
function resizeCanvas() {
    const container = document.querySelector('.game-container');
    const containerWidth = container.clientWidth;
    const size = Math.min(containerWidth * 0.9, 600);
    
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
}

// Add event listeners for resize
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);

// Update initGame function
function initGame() {
    resetGameState();
    setupEventListeners();
    addTouchControls();
    resizeCanvas();
    hideAllScreens();
    mainMenu.classList.remove('hidden');
}

// Start the game
initGame(); 