// script.js

import { pushScore, getLeaderboard } from './firebase-config.js'; // Adjust the path as necessary

// DOM Elements
const leaderboardScreen = document.getElementById('leaderboardScreen');
const leaderboardBody = document.getElementById('leaderboardBody');
const preNextLevelScreen = document.getElementById('preNextLevelScreen');
const preLeaderboardBody = document.getElementById('preLeaderboardBody');
const startGameButton = document.getElementById('startGameButton');
const rulesButton = document.getElementById('rulesButton');
const rulesModal = document.getElementById('rulesModal');
const closeRulesButton = document.getElementById('closeRulesButton');
const gameScreen = document.getElementById('gameScreen');
const gameCanvas = document.getElementById('gameCanvas');
const endLevelScreen = document.getElementById('endLevelScreen');
const endLevelScore = document.getElementById('endLevelScore');
const nameForm = document.getElementById('nameForm');
const playerNameInput = document.getElementById('playerName');
const skipButton = document.getElementById('skipButton');
const confirmationDialog = document.getElementById('confirmationDialog');
const confirmationMessage = document.getElementById('confirmationMessage');
const confirmYesButton = document.getElementById('confirmYesButton');
const confirmNoButton = document.getElementById('confirmNoButton');
const playNextLevelButton = document.getElementById('playNextLevelButton');
const resetGameButton = document.getElementById('resetGameButton');

// Game Variables
let currentLevel = 1;
const totalLevels = 10;
let totalCircles = 10; // Starts at 10, increases by 5 each level
const circlesDiameter = 15; // in pixels
let circlesPopped = 0;
let circlesMissed = 0;
let clickCount = 0;
let timeStart = null;
let timeEnd = null;
let gameTimer = null;
let scoreDecayTimer = null;
let totalTime = 0.00; // in seconds

// Canvas Context
const ctx = gameCanvas.getContext('2d');

// Circle Class
class Circle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = circlesDiameter / 2;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#4CAF50'; // Popix's circle color
        ctx.fill();
        ctx.closePath();
    }

    isClicked(clickX, clickY) {
        const distance = Math.sqrt((clickX - this.x) ** 2 + (clickY - this.y) ** 2);
        return distance <= this.radius;
    }
}

// Game State
let circles = [];
let activeCircles = []; // Currently displayed circles

// Initialize Game Canvas Size
function resizeCanvas() {
    gameCanvas.width = window.innerWidth;
    gameCanvas.height = window.innerHeight;
    // Redraw active circles on resize
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    activeCircles.forEach(circle => circle.draw());
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Utility Functions
function getRandomPosition() {
    const padding = circlesDiameter;
    const x = Math.random() * (gameCanvas.width - 2 * padding) + padding;
    const y = Math.random() * (gameCanvas.height - 2 * padding) + padding;
    return { x, y };
}

function createCircles(count) {
    circles = [];
    for (let i = 0; i < count; i++) {
        const pos = getRandomPosition();
        circles.push(new Circle(pos.x, pos.y));
    }
}

function showScreen(screen) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    // Show the selected screen
    screen.classList.add('active');
}

function displayLeaderboard(level, leaderboardBodyElement) {
    getLeaderboard(level, (entries) => { // Use the imported getLeaderboard function
        leaderboardBodyElement.innerHTML = ''; // Clear existing entries

        if (entries && entries.length > 0) {
            // Sort entries by time ascending
            entries.sort((a, b) => a.time - b.time);

            // Display top 5
            const topEntries = entries.slice(0, 5);
            topEntries.forEach((entry, index) => {
                const row = document.createElement('tr');

                const rankCell = document.createElement('td');
                rankCell.textContent = index + 1;
                row.appendChild(rankCell);

                const nameCell = document.createElement('td');
                nameCell.textContent = entry.name;
                row.appendChild(nameCell);

                const timeCell = document.createElement('td');
                timeCell.textContent = entry.time.toFixed(2);
                row.appendChild(timeCell);

                const clicksCell = document.createElement('td');
                clicksCell.textContent = entry.clicks;
                row.appendChild(clicksCell);

                const missedClicksCell = document.createElement('td');
                missedClicksCell.textContent = entry.missedClicks;
                row.appendChild(missedClicksCell);

                leaderboardBodyElement.appendChild(row);
            });
        } else {
            // No entries yet
            const row = document.createElement('tr');
            const noDataCell = document.createElement('td');
            noDataCell.colSpan = 5; // Update colspan to match the number of columns
            noDataCell.textContent = 'No entries yet.';
            noDataCell.style.textAlign = 'center';
            row.appendChild(noDataCell);
            leaderboardBodyElement.appendChild(row);
        }
    });
}

