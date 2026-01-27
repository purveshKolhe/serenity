# Serenity Tech Stack

This document outlines the technology stack and tools used for each major component of the Serenity project.

## 🎨 Frontend (The Vibes)
* **HTML5**: Semantic structure for a clean, accessible foundation.
* **Vanilla CSS3**: Advanced styling using CSS Variables, Flexbox/Grid, and Keyframe Animations. Focused on glassmorphism, soft gradients, and "cute" aesthetics.
* **Modern JavaScript (ES6+)**: Core logic, DOM manipulation, and state management.
* **Google Fonts**: Custom typography (e.g., 'Inter', 'Outfit', or 'Quicksand') to enhance the soft aesthetic.

## 🌐 Backend & Real-time (The Sync)
* **Node.js & Express**: Lightweight backend server to host the app and handle API requests.
* **Socket.io**: The heart of the collaboration system. Used for:
    * Real-time shared Pomodoro timer synchronization.
    * Instant room chat messages.
    * Live participant presence (who is currently at the desk).
    * Task completion broadcasts.
* **Groq API**: High-speed AI inference for the "Chibi God" Quiz Mode, utilizing open-source models (like Llama 3 or Mixtral) to generate study quizzes.

## 💾 Storage & Persistence
* **Browser LocalStorage**: Stores nickname, selected avatar, and current room ID. Ensures users remain in their "identity" even after a page refresh.
* **In-Memory Server State**: Manages active rooms and shared timer states on the backend.

## 🎵 Assets & Media
* **Visuals**: PNG Chibi avatars and the "Serenity God" character.
* **Audio**: `notif.mp3` for gentle Pomodoro and task notifications.
* **Animations**: CSS-based micro-interactions and transitions for a "living" UI.

## 🛠️ Development Tools
* **NPM**: Package management.
* **Vite (Optional)**: For fast development and bundling if the project grows complex.
