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
const deskContainer = document.getElementById('desk');
const deskStage = document.getElementById('desk-stage');

// Timer Elements (now in window-pomodoro)
const timerModeDisplay = document.getElementById('timer-mode');
const timerDisplay = document.getElementById('timer-display');
const startTimerBtn = document.getElementById('start-timer');
const pauseTimerBtn = document.getElementById('pause-timer');
const resetTimerBtn = document.getElementById('reset-timer');
const modeBtns = document.querySelectorAll('.mode-btn');
const notifSound = document.getElementById('notif-sound');
if (notifSound) notifSound.volume = 0.4; // 80% of 0.5

// === WINDOW MANAGER GLOBALS (must be defined early) ===
let highestZ = 2000;

function bringToFront(win) {
    if (!win) return;
    highestZ++;
    win.style.zIndex = highestZ;
}

// Validation
if (!user || !roomId) {
    window.location.href = '/';
}

roomNameDisplay.innerText = roomId;

// Socket Connection & Real-time Events
const roomLayout = document.querySelector('.room-layout');

// Background Cycler
const bgList = ['forest.webp', 'hogwarts.webp', 'library.webp', 'stars.webp', 'tech.webp', 'valley.webp'];
let currentBgIndex = 0;

function getBackgroundPath(filename) {
    const isMobile = window.innerWidth <= 768;
    // Skip if it doesn't exist in mobile_bgs (e.g. ones that failed to generate)
    const mobileAvailable = ['forest.webp', 'hogwarts.webp', 'library.webp', 'stars.webp', 'tech.webp', 'valley.webp'];
    if (isMobile && mobileAvailable.includes(filename)) {
        return `/mobile_bgs/${filename}`;
    }
    return `/bgs/${filename}`;
}

// Initial Background Load (Instant)
let savedBg = localStorage.getItem(`serenity_bg_${roomId}`);
if (savedBg) {
    // Migration: If user had .png saved, swap to .webp
    if (savedBg.endsWith('.png')) {
        savedBg = savedBg.replace('.png', '.webp');
        localStorage.setItem(`serenity_bg_${roomId}`, savedBg);
    }
    roomLayout.style.backgroundImage = `url('${savedBg}')`;
    // Sync currentBgIndex
    const filename = savedBg.split('/').pop();
    const idx = bgList.indexOf(filename);
    if (idx !== -1) currentBgIndex = idx;
}

themeBtn.addEventListener('click', () => {
    currentBgIndex = (currentBgIndex + 1) % bgList.length;
    const bgUrl = getBackgroundPath(bgList[currentBgIndex]);
    roomLayout.style.backgroundImage = `url('${bgUrl}')`;
    localStorage.setItem(`serenity_bg_${roomId}`, bgUrl);
});

exitBtn.addEventListener('click', () => {
    showConfirm('Leaving?', 'Are you sure you want to leave the vibes? 🥺', () => {
        window.location.href = '/';
    });
});

// --- DYNAMIC BACKGROUND SYSTEM (Pollinations.ai Flux) ---
function getSeedFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

function setDynamicBackground(roomName) {
    // Preset Backgrounds
    const backgrounds = [
        'forest.webp',
        'hogwarts.webp',
        'library.webp',
        'stars.webp',
        'tech.webp',
        'valley.webp'
    ];

    // Stable Seed derived from Room Name
    const seed = getSeedFromString(roomName);

    // Pick background deterministically
    const index = seed % backgrounds.length;
    const bgUrl = getBackgroundPath(backgrounds[index]);

    // Apply if not already set by manual override or previous session
    if (!localStorage.getItem(`serenity_bg_${roomName}`)) {
        const img = new Image();
        img.src = bgUrl;
        img.onload = () => {
            roomLayout.style.backgroundImage = `url('${bgUrl}')`;
            localStorage.setItem(`serenity_bg_${roomName}`, bgUrl);
        };
    }
}

socket.on('connect', () => {
    if (user.nickname && roomId) {
        socket.emit('join-room', { roomId, user });
        setDynamicBackground(roomId);
    }
});

socket.on('update-participants', (serverParticipants) => {
    renderDesk(serverParticipants);
});

socket.on('room-full', () => {
    showAlert('Room Full', 'Room is full! (Max 4 participants) 😢', () => {
        window.location.href = '/';
    });
});

