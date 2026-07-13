# Serenity 🌸 — Collaborative Virtual Study Space & OS

**Serenity** is a cozy, immersive, and collaborative virtual study environment designed to supercharge productivity through shared presence. Built as a custom window-based desktop OS inside the browser, it brings students and developers together at a shared digital desk.

Whether preparing for an exam, working through coding sprints, or hosting virtual study rooms, Serenity provides a cohesive workspace where users can chat, share timers, track tasks, and generate AI-powered quizzes.

---

## 🚀 Key Features

### 🖥️ 1. Multi-Window Desktop OS Interface
*   **Draggable & Minimizable Windows:** Drag, drop, and minimize key widgets (Chat, Tasks, Pomodoro, Quizzes) into the taskbar or dock to customize your desktop layout.
*   **Touch-Friendly UI:** Fully interactive touch events allow dragging and organizing windows seamlessly on mobile devices and tablets.
*   **Secret Developer Dashboard:** Press `Ctrl + Shift + L` to toggle a hidden dev dashboard. Built-in context menu and shortcut protection prevent distraction and maintain immersion.

### ✍️ 2. Real-Time Interactive Study Desk
*   **Synchronized Presence:** Watch students pull up a chair in real-time as they join the room.
*   **Live Synced Avatars:** Real-time state indicators display each user's current status (Studying, Resting, Away).
*   **Dynamic Room Themes:** Background patterns and colors adapt automatically based on the Room ID.

### 🍅 3. Shared Pomodoro Power
*   **Synchronized Timer:** Everyone in the same room is locked into the same cycle (Focus, Short Break, or Long Break).
*   **Auto-Transitions:** Automatically moves to breaks and back to focus.
*   **Immersive Alerts:** Subtle custom audio chimes (`notif.mp3`) and page notifications trigger when study cycles change.

### 📝 4. Smart Productivity & Gamification
*   **Group Task Management:** A live shared backlog of tasks that any member of the room can view, add, or complete.
*   **Gamified XP (Experience Points):** Earn XP points dynamically by checking off tasks or completing Pomodoro intervals.
*   **AI Quiz Generator:** Enter any topic, and the integrated Groq AI model will instantly generate a custom 10-question quiz to test the room's knowledge.

### 📱 5. Mobile Fluidity & Asset Pipeline
*   **Responsive Dock:** Transforms into a bottom-dock mobile layout.
*   **WebP Optimizations:** All room backgrounds are fully optimized in WebP format for fast loads.
*   **Cloudflare R2 Proxying:** Automatically proxies large audio/video assets from Cloudflare R2 if they are not stored locally.

---

## 🛠️ Tech Stack & Architecture

*   **Backend:** Node.js, Express
*   **Real-time Communication:** Socket.io (for instant state synchronization across all room participants)
*   **Frontend:** Vanilla HTML5, CSS3 (Advanced custom CSS Glassmorphism design), and modern JavaScript
*   **Artificial Intelligence:** Groq SDK (utilizing high-speed LPU inference for instant quiz generation)
*   **Asset Pipeline:** Custom caching and media-proxy middleware for high-performance delivery of asset files.

---

## 📦 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) (v16.x or higher recommended)
*   A [Groq API Key](https://console.groq.com/) (Free tier available, used for AI quiz creation)

### Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/purveshKolhe/serenity.git
    cd serenity
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a file named `.env` in the root folder of the project:
    ```env
    # Required for AI Quiz generation
    GROQ_API_KEY=gsk_your_actual_groq_api_key_here

    # Optional configuration overrides
    PORT=3000
    CLOUDFLARE_R2_URL=https://your-r2-bucket-url.cloudflare.com
    ```

4.  **Run the Server:**
    ```bash
    npm start
    ```

5.  **Access the Application:**
    Open [http://localhost:3000](http://localhost:3000) in your web browser. Type in a room name and user name to start studying!

---

## 📂 Project Structure

```text
├── assets/                     # Sound alerts and asset metadata
├── public/                     # Client-side files
│   ├── index.html              # Landing page
│   ├── room.html               # Main workspace / OS desktop
│   ├── room.js                 # Frontend room logic and socket connections
│   ├── landing.js              # Landing page interactions
│   └── style.css               # Premium Glassmorphism styling and themes
├── server.js                   # Node.js backend server with Socket.io & Groq SDK
├── package.json                # Project dependencies and startup scripts
└── README.md                   # This document
```
