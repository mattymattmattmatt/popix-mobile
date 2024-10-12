// script.js

import { pushScore, getLeaderboard, resetLeaderboard } from './firebase-config.js';
import { SoundManager } from './soundManager.js';

// Initialize SoundManager
const soundManager = new SoundManager();

// DOM Elements
const leaderboardScreen = document.getElementById('leaderboardScreen');
const leaderboardBody = document.getElementById('leaderboardBody');
const startGameButton = document.getElementById('startGameButton');
const rulesButton = document.getElementById('rulesButton');
const resetScoreButton = document.getElementById('resetScoreButton'); // New Reset Score Button
const rulesModal = document.getElementById('rulesModal');
const closeRulesButton = document.getElementById('closeRulesButton');
const gameScreen = document.getElementById('gameScreen');
const gameCanvas = document.getElementById('gameCanvas');
const endGameScreen = document.getElementById('endGameScreen');
const endGameScore = document.getElementById('endGameScore');
const nameForm = document.getElementById('nameForm');
const playerNameInput = document.getElementById('playerName');
const skipButton = document.getElementById('skipButton');
const timerDisplay = document.getElementById('timer');
const endGameLeaderboardBody = document.getElementById('endGameLeaderboardBody');

const ctx = gameCanvas.getContext('2d');

// Game Variables
let totalCircles = 10; // Total number of circles to pop
let circlesDiameter = 75; // Diameter of each circle in px
let circlesPopped = 0;
let circlesMissed = 0;
let clickCount = 0;
let timeStart = null;
let gameTimer = null;
let totalTime = 0.00; // in seconds

// Game State
let activeCircle = null; // Only one active circle at a time
let isAnimating = false; // Flag to indicate if an animation is in progress

// Debounce Variables
let lastInteractionTime = 0;
const debounceDuration = 150; // in ms

// Set Canvas Size to Fill Screen
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    gameCanvas.style.width = `${displayWidth}px`;
    gameCanvas.style.height = `${displayHeight}px`;

    gameCanvas.width = displayWidth * dpr;
    gameCanvas.height = displayHeight * dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    if (activeCircle) {
        activeCircle.draw();
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Call resizeCanvas on initial load

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
        ctx.fillStyle = '#000000'; // Black color
        ctx.fill();
        ctx.closePath();
    }

    isClicked(clickX, clickY) {
        const distance = Math.hypot(clickX - this.x, clickY - this.y);
        return distance <= this.radius;
    }
}

// Utility Functions
function getRandomPosition() {
    const padding = circlesDiameter;
    let x, y;
    let attempts = 0;
    const maxAttempts = 100;

    do {
        x = Math.random() * (gameCanvas.width / (window.devicePixelRatio || 1) - 2 * padding) + padding;
        y = Math.random() * (gameCanvas.height / (window.devicePixelRatio || 1) - 2 * padding) + padding;
        attempts++;
        if (attempts > maxAttempts) {
            console.warn('Max attempts reached. Placing circle without full spacing.');
            break; // Prevent infinite loop; place the circle anyway
        }
    } while (activeCircle && Math.hypot(x - activeCircle.x, y - activeCircle.y) < 2 * circlesDiameter + 20); // Ensures sufficient spacing

    return { x, y };
}

function createCircle() {
    const pos = getRandomPosition();
    const circle = new Circle(pos.x, pos.y);
    activeCircle = circle;
    circle.draw();

    // Log the position of the active circle for debugging
    console.log(`New Circle: (x: ${circle.x}, y: ${circle.y})`);
}

function showScreen(screen) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    // Show the selected screen
    screen.classList.add('active');
}

function displayLeaderboard(leaderboardBodyElement) {
    getLeaderboard((entries) => {
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
            noDataCell.colSpan = 5;
            noDataCell.textContent = 'No entries yet.';
            noDataCell.style.textAlign = 'center';
            row.appendChild(noDataCell);
            leaderboardBodyElement.appendChild(row);
        }
    });
}

