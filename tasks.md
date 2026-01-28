# Serenity Project Tasks 🌸

One-by-one roadmap to build the "Serenity" study collaboration site.

## Phase 1: Foundation & Setup
- [x] **Task 1: Server Setup**
    - Initialize Node.js project.
    - Set up Express server with Socket.io.
    - Configure static file serving for `assets` and `avatars`.
    - *Tech: Node.js, Express, Socket.io*

## Phase 2: User Onboarding
- [x] **Task 2: Landing Page (Identity Selection)**
    - Create a cute landing page.
    - Implement Room ID entry/creation.
    - Build the Avatar & Nickname selector (15 chibis + Nickname field).
    - Save selection to LocalStorage.
    - *Tech: HTML, CSS, JS, LocalStorage*

## Phase 3: The Study Room
- [x] **Task 3: Room UI Layout**
    - Create the main room dashboard.
    - Implement the "Desk" area where participant avatars appear when they join.
    - Design the 3 theme styles (switchable).
    - *Tech: HTML, CSS (Grid/Flexbox)*

- [x] **Task 4: Real-time Presence**
    - Use Socket.io to broadcast when a user joins/leaves a room.
    - Update the desk visuals live for all members.
    - *Tech: Socket.io, JS*

## Phase 4: Core Features
- [x] **Task 5: Synced Pomodoro Timer**
    - Build a shared timer logic on the server.
    - Sync start/pause/reset actions across all clients.
    - Add cute audio feedback (`notif.mp3`) on session changes.
    - *Tech: Socket.io, JS, Web Audio API*

- [x] **Task 6: Room Chat & Reactions**
    - Implement real-time text chat.
    - Show avatars next to nicknames in chat.
    - Add "Quick Reactions" (floating emojis/cute icons).
    - *Tech: Socket.io, CSS Animations*

- [ ] **Task 7: Task & Goal Tracking**
    - Create a room-level task list.
    - Allow any member to add/complete tasks.
    - Add "Cute Feedback" (confetti/chibi toast) when a task is finished.
    - *Tech: Socket.io, JS*

## Phase 5: Advanced Features
- [ ] **Task 8: Chibi God & AI Quiz Mode**
    - Integrate Groq API for AI content.
    - Implement "Ask Chibi God" UI.
    - Logic for generating and displaying quizzes to all members simultaneously.
    - *Tech: Groq API, Node.js*

- [ ] **Task 9: Rewards & Cosmetics**
    - Implement simple "Reward Points" for session time and task completion.
    - Add cosmetic unlocks (e.g., special glows for avatars or room decorations).
    - *Tech: JS, CSS*

## Phase 6: Polish & Deployment
- [ ] **Task 10: Final Aesthetics & UX**
    - Refine all animations and transitions.
    - Ensure responsiveness for different screen sizes.
    - Final sweep for "cuteness" and "vibes".
    - *Tech: CSS*
