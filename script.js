// script.js

import { pushScore, getLeaderboard, resetLeaderboard } from './firebase-config.js';
import { SoundManager } from './soundManager.js';

// Initialize SoundManager
const soundManager = new SoundManager();

// Preload Theme Images
function preloadImages(imageArray) {
    imageArray.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// Preload theme images early
preloadImages([
    'assets/images/PopixMobile.jpg',
    'assets/images/PopixMobileDark.jpg'
]);

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
const themeIcon = document.getElementById('themeIcon'); // Icon Element

// Initialize Game Context
const ctx = gameCanvas.getContext('2d');

// Precompute device pixel ratio
const dpr = window.devicePixelRatio || 1;

// Game Variables
let totalCircles = 20;
let circlesDiameter = calculateCircleDiameter();
let circlesPopped = 0;
let circlesMissed = 0;
let clickCount = 0;
let timeStart = null;
let actualTime = 0.00;
let finalTime = 0.00;
let totalPenalty = 0.0;

let currentCount = totalCircles;

let activeCircle = null;

// Flashing Effect Variables
let isFlashing = false;
let flashEndTime = 0;
const flashDuration = 100; // in milliseconds
let lastFlashCircle = null;

// Track the Previous Circle
let previousCircle = null;

// Debounce Control
let isProcessingClick = false;

// Theme Management
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }

    // Update the game title image based on the current theme
    updateGameTitleImage();

    // Update the theme icon
    const currentTheme = document.documentElement.getAttribute('data-theme');
    updateThemeIcon(currentTheme);
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

// Function to update the theme icon
function updateThemeIcon(theme) {
    if (theme === 'dark') {
        themeIcon.textContent = '🌙'; // Moon icon for dark mode
        themeIcon.setAttribute('aria-label', 'Switch to Light Mode');
    } else {
        themeIcon.textContent = '☀️'; // Sun icon for light mode
        themeIcon.setAttribute('aria-label', 'Switch to Dark Mode');
    }
}

// On page load, apply the saved theme or system preference
let savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    applyTheme(savedTheme);
} else {
    // Detect system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }
}

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
    // Set circle diameter to 15% of the smaller screen dimension
    return Math.floor(minDimension * 0.15);
}

// Set Canvas Size to Fill Screen and Calculate Circle Size
function resizeCanvas() {
    // Get the computed styles of the canvas
    const computedStyle = getComputedStyle(gameCanvas);
    
    // Extract width and height from CSS (e.g., '90vw' -> 0.9 * viewport width)
    const width = parseFloat(computedStyle.width);
    const height = parseFloat(computedStyle.height);
    
    // Limit resolution for performance
    const limitedWidth = Math.min(width, 1080);
    const limitedHeight = Math.min(height, 1920);

    // Set the canvas's internal size based on CSS dimensions and device pixel ratio
    gameCanvas.width = limitedWidth * dpr;
    gameCanvas.height = limitedHeight * dpr;
    
    // Scale the context to account for device pixel ratio
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    
    // Clear the canvas
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    // Recalculate circle diameter based on new screen size
    circlesDiameter = calculateCircleDiameter();
    
    // Redraw the active circle if it exists
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
        const styles = getComputedStyle(document.documentElement);
        const circleColor = styles.getPropertyValue('--circle-color').trim();
        const textColor = styles.getPropertyValue('--circle-text-color').trim();

        // Draw the circle
        ctx.fillStyle = circleColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();

        // Draw the countdown number
        ctx.fillStyle = textColor;
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
    const padding = circlesDiameter / 2 + 20; // Increased padding to prevent edge spawning
    const canvasWidth = gameCanvas.width / dpr;
    const canvasHeight = gameCanvas.height / dpr;

    // Limit the number of attempts to prevent delays
    const maxAttempts = 50;
    let attempts = 0;

    while (attempts < maxAttempts) {
        const x = Math.random() * (canvasWidth - 2 * padding) + padding;
        const y = Math.random() * (canvasHeight - 2 * padding) + padding;

        if (previousCircle) {
            const distance = Math.hypot(x - previousCircle.x, y - previousCircle.y);
            if (distance >= circlesDiameter) { // Ensure at least two radii apart
                return { x, y };
            }
        } else {
            return { x, y };
        }

        attempts++;
    }

    // If a non-overlapping position isn't found after maxAttempts, return a random position
    console.warn('Max attempts reached. Overlapping may occur.');
    return { 
        x: Math.random() * (canvasWidth - 2 * padding) + padding, 
        y: Math.random() * (canvasHeight - 2 * padding) + padding 
    };
}