// --- Timer Logic ---
socket.on('timer-update', (timerState) => {
    updateTimerUI(timerState);
});

socket.on('timer-finished', (mode) => {
    // Play notification sound
    notifSound.currentTime = 0;
    notifSound.play().catch(() => { }); // Catch autoplay errors

    const message = mode === 'focus' ?
        "Focus time done! Time for a break 🍵" :
        "Break's over! Back to the grind 💪";

    // Use toast + sound, or Modal? Modal is better for timer end.
    showAlert('Timer Finished! ⏰', message);
});

function updateTimerUI(state) {
    // Guard against undefined/NaN
    const timeLeft = state.timeLeft || 0;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    // Tiny Timer update
    const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    timerDisplay.innerText = formattedTime;

    // Tiny Persistent Timer
    const tinyTimer = document.getElementById('tiny-timer');
    const pomodoroDisplay = document.getElementById('pomodoro-display');

    if (tinyTimer) {
        tinyTimer.innerText = formattedTime; // + (state.mode === 'focus' ? ' 🍅' : ' ☕'); 
        // Removed emoji from text since specific styles might handle it? 
        // Actually user didn't ask to remove it, but CSS uses custom font. I'll keep emoji.
        tinyTimer.innerText = formattedTime + (state.mode === 'focus' ? ' 🍅' : ' ☕');

        const container = pomodoroDisplay || tinyTimer;

        if (state.isRunning || state.isPaused) {
            container.classList.add('visible');
        } else {
            container.classList.remove('visible');
        }
    }

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

// Timer Window Controls
const windowPomodoro = document.getElementById('window-pomodoro');
// Toggle logic for Pomodoro
document.getElementById('timer-btn').addEventListener('click', () => {
    windowPomodoro.classList.toggle('hidden');
    bringToFront(windowPomodoro);
});
// (Close/Minimize handled by generic logic below)

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


// --- COMPOSITING METADATA ---
const DESK_STAGE = {
    baseWidth: null,
    baseHeight: null,
    offsetY: 0.055,
    downShift: 0.25,
    desktopMinWidth: 1100,
    fallbackWidth: 1366,
    fallbackHeight: 768,
    storageKey: 'serenity_desk_base',
    mobileScaleBoost: 1.75,
    mobileUpShift: 0.08
};
const DESK_DATA = { id: "desk", x: 0.5045, y: 0.8131, scale: 0.452, zIndex: 6 };
const STUDENT_DATA = [
    { id: "1", x: 0.0834, y: -0.1103, scale: 0.3757, zIndex: 1 },
    { id: "6s", x: -0.1602, y: -0.0318, scale: 0.4113, zIndex: 4 },
    { id: "1", x: -0.0673, y: -0.1023, scale: 0.3883, zIndex: 2 },
    { id: "6s", x: 0.1643, y: -0.0266, scale: 0.4205, zIndex: 2 }
];

// --- AVATAR TO VID MAPPING ---
const AVATAR_TO_VID = {
    'calm_nerd.png': 1,
    'confident_studier.png': 2,
    'cozy_bookworm.png': 3,
    'energetic_bestie.png': 4,
    'energetic_friend.png': 5,
    'focus_mode.png': 6,
    'gamer_guy.png': 7,
    'hoodie_pal.png': 8,
    'minimal_clean_girl.png': 9,
    'night_owl.png': 10,
    'Quiet_topper.png': 11,
    'soft_aesthetic_girl.png': 12,
    'soft_smile.png': 13,
    'sunshine.png': 14
};

function loadDeskBase() {
    try {
        const raw = localStorage.getItem(DESK_STAGE.storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.width || !parsed.height) return null;
        return parsed;
    } catch (err) {
        return null;
    }
}

function saveDeskBase(width, height) {
    try {
        localStorage.setItem(DESK_STAGE.storageKey, JSON.stringify({ width, height }));
    } catch (err) {
        // Ignore storage errors
    }
}

function setDeskStageSize(width, height) {
    deskStage.style.width = `${width}px`;
    deskStage.style.height = `${height}px`;
}

function ensureDeskStageBase(containerWidth, containerHeight) {
    if (containerWidth >= DESK_STAGE.desktopMinWidth) {
        if (DESK_STAGE.baseWidth !== containerWidth || DESK_STAGE.baseHeight !== containerHeight) {
            DESK_STAGE.baseWidth = containerWidth;
            DESK_STAGE.baseHeight = containerHeight;
            setDeskStageSize(DESK_STAGE.baseWidth, DESK_STAGE.baseHeight);
            saveDeskBase(DESK_STAGE.baseWidth, DESK_STAGE.baseHeight);
        }
        return;
    }

    if (DESK_STAGE.baseWidth && DESK_STAGE.baseHeight) return;

    const stored = loadDeskBase();
    if (stored) {
        DESK_STAGE.baseWidth = stored.width;
        DESK_STAGE.baseHeight = stored.height;
    } else {
        DESK_STAGE.baseWidth = DESK_STAGE.fallbackWidth;
        DESK_STAGE.baseHeight = DESK_STAGE.fallbackHeight;
    }

    setDeskStageSize(DESK_STAGE.baseWidth, DESK_STAGE.baseHeight);
}

function updateDeskStageScale() {
    if (!deskContainer || !deskStage) return;
    const containerWidth = deskContainer.clientWidth;
    const containerHeight = deskContainer.clientHeight;
    if (!containerWidth || !containerHeight) return;

    ensureDeskStageBase(containerWidth, containerHeight);

    const widthRatio = Math.min(1, containerWidth / DESK_STAGE.baseWidth);
    const heightRatio = Math.min(1, containerHeight / DESK_STAGE.baseHeight);
    let scale = Math.min(widthRatio, heightRatio);

    const isMobile = containerWidth < DESK_STAGE.desktopMinWidth;
    if (isMobile) {
        const boost = 1 + (1 - widthRatio) * DESK_STAGE.mobileScaleBoost;
        scale = Math.min(1, heightRatio, widthRatio * boost);
    }

    const scaledWidth = DESK_STAGE.baseWidth * scale;
    const scaledHeight = DESK_STAGE.baseHeight * scale;
    const offsetY = containerHeight * DESK_STAGE.offsetY;
    const maxDownShift = DESK_STAGE.baseHeight * DESK_STAGE.downShift;
    let downShift = (1 - widthRatio) * maxDownShift;
    if (isMobile) {
        downShift -= containerHeight * DESK_STAGE.mobileUpShift;
    }

    deskStage.style.transform = `scale(${scale})`;
    deskStage.style.left = `${(containerWidth - scaledWidth) / 2}px`;
    deskStage.style.top = `${(containerHeight - scaledHeight) / 2 - offsetY + downShift}px`;
}

window.addEventListener('resize', updateDeskStageScale);
updateDeskStageScale();
if (deskContainer && 'ResizeObserver' in window) {
    const deskObserver = new ResizeObserver(() => updateDeskStageScale());
    deskObserver.observe(deskContainer);
}

function renderDesk(participants) {
    if (!deskStage) return;
    updateDeskStageScale();
    deskStage.innerHTML = '';

    // 1. Render Desk
    const deskEl = document.createElement('div');
    deskEl.className = 'composited-element layer-desk';
    deskEl.style.left = `${DESK_DATA.x * DESK_STAGE.baseWidth}px`;
    deskEl.style.top = `${DESK_DATA.y * DESK_STAGE.baseHeight}px`;
    deskEl.style.transform = `translate(-50%, -50%) scale(${DESK_DATA.scale})`;

    const deskImg = document.createElement('img');
    deskImg.src = '/assets/desk.png';
    deskImg.className = 'desk-img';
    deskEl.appendChild(deskImg);
    deskStage.appendChild(deskEl);

    // 2. Render Students
    STUDENT_DATA.forEach((data, index) => {
        if (!participants[index]) return;
        const p = participants[index];

        const studentEl = document.createElement('div');
        const isLaptop = !data.id.endsWith('s');
        studentEl.className = `composited-element ${isLaptop ? 'layer-student-back' : 'layer-student-front'}`;

        const absX = DESK_DATA.x + data.x;
        const absY = DESK_DATA.y + data.y;

        studentEl.style.left = `${absX * DESK_STAGE.baseWidth}px`;
        studentEl.style.top = `${absY * DESK_STAGE.baseHeight}px`;
        // Container: Only scale, NO flip
        studentEl.style.transform = `translate(-50%, -50%) scale(${data.scale})`;
        studentEl.setAttribute('data-nickname', p.nickname); // Set for finding later

        // --- ASSET MAPPING ---
        const vidNum = AVATAR_TO_VID[p.avatar] || 1; // Fallback to 1
        const isSitting = data.id.endsWith('s');
        const vidFileName = isSitting ? `${vidNum}s.webm` : `${vidNum}.webm`;

        const vid = document.createElement('video');
        vid.src = `/vids/${vidFileName}`;
        vid.className = 'student-video';
        vid.autoplay = true;
        vid.loop = true;
        vid.muted = true;
        vid.playsInline = true;

        // Flip IMAGE only (not container)
        if (data.x > 0) {
            vid.style.transform = 'scaleX(-1)';
        }

        // Label (No flip needed since container is not flipped)
        const label = document.createElement('div');
        label.className = 'student-label';
        label.innerText = p.nickname;

        studentEl.appendChild(vid);
        studentEl.appendChild(label);
        deskStage.appendChild(studentEl);
    });
}

// Placeholder listeners for other buttons
// --- QUIZ SETUP ---
const quizSetupOverlay = document.getElementById('quiz-setup-overlay');
const closeQuizSetupBtn = document.getElementById('close-quiz-setup');
const quizTopic = document.getElementById('quiz-topic');
const startQuizBtn = document.getElementById('start-quiz-btn');

// Use Window ID
const windowQuiz = document.getElementById('window-quiz');
const quizQuestion = document.getElementById('quiz-question');
const quizOptions = document.getElementById('quiz-options');
const quizProgress = document.getElementById('quiz-progress');

document.getElementById('quiz-init-btn').addEventListener('click', () => {
    // Show Setup Modal OR switch to Setup Window?
    // User asked for generic window with close.
    // Let's keep Setup Modal as "App Launcher" for the Quiz Window
    quizSetupOverlay.classList.remove('hidden');
    quizTopic.focus();
});

closeQuizSetupBtn.addEventListener('click', () => {
    quizSetupOverlay.classList.add('hidden');
});

// --- QUIZ LOGIC (Multi-Round V2) ---
const quizActiveView = document.getElementById('quiz-active-view');
const quizResultsView = document.getElementById('quiz-results-view');
const quizCounter = document.getElementById('quiz-counter');
const quizScore = document.getElementById('quiz-score');
const quizStatus = document.getElementById('quiz-status');
const closeQuizResultsBtn = document.getElementById('close-quiz-results');

startQuizBtn.addEventListener('click', () => {
    const topic = quizTopic.value.trim();
    if (topic) {
        socket.emit('start-quiz-v2', topic);
        quizTopic.value = '';
        quizSetupOverlay.classList.add('hidden');
        windowQuiz.classList.remove('hidden'); // Show Window
        bringToFront(windowQuiz);
    }
});

closeQuizResultsBtn.addEventListener('click', () => {
    windowQuiz.classList.add('hidden'); // Hide window entirely on finish close?
    // Or just revert view? User said "close option".
    quizResultsView.classList.add('hidden');
    quizActiveView.classList.remove('hidden');
});

socket.on('quiz-state-loading', () => {
    showToast("Generating a quiz for you... please wait! 🎲", 4000);
});

socket.on('quiz-state-question', (data) => {
    // Show Window
    windowQuiz.classList.remove('hidden');
    bringToFront(windowQuiz);

    quizResultsView.classList.add('hidden');
    quizActiveView.classList.remove('hidden');

    // Update UI
    quizCounter.innerText = `Q ${data.current} / ${data.total}`;
    quizScore.innerText = `Score: 0`;
    quizQuestion.innerText = data.question;
    quizOptions.innerHTML = '';
    quizStatus.innerText = `Time to answer! (${data.timeLeft}s) ⏳`;

    // Reset timer animation
    quizProgress.style.animation = 'none';
    quizProgress.offsetHeight;
    quizProgress.style.animation = `quizTimer ${data.timeLeft}s linear forwards`;

    // Render Options
    data.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option-btn';
        btn.innerText = opt;
        btn.onclick = () => {
            // Deselect others
            document.querySelectorAll('.quiz-option-btn').forEach(b => {
                b.classList.remove('selected', 'correct', 'wrong');
            });
            btn.classList.add('selected');
            socket.emit('submit-answer-v2', { qIndex: data.current - 1, aIndex: index });
            quizStatus.innerText = "Answer submitted! Waiting... 🤞";
        };
        quizOptions.appendChild(btn);
    });
});

