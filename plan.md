# 🌸 Project Concept (Clear Vision)

We're called Serenity.
* **Private study collaboration site**
* For **friends**, not strangers
* Focused on:

  * Vibes
  * Cuteness
  * Light accountability
  * Flex-worthy aesthetics
* No heavy productivity pressure
* No auth, no seriousness, no “grind culture”

---

# 👥 Rooms

* **Private rooms only**
* **Max 4 people per room**
* Rooms are:

  * **Named freely** (not topic-based)
  * Friend-centric
* Same group studies together repeatedly

---

# 🧸 Identity System (No Login)

* No accounts, no authentication
* Every session:

  * User must choose:

    * **Nickname**
    * **One chibi avatar**
* Avatar options:

  * 5 male
  * 5 female
  * 5 unisex
* Identity resets every visit (intentional + casual)

---

# ⏱️ Shared Pomodoro System (Core Feature)

* Fully **synced for everyone in the room**
* Adjustable:

  * Focus duration
  * Short break duration
  * Long break duration
* Everyone:

  * Starts together
  * Breaks together
  * Resumes together
* Timer state visible to all members

---

# ✅ Task & Goal Tracking

* **Room-level tasks**
* Short-term only
* Examples:

  * “Finish Chapter 3”
  * “Solve 20 numericals”
* Tasks can be:

  * Added
  * Marked complete
* Completion triggers:

  * Cute visual feedback
  * Reward points (see rewards section)

---

# 📊 Progress Visualisation (Short-Term Only)

* No weekly/monthly analytics
* Only **current session progress**
* Examples:

  * Time studied in this session
  * Tasks completed in this room today
* Purpose:

  * Motivation
  * Not long-term pressure

---

# 💬 Room Chat

* Text chat
* Quick reactions (emojis / cute reactions)
* Chat shows:

  * Nickname
  * Chibi avatar of each participant
* Used for:

  * Casual talk
  * Discussing study
  * Quiz discussions

---

# 🎀 Cute Accountability (Very High Priority)

* Gentle nudges only
* Examples:

  * “Everyone’s ready 🐣”
  * “Break’s over, come back 💖”
* No guilt
* No warnings
* No streak pressure
* Entire tone = adorable, playful, soft

---

# 🏆 Rewards System

* Earned by:

  * Completing tasks
  * Completing pomodoro cycles
  * Participating in quizzes
* Rewards can unlock:

  * Cosmetic things
  * Fun visuals
* No leaderboard obsession
* More “cute progress” than competition

---

# 🎨 Chibi Visual System (Strong Identity)

## Characters

* Chibi avatars (as mentioned above)
* Consistent art style everywhere

## Room UI

* **3 different room UI styles**
* All chibi-themed
* No background music
* A desk at a corner showing the participants avatars studying.

## Notifications

* Chibi toast notifications
* Cute sounds
* Soft animations
* No loud or aggressive alerts

---

# 🛐 Chibi God (Special Feature)

* A **chibi god character** watches over the room
* Passive presence by default

## Quiz Mode

* Users ask the chibi god to:

  * Generate quizzes on what they’re studying
* Quiz flow:

  * Quiz appears
  * Everyone attempts
  * Answers discussed together in chat
* Competitive but playful

---

# 🤖 AI Usage (Limited & Intentional)

* Only used for:

  * Quiz generation
* Model:

  * GPT OSS 120B via Groq

---

# 🔐 Moderation & Safety (Minimal by Choice)

* No strict moderation tools
* No reporting systems
* Trust-based friend rooms
* Nicknames + avatars only
* No personal data collected

---

# 🧩 Overall Vibe Summary

* Cute
* Fast
* Disposable but memorable
* Something people:
  * Flex a lot
---

# How:
* Use links to share room, socket io. same for chat. 
* Focus is cute UI. 
* Everything stored in local storage such that refresh does not cause loss of data. It also shouldn't remove a participant from a room. 