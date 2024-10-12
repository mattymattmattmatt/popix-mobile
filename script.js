// script.js

import { pushScore, getLeaderboard } from './firebase-config.js'; // Ensure this path is correct

// DOM Elements
const leaderboardScreen = document.getElementById('leaderboardScreen');
const leaderboardBody = document.getElementById('leaderboardBody');
const startGameButton = document.getElementById('startGameButton');
const rulesButton = document.getElementById('rulesButton');
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
let totalCircles = 10; // Total number of circles
let circlesDiameter = 500;
let circlesPopped = 0;
let circlesMissed = 0;
let clickCount = 0;
let timeStart = null;
let gameTimer = null;
let totalTime = 0.00; // in seconds

// Game State
let circles = [];
let activeCircles = []; // Currently displayed circles

// Set Canvas Size to Fill Screen
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    gameCanvas.width = window.innerWidth * dpr;
    gameCanvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    // Clear the canvas
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    // Redraw active circles on resize
    activeCircles.forEach(circle => circle.draw());
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Call resizeCanvas after activeCircles is declared

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
        if (attempts > maxAttempts) break; // Prevent infinite loop
    } while (activeCircles.some(circle => {
        const distance = Math.hypot(x - circle.x, y - circle.y);
        return distance < circlesDiameter; // Ensure at least one diameter spacing
    }));

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
        if (timerDisplay) {
            timerDisplay.textContent = `Time: ${totalTime}s`;
        }
    }, 10); // Update every 10ms for higher precision

    // Display initial 2 circles
    addNewCircle();
    addNewCircle();
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

// Handle Circle Clicks
function handleClick(e) {
    const rect = gameCanvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (gameCanvas.width / rect.width) / (window.devicePixelRatio || 1);
    const clickY = (e.clientY - rect.top) * (gameCanvas.height / rect.height) / (window.devicePixelRatio || 1);

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
        if (timerDisplay) {
            timerDisplay.textContent = `Time: ${totalTime}s`;
        }
        playMissSound();
    }
}

gameCanvas.addEventListener('click', handleClick);

// Handle Touch Events
function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = gameCanvas.getBoundingClientRect();
    const clickX = (touch.clientX - rect.left) * (gameCanvas.width / rect.width) / (window.devicePixelRatio || 1);
    const clickY = (touch.clientY - rect.top) * (gameCanvas.height / rect.height) / (window.devicePixelRatio || 1);

    handleClick({ clientX: touch.clientX, clientY: touch.clientY });
}

gameCanvas.addEventListener('touchstart', handleTouch, { passive: false });

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
    // Simple pop animation: scaling up and fading out
    const duration = 300; // in ms
    const start = performance.now();

    function animateFrame(time) {
        const elapsed = time - start;
        const progress = Math.min(elapsed / duration, 1);
        const scale = 1 + progress; // Scale from 1 to 2
        const opacity = 1 - progress; // Fade from 1 to 0

        // Clear the area where the circle is
        ctx.clearRect(circle.x - circle.radius * 2, circle.y - circle.radius * 2, circle.radius * 4, circle.radius * 4);

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
            // Ensure the area is fully cleared after animation
            ctx.clearRect(circle.x - circle.radius * scale, circle.y - circle.radius * scale, circle.radius * 2 * scale, circle.radius * 2 * scale);
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

// Initialize Leaderboard on Page Load
initializeLeaderboard();

// Handle Start Game Button Click
startGameButton.addEventListener('click', () => {
    console.log('Start Game Button Clicked'); // Debugging
    startGame();
});