// Initialize Leaderboard Screen
function initializeLeaderboard() {
    displayLeaderboard(currentLevel, leaderboardBody);
}

// Start Game Function
function startGame() {
    console.log('Starting game...'); // Debugging
    // Reset game variables
    circlesPopped = 0;
    circlesMissed = 0;
    clickCount = 0;
    totalTime = 0.00;

    // Initialize circles
    createCircles(totalCircles);

    // Clear active circles
    activeCircles = [];

    // Show game screen
    showScreen(gameScreen);

    // Clear any existing drawings
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    // Start the timer
    timeStart = performance.now();
    gameTimer = setInterval(() => {
        const now = performance.now();
        totalTime = ((now - timeStart) / 1000).toFixed(2); // in seconds with two decimals
        // Optionally, update a timer display on the UI
    }, 10); // Update every 10ms for higher precision

    // Start score decay timer
    scoreDecayTimer = setInterval(() => {
        totalTime = (parseFloat(totalTime) + 0.02).toFixed(2); // Add 0.02s every 0.02s for a smoother decay
    }, 20); // Adjust as needed

    // Display initial 2 circles
    addNewCircle();
    addNewCircle();
}

// End Game Function
function endGame() {
    console.log('Ending game...'); // Debugging
    clearInterval(gameTimer);
    clearInterval(scoreDecayTimer);

    // Record end time
    timeEnd = performance.now();
    totalTime = ((timeEnd - timeStart) / 1000).toFixed(2);

    // Show end level screen with time
    endLevelScore.textContent = `Time: ${totalTime}s`;
    showScreen(endLevelScreen);
}

// Handle Circle Clicks
gameCanvas.addEventListener('click', (e) => {
    const rect = gameCanvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let clicked = false;

    for (let i = 0; i < activeCircles.length; i++) {
        const circle = activeCircles[i];
        if (circle.isClicked(clickX, clickY)) {
            // Play pop animation and sound
            animatePop(circle);
            playPopSound();

            // Remove clicked circle
            activeCircles.splice(i, 1);
            circlesPopped++;
            clickCount++;

            // Add a new circle if any remain
            if (circlesPopped < totalCircles) {
                addNewCircle();
            } else {
                // All circles popped, end game
                endGame();
            }

            clicked = true;
            break;
        }
    }

    if (!clicked) {
        // Missed click
        circlesMissed++;
        // Apply penalty
        totalTime = (parseFloat(totalTime) + 0.05).toFixed(2);
        playMissSound();
    }
});

// Add New Circle to Active Circles
function addNewCircle() {
    if (circles.length === 0) return;
    const randomIndex = Math.floor(Math.random() * circles.length);
    const circle = circles.splice(randomIndex, 1)[0];
    activeCircles.push(circle);
    circle.draw();
}

// Animation Function
function animatePop(circle) {
    // Example simple pop animation: scaling up and fading out
    const duration = 300; // in ms
    const start = performance.now();

    function animateFrame(time) {
        const elapsed = time - start;
        const progress = Math.min(elapsed / duration, 1);
        const scale = 1 + progress; // Scale from 1 to 2
        const opacity = 1 - progress; // Fade from 1 to 0

        ctx.clearRect(circle.x - circle.radius - 2, circle.y - circle.radius - 2, circle.radius * 2 + 4, circle.radius * 2 + 4);

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(circle.x, circle.y);
        ctx.scale(scale, scale);
        ctx.beginPath();
        ctx.arc(0, 0, circle.radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#FF5722'; // Different color for animation
        ctx.fill();
        ctx.closePath();
        ctx.restore();

        if (progress < 1) {
            requestAnimationFrame(animateFrame);
        } else {
            // Clear the area after animation
            ctx.clearRect(circle.x - circle.radius - 2, circle.y - circle.radius - 2, circle.radius * 2 + 4, circle.radius * 2 + 4);
        }
    }

    requestAnimationFrame(animateFrame);
}

// Sound Functions
function playPopSound() {
    const popSound = new Audio('assets/sounds/pop.mp3'); // Ensure the path is correct
    popSound.play().catch(error => {
        console.error('Error playing pop sound:', error);
    });
}

function playMissSound() {
    const missSound = new Audio('assets/sounds/miss.mp3'); // Ensure the path is correct
    missSound.play().catch(error => {
        console.error('Error playing miss sound:', error);
    });
}

// Initialize Rules Modal
rulesButton.addEventListener('click', () => {
    rulesModal.style.display = 'flex';
});

closeRulesButton.addEventListener('click', () => {
    rulesModal.style.display = 'none';
});

// Handle Name Submission
nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const playerName = playerNameInput.value.trim();
    if (playerName === '') return;

    // Push score to Firebase via separate firebase-config.js
    pushScore(currentLevel, {
        name: playerName,
        time: parseFloat(totalTime),
        clicks: clickCount,
        missedClicks: circlesMissed
    })
        .then(() => {
            console.log('Score submitted successfully.');
            // Optionally, show a success message
            alert('Score submitted successfully!');
            // Reset form
            nameForm.reset();
            // Proceed to next level or show leaderboard
            if (currentLevel < totalLevels) {
                showPreNextLevelScreen();
            } else {
                // Game completed
                showGameCompletedScreen();
            }
        })
        .catch((error) => {
            console.error('Error submitting score:', error);
            alert('Error submitting score. Please try again.');
        });
});