function createCircle() {
    const pos = getRandomPosition();
    const circle = new Circle(pos.x, pos.y, currentCount);
    activeCircle = circle;
    circle.draw();

    // Store the current circle as the previous circle for the next spawn
    previousCircle = circle;
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

                // Name Cell
                const nameCell = document.createElement('td');

                if (index === 0) {
                    // For Rank 1: Add a gold medal emoji and apply the 'top-rank' class
                    nameCell.innerHTML = `<strong>${entry.name} 🥇</strong>`;
                    nameCell.classList.add('top-rank');
                } else if (entry.name === 'Cake') {
                    // Existing logic for 'Cake'
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

                // Apply penalty class for styling
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

// Rendering Loop for Game
function render(currentTime) {
    if (!timeStart) timeStart = currentTime;
    const elapsedTime = (currentTime - timeStart) / 1000;
    actualTime = elapsedTime.toFixed(2);
    if (timerDisplay) {
        timerDisplay.textContent = `Time: ${actualTime}s`;
    }

    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    // Handle Flashing Effect
    if (isFlashing && lastFlashCircle) {
        if (currentTime < flashEndTime) {
            // Flash color
            ctx.fillStyle = '#FFD700'; // Gold color
            ctx.beginPath();
            ctx.arc(lastFlashCircle.x, lastFlashCircle.y, lastFlashCircle.radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.closePath();

            // Flash text color
            ctx.fillStyle = '#000000'; // Black text
            ctx.font = `${lastFlashCircle.radius}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(lastFlashCircle.count, lastFlashCircle.x, lastFlashCircle.y);
        } else {
            isFlashing = false; // Reset flashing state
            lastFlashCircle = null;
        }
    }

    // Draw Active Circle
    if (activeCircle) {
        activeCircle.draw();
    }

    requestAnimationFrame(render);
}

// Start the rendering loop
requestAnimationFrame(render);

// Start Game Function
function startGame() {
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

    // Start the timer by resetting timeStart
    timeStart = null;

    // Display the first circle
    createCircle();
}

// End Game Function
function endGame() {
    // Record end time by capturing the currentTime from the render loop
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
    // Prevent multiple simultaneous clicks
    if (isProcessingClick) return;
    isProcessingClick = true;

    // Calculate click/touch coordinates
    const rect = gameCanvas.getBoundingClientRect();
    const scaleX = gameCanvas.width / rect.width;
    const scaleY = gameCanvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX / dpr;
    const clickY = (e.clientY - rect.top) * scaleY / dpr;

    if (activeCircle && activeCircle.isClicked(clickX, clickY)) {
        // Play pop sound
        playPopSound();
        // Trigger vibration for successful pop
        vibrate(); // <--- Vibration Triggered Here
        // Increment click count
        clickCount++;

        // Initiate flash
        isFlashing = true;
        flashEndTime = performance.now() + flashDuration;

        // Store the last flashed circle
        lastFlashCircle = { ...activeCircle };

        // Remove the circle instantly
        activeCircle = null;
        circlesPopped++;

        if (circlesPopped < totalCircles) {
            currentCount--; // Decrement the countdown
            // Create the next circle
            createCircle();
        } else {
            endGame();
        }
    } else {
        // Missed click
        circlesMissed++;
        // Play miss sound
        playMissSound();
    }

    // Reset the flag after processing
    setTimeout(() => {
        isProcessingClick = false;
    }, 100); // Adjust timeout as needed
}

// Add Pointer Event Listener with Touch Point Restriction
gameCanvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && e.isPrimary === false) {
        return; // Ignore non-primary touch points
    }
    handlePointerDown(e);
}, { passive: false });

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
    // Display the leaderboard
    initializeLeaderboard();
    // Return to initial screen
    showScreen(leaderboardScreen);
});

// Handle Try Again Button
tryAgainButton.addEventListener('click', () => {
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
    startGame();
});
