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

// Timer Elements
const timerOverlay = document.getElementById('timer-overlay');
const closeTimerBtn = document.getElementById('close-timer');
const timerModeDisplay = document.getElementById('timer-mode');
const timerDisplay = document.getElementById('timer-display');
const startTimerBtn = document.getElementById('start-timer');
const pauseTimerBtn = document.getElementById('pause-timer');
const resetTimerBtn = document.getElementById('reset-timer');
const modeBtns = document.querySelectorAll('.mode-btn');
const notifSound = document.getElementById('notif-sound');

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

// --- Timer Logic ---
socket.on('timer-update', (timerState) => {
    updateTimerUI(timerState);
});

socket.on('timer-finished', (mode) => {
    // Play notification sound
    notifSound.currentTime = 0;
    notifSound.play().catch(() => { }); // Catch autoplay errors

    const message = mode === 'focus'
        ? "Focus time done! Time for a break 🍵"
        : "Break's over! Back to the grind 💪";
    alert(message);
});

function updateTimerUI(state) {
    // Guard against undefined/NaN
    const timeLeft = state.timeLeft || 0;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    timerDisplay.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Update mode display
    let modeText = 'Focus Mode 🍅';
    if (state.mode === 'short-break') modeText = 'Short Break ☕';
    if (state.mode === 'long-break') modeText = 'Long Break 🌿';
    timerModeDisplay.innerText = modeText;

    // Toggle Start/Pause buttons
    if (state.isRunning) {
        startTimerBtn.style.display = 'none';
        pauseTimerBtn.style.display = 'inline-block';
    } else {
        startTimerBtn.style.display = 'inline-block';
        pauseTimerBtn.style.display = 'none';
    }

    // Update active mode button
    modeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === state.mode);
    });

    // Update duration inputs if durations are provided
    if (state.durations) {
        document.getElementById('focus-duration').value = Math.round(state.durations.focus / 60);
        document.getElementById('short-break-duration').value = Math.round(state.durations['short-break'] / 60);
        document.getElementById('long-break-duration').value = Math.round(state.durations['long-break'] / 60);
    }
}

// Timer Button Handlers
startTimerBtn.addEventListener('click', () => socket.emit('start-timer'));
pauseTimerBtn.addEventListener('click', () => socket.emit('pause-timer'));
resetTimerBtn.addEventListener('click', () => socket.emit('reset-timer'));

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        socket.emit('set-timer-mode', btn.dataset.mode);
    });
});

// Timer Overlay Controls
document.getElementById('timer-btn').addEventListener('click', () => {
    timerOverlay.classList.remove('hidden');
});
closeTimerBtn.addEventListener('click', () => {
    timerOverlay.classList.add('hidden');
});

// Duration Customization
const toggleSettingsBtn = document.getElementById('toggle-settings');
const durationSettings = document.getElementById('duration-settings');
const saveDurationsBtn = document.getElementById('save-durations');

toggleSettingsBtn.addEventListener('click', () => {
    durationSettings.classList.toggle('hidden');
});

saveDurationsBtn.addEventListener('click', () => {
    const durations = {
        focus: parseInt(document.getElementById('focus-duration').value) || 25,
        'short-break': parseInt(document.getElementById('short-break-duration').value) || 5,
        'long-break': parseInt(document.getElementById('long-break-duration').value) || 15
    };
    socket.emit('set-timer-durations', durations);
    durationSettings.classList.add('hidden');
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

// Placeholder listeners for other buttons
document.getElementById('god-btn').addEventListener('click', () => alert('The Chibi God is sleeping... 💤 (Coming soon)'));

// --- TASKS FUNCTIONALITY ---
const tasksOverlay = document.getElementById('tasks-overlay');
const closeTasksBtn = document.getElementById('close-tasks');
const taskList = document.getElementById('task-list');
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');

document.getElementById('tasks-btn').addEventListener('click', () => {
    tasksOverlay.classList.remove('hidden');
    taskInput.focus();
});

closeTasksBtn.addEventListener('click', () => {
    tasksOverlay.classList.add('hidden');
});

function addTask() {
    const text = taskInput.value.trim();
    if (text) {
        socket.emit('add-task', text);
        taskInput.value = '';
    }
}

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

// Task Updates
socket.on('update-tasks', (tasks) => {
    taskList.innerHTML = '';
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;

        li.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <div class="task-text-content">
                <span>${escapeHtml(task.text)}</span>
                <span class="task-author">Added by ${task.author}</span>
            </div>
            <button class="delete-task-btn" title="Delete">&times;</button>
        `;

        // Checkbox listener
        li.querySelector('.task-checkbox').addEventListener('change', () => {
            socket.emit('toggle-task', task.id);
        });

        // Delete listener
        li.querySelector('.delete-task-btn').addEventListener('click', () => {
            if (confirm('Delete this task?')) {
                socket.emit('delete-task', task.id);
            }
        });

        taskList.appendChild(li);
    });
});

// Celebration
socket.on('task-completed-celebration', (taskText) => {
    // Play happy sound
    const audio = new Audio('/assets/notif.mp3');
    audio.play().catch(() => { });

    // Confetti explosion
    for (let i = 0; i < 30; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.top = '-10px';
        conf.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 70%)`;
        conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
        document.body.appendChild(conf);
        setTimeout(() => conf.remove(), 4000);
    }

    // Toast
    const toast = document.createElement('div');
    toast.className = 'glass-panel bouncy';
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.zIndex = '1000';
    toast.style.padding = '1rem 2rem';
    toast.style.textAlign = 'center';

    toast.innerHTML = `
        <h3 style="margin:0">Yay! Task Complete! 🎉</h3>
        <p style="margin:5px 0 0 0; opacity:0.8; font-size:0.9rem;">"${escapeHtml(taskText)}"</p>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
});

// --- CHAT FUNCTIONALITY ---
const chatOverlay = document.getElementById('chat-overlay');
const closeChatBtn = document.getElementById('close-chat');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat');
const reactionBtns = document.querySelectorAll('.reaction-btn');

document.getElementById('chat-btn').addEventListener('click', () => {
    chatOverlay.classList.remove('hidden');
    chatInput.focus();
});

closeChatBtn.addEventListener('click', () => {
    chatOverlay.classList.add('hidden');
});

function sendMessage() {
    const text = chatInput.value.trim();
    if (text) {
        socket.emit('chat-message', text);
        chatInput.value = '';
    }
}

sendChatBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Receive new messages
socket.on('new-message', (msg) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message';
    msgDiv.innerHTML = `
        <img src="/avatars/${msg.avatar}" alt="${msg.nickname}">
        <div class="chat-message-content">
            <div class="chat-message-header">${msg.nickname}</div>
            <div class="chat-message-text">${escapeHtml(msg.text)}</div>
        </div>
    `;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Quick Reactions
reactionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        socket.emit('send-reaction', btn.dataset.emoji);
    });
});

socket.on('new-reaction', (data) => {
    // Create floating emoji
    const emoji = document.createElement('div');
    emoji.className = 'floating-reaction';
    emoji.innerText = data.emoji;
    emoji.style.left = Math.random() * 80 + 10 + '%';
    emoji.style.bottom = '100px';
    document.body.appendChild(emoji);

    // Remove after animation
    setTimeout(() => emoji.remove(), 2000);
});

// Helper to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