// Show Pre Next Level Screen
function showPreNextLevelScreen() {
    // Display leaderboard for the next level
    displayLeaderboard(currentLevel + 1, preLeaderboardBody);
    showScreen(preNextLevelScreen);
}

// Handle Play Next Level
playNextLevelButton.addEventListener('click', () => {
    currentLevel++;
    totalCircles += 5;
    showScreen(leaderboardScreen);
    initializeLeaderboard();
});

// Handle Reset Game
resetGameButton.addEventListener('click', () => {
    showConfirmationDialog('Are you sure you want to reset the game?', () => {
        resetGame();
    });
});

// Show Confirmation Dialog
function showConfirmationDialog(message, callback) {
    confirmationMessage.textContent = message;
    confirmationDialog.style.display = 'flex';

    // Remove existing event listeners to prevent multiple triggers
    confirmYesButton.replaceWith(confirmYesButton.cloneNode(true));
    confirmNoButton.replaceWith(confirmNoButton.cloneNode(true));

    // Re-select buttons after cloning
    const newConfirmYesButton = document.getElementById('confirmYesButton');
    const newConfirmNoButton = document.getElementById('confirmNoButton');

    newConfirmYesButton.addEventListener('click', () => {
        confirmationDialog.style.display = 'none';
        callback();
    });

    newConfirmNoButton.addEventListener('click', () => {
        confirmationDialog.style.display = 'none';
    });
}

// Reset Game Function
function resetGame() {
    console.log('Resetting game...'); // Debugging
    currentLevel = 1;
    totalCircles = 10;
    circles = [];
    activeCircles = [];
    circlesPopped = 0;
    circlesMissed = 0;
    clickCount = 0;
    totalTime = 0.00;

    // Clear all active circles
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    // Show initial leaderboard screen
    showScreen(leaderboardScreen);
    initializeLeaderboard();
}

// Show Game Completed Screen (After Level 10)
function showGameCompletedScreen() {
    // Implement a separate screen or message indicating game completion
    alert('Congratulations! You have completed all levels.');
    // Reset game or provide options as needed
    resetGame();
}

// Initialize Leaderboard on Page Load
initializeLeaderboard();

// Handle Start Game Button Click
startGameButton.addEventListener('click', () => {
    console.log('Start Game Button Clicked'); // Debugging
    startGame();
});

// Prevent default touch behavior for better responsiveness
gameCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const clickX = touch.clientX;
    const clickY = touch.clientY;

    let clicked = false;

    for (let i = 0; i < activeCircles.length; i++) {
        const circle = activeCircles[i];
        if (circle.isClicked(clickX, clickY)) {
            // Play pop animation and sound
            animatePop(circle);
            playPopSound();

            // Remove clicked circle
            activeCircles.splice(i, 1);
            circlesPopped++;
            clickCount++;

            // Add a new circle if any remain
            if (circlesPopped < totalCircles) {
                addNewCircle();
            } else {
                // All circles popped, end game
                endGame();
            }

            clicked = true;
            break;
        }
    }

    if (!clicked) {
        // Missed click
        circlesMissed++;
        // Apply penalty
        totalTime = (parseFloat(totalTime) + 0.05).toFixed(2);
        playMissSound();
    }
}, { passive: false });
