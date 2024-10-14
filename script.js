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
const resetScoreButton = document.getElementById('resetScoreButton');
const rulesModal = document.getElementById('rulesModal');
const closeRulesButton = document.getElementById('closeRulesButton');
const gameScreen = document.getElementById('gameScreen');
const gameCanvas = document.getElementById('gameCanvas');
const endGameScreen = document.getElementById('endGameScreen');
const endGameTime = document.getElementById('endGameTime');
const endGamePenalty = document.getElementById('endGamePenalty');
const nameForm = document.getElementById('nameForm');
const playerNameInput = document.getElementById('playerName');
const skipButton = document.getElementById('skipButton');
const tryAgainButton = document.getElementById('tryAgainButton');
const timerDisplay = document.getElementById('timer');
const endGameLeaderboardBody = document.getElementById('endGameLeaderboardBody');
const themeToggleButton = document.getElementById('themeToggle');

// Initialize Game Context
const ctx = gameCanvas.getContext('2d');

// Game Variables
let totalCircles = 20;
let circlesDiameter = calculateCircleDiameter();
let circlesPopped = 0;
let circlesMissed = 0;
let clickCount = 0;
let timeStart = null;
let gameTimer = null;
let actualTime = 0.00;
let finalTime = 0.00;
let totalPenalty = 0.0;

let currentCount = 20;

let activeCircle = null;
let isAnimating = false;

let lastInteractionTime = 0;
const debounceDuration = 150;

// Theme Management
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    } else {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }

    // Update the game title image based on the current theme
    updateGameTitleImage();
}

// Event listener for the theme toggle button
themeToggleButton.addEventListener('click', () => {
    let currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        applyTheme('light');
    } else {
        applyTheme('dark');
    }
});

// On page load, apply the saved theme or system preference
let savedTheme = localStorage.getItem('theme');
applyTheme(savedTheme);

// Function to update the game title image
function updateGameTitleImage() {
    const gameTitleImage = document.getElementById('gameTitle');
    const gameTitleEndImage = document.getElementById('gameTitleEnd');
    const currentTheme = document.documentElement.getAttribute('data-theme');

    if (currentTheme === 'dark') {
        if (gameTitleImage) gameTitleImage.src = 'assets/images/PopixMobileDark.jpg';
        if (gameTitleEndImage) gameTitleEndImage.src = 'assets/images/PopixMobileDark.jpg';
    } else {
        if (gameTitleImage) gameTitleImage.src = 'assets/images/PopixMobile.jpg';
        if (gameTitleEndImage) gameTitleEndImage.src = 'assets/images/PopixMobile.jpg';
    }
}

// Function to calculate circle diameter based on screen size
function calculateCircleDiameter() {
    const minDimension = Math.min(window.innerWidth, window.innerHeight);
    return Math.floor(minDimension * 0.2); // 20% of the smaller screen dimension
}

// Set Canvas Size to Fill Screen and Calculate Circle Size
function resizeCanvas() {
    gameCanvas.width = window.innerWidth;
    gameCanvas.height = window.innerHeight;

    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    // Recalculate circle diameter
    circlesDiameter = calculateCircleDiameter();

    if (activeCircle) {
        activeCircle.draw();
    }
}

// Initial Resize
resizeCanvas();

// Listen for window resize and orientation change
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);

// Circle Class
class Circle {
    constructor(x, y, count) {
        this.x = x;
        this.y = y;
        this.radius = circlesDiameter / 2;
        this.count = count;
    }