// Initialize Leaderboard Screen
function initializeLeaderboard() {
    displayLeaderboard(leaderboardBody);
}

// Start Game Function
function startGame() {
    console.log('Starting game...'); // Debugging
    // Reset game variables
    circlesPopped = 0;
    circlesMissed = 0;
    clickCount = 0;
    totalTime = 0.00;

    // Clear active circle
    activeCircle = null;

    // Show game screen
    showScreen(gameScreen);

    // Clear any existing drawings
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    // Start the timer
    timeStart = performance.now();
    gameTimer = setInterval(() => {
        const now = performance.now();
        totalTime = ((now - timeStart) / 1000).toFixed(2); // in seconds with two decimals
        if (timerDisplay) {
            timerDisplay.textContent = `Time: ${totalTime}s`;
        }
    }, 10); // Update every 10ms for higher precision

    // Display the first circle
    createCircle();
}

// End Game Function
function endGame() {
    console.log('Ending game...'); // Debugging
    clearInterval(gameTimer);

    // Record end time
    const timeEnd = performance.now();
    totalTime = ((timeEnd - timeStart) / 1000).toFixed(2);

    // Show end game screen with time and leaderboard
    endGameScore.textContent = `Your Time: ${totalTime}s`;

    // Display leaderboard on end game screen
    displayLeaderboard(endGameLeaderboardBody);

    showScreen(endGameScreen);
}

// Handle Pointer Events (Unified for Mouse and Touch)
function handlePointerDown(e) {
    // Debounce to prevent rapid interactions
    const currentTime = Date.now();
    if (currentTime - lastInteractionTime < debounceDuration) {
        return; // Ignore this interaction
    }
    lastInteractionTime = currentTime;

    if (isAnimating) return; // Prevent interactions during animation

    // Calculate click/touch coordinates
    const rect = gameCanvas.getBoundingClientRect();
    const scaleX = gameCanvas.width / rect.width;
    const scaleY = gameCanvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX / (window.devicePixelRatio || 1);
    const clickY = (e.clientY - rect.top) * scaleY / (window.devicePixelRatio || 1);

    if (activeCircle && activeCircle.isClicked(clickX, clickY)) {
        // Vibrate on successful pop
        vibrate();
        // Play pop animation and sound
        animatePop(activeCircle);
        playPopSound();
        // Increment click count
        clickCount++;
    } else {
        // Missed click
        circlesMissed++;
        // Apply penalty
        totalTime = (parseFloat(totalTime) + 0.05).toFixed(2);
        if (timerDisplay) {
            timerDisplay.textContent = `Time: ${totalTime}s`;
        }
        playMissSound();
    }
}

// Add Pointer Event Listener with Touch Point Restriction
gameCanvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && e.isPrimary === false) {
        return; // Ignore non-primary touch points
    }
    handlePointerDown(e);
});