socket.on('quiz-feedback-v2', (data) => {
    const selected = document.querySelector('.quiz-option-btn.selected');
    if (selected) {
        if (data.correct) {
            selected.classList.add('correct');
            if (data.newScore !== undefined) quizScore.innerText = `Score: ${data.newScore}`;
            quizStatus.innerText = "Correct! 🎉";
            notifSound.play().catch(() => { });
            spawnConfetti();
        } else {
            selected.classList.add('wrong');
            quizStatus.innerText = "Wrong! 😢";
        }
    }
});

socket.on('quiz-state-reveal', (data) => {
    const buttons = document.querySelectorAll('.quiz-option-btn');
    if (buttons[data.correctIndex]) {
        buttons[data.correctIndex].classList.add('correct'); // Ensure green
    }
    quizStatus.innerText = "Next question coming soon... ➡️";
});

socket.on('quiz-state-gameover', (leaderboard) => {
    quizActiveView.classList.add('hidden');
    quizResultsView.classList.remove('hidden');

    const container = document.getElementById('quiz-leaderboard');
    container.innerHTML = '';

    leaderboard.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'leaderboard-item';
        div.innerHTML = `
            <span>#${i + 1}</span>
            <img src="/avatars/${p.avatar}" alt="${p.nickname}">
            <span>${p.nickname}</span>
            <span class="leaderboard-score">${p.score} pts</span>
        `;
        container.appendChild(div);
    });

    // Big Confetti Loop
    spawnConfetti(50);
});

