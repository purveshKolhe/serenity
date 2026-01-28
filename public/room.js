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

// Socket Connection & Real-time Events
socket.emit('join-room', { roomId, user });

socket.on('update-participants', (serverParticipants) => {
    renderDesk(serverParticipants);
});

socket.on('room-full', () => {
    alert('Room is full! (Max 4 participants) 😢');
    window.location.href = '/';
});

function renderDesk(participants) {
    desk.innerHTML = ''; // Clear previous state

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
            img.alt = p.nickname;

            // Randomize float animation delay to look natural
            img.style.animationDelay = `-${Math.random() * 2}s`;

            const label = document.createElement('div');
            label.className = 'avatar-label';
            label.innerText = p.nickname;

            // Highlight "You"
            if (p.nickname === user.nickname) {
                label.style.color = 'var(--primary-dark)';
                label.innerText += ' (You)';
            }

            seat.appendChild(img);
            seat.appendChild(label);
        } else {
            // Empty Seat
            seat.style.opacity = '0.3';
        }

        desk.appendChild(seat);
    }
}

// Placeholder listeners for buttons
document.getElementById('timer-btn').addEventListener('click', () => alert('Pomodoro Timer coming soon! 🍅'));
document.getElementById('tasks-btn').addEventListener('click', () => alert('Task Board coming soon! 📝'));
document.getElementById('chat-btn').addEventListener('click', () => alert('Chat coming soon! 💬'));
document.getElementById('god-btn').addEventListener('click', () => alert('The Chibi God is sleeping... 💤 (Coming soon)'));