// Animation Function
function animatePop(circle) {
    isAnimating = true; // Set flag to indicate animation is in progress
    const duration = 50; // in ms
    const start = performance.now();

    // Define the maximum scale factor
    const maxScale = 2; // Scale up to twice the size

    // Animation Loop
    function animateFrame(time) {
        const elapsed = time - start;
        let progress = Math.min(elapsed / duration, 1);

        // Apply an easing function for a smoother animation (easeOutQuad)
        progress = easeOutQuad(progress);

        const scale = 1 + progress * (maxScale - 1); // Linear scaling with easing
        const opacity = 1 - progress; // Fade out

        // Calculate the scaled radius
        const scaledRadius = circle.radius * scale;

        // Calculate the bounding box
        const clearX = circle.x - scaledRadius;
        const clearY = circle.y - scaledRadius;
        const clearSize = scaledRadius * 2;

        // Clear the area occupied by the animated circle
        ctx.clearRect(clearX, clearY, clearSize, clearSize);

        // Draw the animated circle with scaled radius and decreasing opacity
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, scaledRadius, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(255, 87, 34, ${opacity})`; // #FF5722 with dynamic opacity
        ctx.fill();
        ctx.closePath();

        // Draw the flash effect during the first 30% of the animation
        if (elapsed < duration * 0.3) { // Flash occurs during the first 30% of the animation
            const flashProgress = elapsed / (duration * 0.3);
            const flashOpacity = 0.7 * (1 - flashProgress); // Fade out the flash
            ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`; // Semi-transparent white
            ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
        }

        // Optional: Brief color change before popping
        if (elapsed === 0) {
            ctx.beginPath();
            ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
            ctx.fillStyle = '#FF9800'; // Change to a lighter orange
            ctx.fill();
            ctx.closePath();
        }

        if (progress < 1) {
            requestAnimationFrame(animateFrame);
        } else {
            // Final clear to remove any residual artifacts
            ctx.clearRect(clearX, clearY, clearSize, clearSize);

            // Reset activeCircle and spawn next circle or end game
            circlesPopped++;
            activeCircle = null;

            if (circlesPopped < totalCircles) {
                createCircle();
            } else {
                endGame();
            }

            isAnimating = false; // Reset animation flag
        }
    }

    requestAnimationFrame(animateFrame);
}

// Easing Function (easeOutQuad)
function easeOutQuad(t) {
    return t * (2 - t);
}

// Sound Functions (Using SoundManager)
function playPopSound() {
    soundManager.playSound('pop');
}

function playMissSound() {
    soundManager.playSound('miss');
}

// Vibration Feedback
function vibrate() {
    if (navigator.vibrate) {
        navigator.vibrate(100); // Vibrate for 100ms
    }
}

// Initialize Rules Modal
rulesButton.addEventListener('click', () => {
    rulesModal.style.display = 'flex';
});

closeRulesButton.addEventListener('click', () => {
    rulesModal.style.display = 'none';
});

// Close Modal When Clicking Outside the Modal Content
window.addEventListener('click', (event) => {
    if (event.target == rulesModal) {
        rulesModal.style.display = 'none';
    }
});

// Handle Name Submission
nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const playerName = playerNameInput.value.trim();
    if (playerName === '') return;

    // Push score to Firebase via separate firebase-config.js
    pushScore({
        name: playerName,
        time: parseFloat(totalTime),
        clicks: clickCount,
        missedClicks: circlesMissed
    })
        .then(() => {
            console.log('Score submitted successfully.');
            // Reset form
            nameForm.reset();
            // Display the leaderboard
            initializeLeaderboard();
            // Return to initial screen
            showScreen(leaderboardScreen);
        })
        .catch((error) => {
            console.error('Error submitting score:', error);
            alert('Error submitting score. Please try again.');
        });
});

// Handle Skip Button
skipButton.addEventListener('click', () => {
    console.log('Skip Button Clicked'); // Debugging
    // Display the leaderboard
    initializeLeaderboard();
    // Return to initial screen
    showScreen(leaderboardScreen);
});

// Handle Reset Score Button
resetScoreButton.addEventListener('click', () => {
    const password = prompt('Enter the password to reset the leaderboard:');
    if (password === null) {
        // User cancelled the prompt
        return;
    }
    if (password === 'ban00bles') {
        const confirmation = confirm('Are you sure you want to reset the leaderboard? This action cannot be undone.');
        if (confirmation) {
            resetLeaderboard()
                .then(() => {
                    alert('Leaderboard has been reset successfully.');
                    initializeLeaderboard();
                })
                .catch((error) => {
                    console.error('Error resetting leaderboard:', error);
                    alert('An error occurred while resetting the leaderboard. Please try again.');
                });
        }
    } else {
        alert('Incorrect password. Leaderboard reset denied.');
    }
});

// Initialize Leaderboard on Page Load
initializeLeaderboard();

// Handle Start Game Button Click
startGameButton.addEventListener('click', () => {
    console.log('Start Game Button Clicked'); // Debugging
    startGame();
});
