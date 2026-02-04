const socket = io();

// Constants
const AVATARS = [
    'Quiet_topper.webp',
    'calm_nerd.webp',
    'confident_studier.webp',
    'cozy_bookworm.webp',
    'energetic_bestie.webp',
    'energetic_friend.webp',
    'focus_mode.webp',
    'gamer_guy.webp',
    'hoodie_pal.webp',
    'minimal_clean_girl.webp',
    'night_owl.webp',
    'soft_aesthetic_girl.webp',
    'soft_smile.webp',
    'sunshine.webp'
];

// Elements
const nicknameInput = document.getElementById('nickname');
const avatarGrid = document.getElementById('avatar-grid');
const nextBtn = document.getElementById('next-btn');
const stepIdentity = document.getElementById('step-identity');
const stepRoom = document.getElementById('step-room');
const roomIdInput = document.getElementById('room-id');
const enterBtn = document.getElementById('enter-btn');
const createBtn = document.getElementById('create-btn');

// State
let selectedAvatar = null;

// Initialize Avatar Grid
function initAvatars() {
    AVATARS.forEach(filename => {
        const div = document.createElement('div');
        div.className = 'avatar-option';
        div.dataset.file = filename;

        const img = document.createElement('img');
        img.src = `/avatars/${filename}`;
        img.alt = filename.replace('.webp', '').replace(/_/g, ' ');

        div.appendChild(img);

        div.addEventListener('click', () => selectAvatar(div, filename));
        avatarGrid.appendChild(div);
    });
}

function selectAvatar(element, filename) {
    // Remove previous selection
    document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));

    // Add new selection
    element.classList.add('selected');
    selectedAvatar = filename;

    validateIdentityStep();
}

function validateIdentityStep() {
    const name = nicknameInput.value.trim();
    if (name.length > 0 && selectedAvatar) {
        nextBtn.removeAttribute('disabled');
    } else {
        nextBtn.setAttribute('disabled', 'true');
    }
}

// Event Listeners for Identity Step
nicknameInput.addEventListener('input', validateIdentityStep);

nextBtn.addEventListener('click', () => {
    // Save to LocalStorage
    const userState = {
        nickname: nicknameInput.value.trim(),
        avatar: selectedAvatar
    };
    localStorage.setItem('serenity_user', JSON.stringify(userState));

    // Transition to Room Step
    stepIdentity.style.display = 'none';
    stepRoom.style.display = 'block';

    // Check for room in URL maybe? for now just show choices.
});

// Event Listeners for Room Step
roomIdInput.addEventListener('input', () => {
    const val = roomIdInput.value.trim();
    if (val.length > 0) {
        enterBtn.removeAttribute('disabled');
    } else {
        enterBtn.setAttribute('disabled', 'true');
    }
});

function enterRoom(roomId) {
    // Save room to LocalStorage
    localStorage.setItem('serenity_room', roomId);
    // Redirect to room page (we'll assume query param for now, or just /room.html)
    window.location.href = `/room.html?id=${encodeURIComponent(roomId)}`;
}

enterBtn.addEventListener('click', () => {
    enterRoom(roomIdInput.value.trim());
});

createBtn.addEventListener('click', () => {
    // Generate a random cute room name or ID
    const adjectives = ['Cozy', 'Quiet', 'Soft', 'Focus', 'Dreamy', 'Sunny'];
    const nouns = ['Nook', 'Den', 'Corner', 'Space', 'Garden', 'Cafe'];
    const randomName = adjectives[Math.floor(Math.random() * adjectives.length)] +
        nouns[Math.floor(Math.random() * nouns.length)] +
        Math.floor(Math.random() * 100);

    enterRoom(randomName);
});

// Initialize
initAvatars();

// Check if user already exists in storage? 
// The plan says "Identity resets every visit (intentional + casual)", so maybe we AUTO-CLEAR storage on index load?
// Or we pre-fill? Plan said "Identity resets every visit".
// "Identity resets every visit (intentional + casual)" line 43 in plan.md
// So we should NOT pre-fill. Clean slate every time.
localStorage.removeItem('serenity_user');
localStorage.removeItem('serenity_room');

// --- SECURITY & DEV MODE ---
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
    if (e.keyCode === 123) { e.preventDefault(); return false; }
    if (e.ctrlKey && (e.shiftKey && (e.keyCode === 73 || e.keyCode === 74) || e.keyCode === 85)) { e.preventDefault(); return false; }
    if (e.ctrlKey && e.shiftKey && e.keyCode === 76) {
        alert(" Secret Developer Mode Activated (Simulated)");
    }
});
