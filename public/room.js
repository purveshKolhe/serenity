const socket = io();

// State
let user = JSON.parse(localStorage.getItem('serenity_user'));
let roomId = new URLSearchParams(window.location.search).get('id');
let currentThemeIndex = 0;
const themes = ['theme-cafe', 'theme-gamer', 'theme-cloud'];

// DOM Elements
const roomNameDisplay = document.getElementById('room-name-display');
const themeBtn = document.getElementById('theme-btn');
const exitBtn = document.getElementById('exit-btn');
const desk = document.getElementById('desk');

// Validation
if (!user || !roomId) {
    window.location.href = '/';
}

roomNameDisplay.innerText = roomId;

// Theme Switcher
themeBtn.addEventListener('click', () => {
    document.body.classList.remove(themes[currentThemeIndex]);
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    document.body.classList.add(themes[currentThemeIndex]);
});

exitBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to leave the vibes? 🥺')) {
        window.location.href = '/';
    }
});


// Mock Participants System (Frontend only for now, real sync in Task 4)
// We'll put ourself in the desk 
const participants = [
    { name: user.nickname, avatar: user.avatar }
];

function renderDesk() {
    desk.innerHTML = ''; // Clear

    // We have 4 slots max
    for (let i = 0; i < 4; i++) {
        const seat = document.createElement('div');
        seat.className = 'seat';

        if (participants[i]) {
            // Occupied Seat
            const p = participants[i];

            const img = document.createElement('img');
            img.src = `/avatars/${p.avatar}`;
            img.className = 'avatar-display floating';
            // Add a slight random delay to float animation so they don't sync perfectly
            img.style.animationDelay = `-${Math.random() * 2}s`;

            const label = document.createElement('div');
            label.className = 'avatar-label';
            label.innerText = p.name;

            seat.appendChild(img);
            seat.appendChild(label);
        } else {
            // Empty Seat (maybe a ghost or "join" indication later)
            // For now just empty
            seat.style.opacity = '0.3';
            // seat.innerText = 'Empty'; // Optional debug
        }

        desk.appendChild(seat);
    }
}

// Initial Render
renderDesk();

// Socket Connection (Basic Join)
// In Phase 3, we just layout. Phase 4 is real syncing.
socket.emit('join-room', { roomId, user });

// Placeholder listeners for buttons
document.getElementById('timer-btn').addEventListener('click', () => alert('Pomodoro Timer coming soon! 🍅'));
document.getElementById('tasks-btn').addEventListener('click', () => alert('Task Board coming soon! 📝'));
document.getElementById('chat-btn').addEventListener('click', () => alert('Chat coming soon! 💬'));
document.getElementById('god-btn').addEventListener('click', () => alert('The Chibi God is sleeping... 💤 (Coming soon)'));