function spawnConfetti(count = 20) {
    for (let i = 0; i < count; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.top = '-10px';
        conf.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 70%)`;
        conf.style.animationDuration = (Math.random() * 2 + 1) + 's';
        document.body.appendChild(conf);
        setTimeout(() => conf.remove(), 3000);
    }
}

// --- TASKS FUNCTIONALITY ---
const windowTasks = document.getElementById('window-tasks');
const taskList = document.getElementById('task-list');
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');

document.getElementById('tasks-btn').addEventListener('click', () => {
    windowTasks.classList.toggle('hidden');
    bringToFront(windowTasks);
    if (!windowTasks.classList.contains('hidden')) taskInput.focus();
});

// closeTasksBtn removed (handled by generic window logic)

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
            showConfirm('Delete Task', 'Remove this task?', () => {
                socket.emit('delete-task', task.id);
            });
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
// --- CHAT FUNCTIONALITY ---
const windowChat = document.getElementById('window-chat');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat');
const reactionBtns = document.querySelectorAll('.reaction-btn');

document.getElementById('chat-btn').addEventListener('click', () => {
    windowChat.classList.toggle('hidden');
    bringToFront(windowChat);
    if (!windowChat.classList.contains('hidden')) chatInput.focus();
});

// Generic Window Manager will handle close button

/* ========================
   WINDOW MANAGER SYSTEM
   ======================== */
const windows = document.querySelectorAll('.os-window');
// highestZ and bringToFront defined at top of file

// 1. Generic Control Setup
windows.forEach(win => {
    // Bring to front on mousedown
    win.addEventListener('mousedown', () => bringToFront(win));

    const header = win.querySelector('.window-header');
    const minimizeBtn = win.querySelector('.btn-minimize');
    const closeBtn = win.querySelector('.btn-close');

    // Minimize Listener
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            win.classList.toggle('minimized');
        });
    }

    // Close Listener
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            win.classList.add('hidden');
        });
    }

    // Make Draggable
    if (header) {
        makeDraggable(win, header);
    }
});

// 2. Draggable Utility (Mouse & Touch)
function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    handle.onmousedown = dragMouseDown;
    handle.ontouchstart = dragTouchStart;

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        bringToFront(element);
    }

    function dragTouchStart(e) {
        const touch = e.touches[0];
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        document.addEventListener('touchend', closeDragElement);
        document.addEventListener('touchmove', elementTouchMove, { passive: false });
        bringToFront(element);
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function elementTouchMove(e) {
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        pos1 = pos3 - touch.clientX;
        pos2 = pos4 - touch.clientY;
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        document.removeEventListener('touchend', closeDragElement);
        document.removeEventListener('touchmove', elementTouchMove);
        document.ontouchend = null;
        document.ontouchmove = null;
    }
}


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
    // Play notification sound
    if (notifSound) {
        notifSound.currentTime = 0;
        notifSound.play().catch(() => { });
    }

    // 1. Add to Sidebar Chat
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

    // 2. Show Cloud Bubble above Avatar
    showChatBubble(msg.nickname, msg.text);
});

function showChatBubble(nickname, text) {
    // Find the student element
    const studentEl = document.querySelector(`.composited-element[data-nickname="${nickname}"]`);
    if (!studentEl) return;

    // Remove existing bubble if any
    const existing = studentEl.querySelector('.chat-cloud');
    if (existing) existing.remove();

    // Create cloud
    const cloud = document.createElement('div');
    cloud.className = 'chat-cloud';
    cloud.innerText = text;

    studentEl.appendChild(cloud);

    // Fade out and remove after 5s
    setTimeout(() => {
        cloud.remove();
    }, 5000);
}

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

// --- XP & LEVELING EVENTS ---
socket.on('xp-gained', (data) => {
    showToast(`+${data.amount} XP: ${data.reason} ✨`);
});

socket.on('xp-gained-all', (data) => {
    showToast(`Everyone gained +${data.amount} XP! ${data.reason} 🌟`);
});

socket.on('player-leveled-up', (data) => {
    // If it's me
    if (data.id === socket.id) {
        showAlert('Level Up! 🆙', `Congratulations! You reached Level ${data.newLevel}! 🎉`);
        spawnConfetti(50);
        notifSound.play().catch(() => { });
    } else {
        showToast(`${data.nickname} leveled up to Level ${data.newLevel}! 🔥`);
    }
});

// Helper to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- NOTIFICATION SYSTEM (Modals/Toasts) ---
const modalOverlay = document.getElementById('custom-modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const toastContainer = document.getElementById('toast-container');

function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function showAlert(title, message, onOk = null) {
    modalTitle.innerText = title;
    modalMessage.innerText = message;
    modalConfirmBtn.onclick = () => {
        modalOverlay.classList.add('hidden');
        if (onOk) onOk();
    };
    modalCancelBtn.classList.add('hidden');
    modalOverlay.classList.remove('hidden');
}

function showConfirm(title, message, onConfirm) {
    modalTitle.innerText = title;
    modalMessage.innerText = message;

    modalConfirmBtn.onclick = () => {
        modalOverlay.classList.add('hidden');
        if (onConfirm) onConfirm();
    };

    modalCancelBtn.onclick = () => modalOverlay.classList.add('hidden');
    modalCancelBtn.classList.remove('hidden');
    modalOverlay.classList.remove('hidden');
}
// --- SECURITY & DEV MODE ---
const windowAdmin = document.getElementById('window-admin');

// Disable Right Click (Context Menu)
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Disable common DevTools shortcuts to discourage inspection
document.addEventListener('keydown', (e) => {
    // F12
    if (e.keyCode === 123) {
        e.preventDefault();
        return false;
    }
    // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+U (View Source)
    if (e.ctrlKey && (e.shiftKey && (e.keyCode === 73 || e.keyCode === 74) || e.keyCode === 85)) {
        e.preventDefault();
        return false;
    }

    // Secret Way: Ctrl + Shift + L
    if (e.ctrlKey && e.shiftKey && e.keyCode === 76) {
        if (windowAdmin) {
            windowAdmin.classList.remove('hidden');
            bringToFront(windowAdmin);
            showToast("🌸 Developer Access Granted");
        }
    }
});

// Dev Tools Buttons
document.getElementById('dev-levelup')?.addEventListener('click', () => {
    socket.emit('level-up', { nickname: user.nickname });
});

document.getElementById('dev-confetti')?.addEventListener('click', () => {
    spawnConfetti(200);
    showToast("🎉 Confetti Force-Spawned");
});

document.getElementById('dev-reset-bg')?.addEventListener('click', () => {
    localStorage.removeItem(`serenity_bg_${roomId}`);
    window.location.reload();
});

document.getElementById('dev-clear-storage')?.addEventListener('click', () => {
    showConfirm('Nuke Storage?', 'This will clear all local data and refresh. Are you sure?', () => {
        localStorage.clear();
        window.location.href = '/';
    });
});