    draw() {
        // Determine theme
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

        // Draw the circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = isDarkMode ? '#ffffff' : '#000000'; // White in dark mode, black in light mode
        ctx.fill();
        ctx.closePath();

        // Draw the countdown number
        ctx.fillStyle = isDarkMode ? '#000000' : '#FFFFFF'; // Black text in dark mode, white in light mode
        ctx.font = `${this.radius}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.count, this.x, this.y);
    }

    isClicked(clickX, clickY) {
        const distance = Math.hypot(clickX - this.x, clickY - this.y);
        return distance <= this.radius;
    }
}

// Utility Functions
function getRandomPosition() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const padding = circlesDiameter / 2 + 10;
    let x, y;
    let attempts = 0;
    const maxAttempts = 100;

    do {
        x = Math.random() * (screenWidth - 2 * padding) + padding;
        y = Math.random() * (screenHeight - 2 * padding) + padding;
        attempts++;
        if (attempts > maxAttempts) {
            console.warn('Max attempts reached. Placing circle without full spacing.');
            break;
        }
    } while (activeCircle && Math.hypot(x - activeCircle.x, y - activeCircle.y) < 2 * circlesDiameter + 20);

    return { x, y };
}

function createCircle() {
    const pos = getRandomPosition();
    const circle = new Circle(pos.x, pos.y, currentCount);
    activeCircle = circle;
    circle.draw();

    // Log the position and count of the active circle for debugging
    console.log(`New Circle: (x: ${circle.x}, y: ${circle.y}), Count: ${circle.count}`);
}

function showScreen(screen) {
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });

    // Show the selected screen
    screen.classList.add('active');
    screen.style.display = 'flex';

    // Manage Timer Visibility
    if (screen === gameScreen) {
        timerDisplay.style.display = 'block'; // Show timer during game
    } else {
        timerDisplay.style.display = 'none'; // Hide timer on other screens
    }
}

function displayLeaderboard(leaderboardBodyElement, currentEntryPenalty = null, finalTime = null, callback = null) {
    getLeaderboard((entries) => {
        // Initialize an array to hold all entries including the current player's
        let allEntries = entries ? [...entries] : [];

        // If currentEntryPenalty and finalTime are provided, add the current player's entry
        if (currentEntryPenalty !== null && finalTime !== null) {
            allEntries.push({
                name: 'You',
                time: parseFloat(finalTime),
                clicks: clickCount,
                missedClicks: circlesMissed
            });
        }

        // Sort all entries by time ascending
        allEntries.sort((a, b) => a.time - b.time);

        // Update the leaderboard body
        leaderboardBodyElement.innerHTML = ''; // Clear existing entries

        // Determine if 'You' are within top 5
        let isInTop5 = false;

        if (allEntries.length > 0) {
            // Display top 5
            allEntries.slice(0, 5).forEach((entry, index) => {
                const row = document.createElement('tr');

                // Rank Cell
                const rankCell = document.createElement('td');
                rankCell.textContent = index + 1;
                row.appendChild(rankCell);

                // Name Cell with Cake and French Flag Emojis for "Guihlem"
                const nameCell = document.createElement('td');
                if (entry.name === 'Cake') {
                    nameCell.textContent = `${entry.name} 🧁🇫🇷`;
                } else {
                    nameCell.textContent = entry.name;
                }
                row.appendChild(nameCell);

                // Time Cell
                const timeCell = document.createElement('td');
                timeCell.textContent = entry.time.toFixed(2);
                row.appendChild(timeCell);

                // Penalty Cell
                const penaltyCell = document.createElement('td');
                const penaltyTime = (entry.missedClicks * 0.5).toFixed(1); // Calculate penalty
                penaltyCell.textContent = penaltyTime > 0 ? `+${penaltyTime}s` : `${penaltyTime}s`;

                // Apply red color if penalty > 0
                if (penaltyTime > 0) {
                    penaltyCell.classList.add('penalty');
                }

                row.appendChild(penaltyCell);

                leaderboardBodyElement.appendChild(row);

                // Check if this entry is 'You'
                if (entry.name === 'You') {
                    if (index < 5) {
                        isInTop5 = true;
                    }
                }
            });
        } else {
            // No entries yet
            const row = document.createElement('tr');
            const noDataCell = document.createElement('td');
            noDataCell.colSpan = 4;
            noDataCell.textContent = 'No entries yet.';
            noDataCell.style.textAlign = 'center';
            row.appendChild(noDataCell);
            leaderboardBodyElement.appendChild(row);
        }

        // Execute callback with isInTop5
        if (callback && typeof callback === 'function') {
            callback(isInTop5);
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
    actualTime = 0.00;
    finalTime = 0.00;
    totalPenalty = 0.0;

    currentCount = totalCircles; // Reset countdown to totalCircles

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
        actualTime = ((now - timeStart) / 1000).toFixed(2); // in seconds with two decimals
        if (timerDisplay) {
            timerDisplay.textContent = `Time: ${actualTime}s`;
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
    actualTime = ((timeEnd - timeStart) / 1000); // in seconds

    // Calculate total penalty
    totalPenalty = (circlesMissed * 0.5).toFixed(1); // 0.5s per miss

    // Calculate final time
    finalTime = (actualTime + parseFloat(totalPenalty)).toFixed(2);

    // Show end game screen with time and penalty
    endGameTime.textContent = `Your Time: ${actualTime.toFixed(2)}s`;

    if (circlesMissed > 0) {
        endGamePenalty.textContent = `Penalty: +${totalPenalty}s`;
    } else {
        endGamePenalty.textContent = ''; // Hide penalty if none
    }

    // Display leaderboard on end game screen with current entry penalty and final time
    displayLeaderboard(endGameLeaderboardBody, totalPenalty, finalTime, (isInTop5) => {
        if (isInTop5) {
            // Show form and skip button
            nameForm.style.display = 'block';
            skipButton.style.display = 'block';
            tryAgainButton.style.display = 'none';
        } else {
            // Show try again button, hide form and skip button
            nameForm.style.display = 'none';
            skipButton.style.display = 'none';
            tryAgainButton.style.display = 'block';
        }
    });

    // Show end game screen
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

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

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
        // Do NOT apply penalty to running timer
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

// Reverted Animation Function
function animatePop(circle) {
    isAnimating = true; // Set flag to indicate animation is in progress
    const duration = 100; // in ms
    const start = performance.now();

    // Define the maximum scale factor
    const maxScale = 1.5; // Scale up to 1.5 times

    // Store initial circle properties
    const initialX = circle.x;
    const initialY = circle.y;
    const initialRadius = circle.radius;

    // Animation Loop
    function animateFrame(time) {
        const elapsed = time - start;
        let progress = Math.min(elapsed / duration, 1);

        // Apply an easing function for a smoother animation (easeOutQuad)
        progress = easeOutQuad(progress);

        const scale = 1 + progress * (maxScale - 1); // Scale up
        const opacity = 1 - progress; // Fade out

        // Calculate the scaled radius
        const scaledRadius = initialRadius * scale;

        // Clear the canvas
        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

        // Draw the scaled circle
        ctx.beginPath();
        ctx.arc(initialX, initialY, scaledRadius, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(255, 87, 34, ${opacity})`; // #FF5722 with dynamic opacity
        ctx.fill();
        ctx.closePath();

        if (progress < 1) {
            requestAnimationFrame(animateFrame);
        } else {
            // Final clear to remove any residual artifacts
            ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

            // Reset activeCircle and proceed
            circlesPopped++;
            activeCircle = null;

            if (circlesPopped < totalCircles) {
                currentCount--;
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
        time: parseFloat(finalTime), // Use finalTime from endGame
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

// Handle Try Again Button
tryAgainButton.addEventListener('click', () => {
    console.log('Try Again Button Clicked'); // Debugging
    startGame();
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
