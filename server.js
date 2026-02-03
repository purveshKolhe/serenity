const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/avatars', express.static(path.join(__dirname, 'avatars')));
app.use('/bgs', express.static(path.join(__dirname, 'bgs')));

app.use('/vids', express.static(path.join(__dirname, 'vids')));

// API to list videos sorted alphabetically
const fs = require('fs');
app.get('/api/vids', (req, res) => {
    const vidDir = path.join(__dirname, 'vids');
    fs.readdir(vidDir, (err, files) => {
        if (err) return res.status(500).json([]);
        const sorted = files.filter(f => /\.(png|gif|webm|mp4)$/i.test(f)).sort();
        res.json(sorted);
    });
});

app.get('/api/avatars', (req, res) => {
    const avatarDir = path.join(__dirname, 'avatars');
    fs.readdir(avatarDir, (err, files) => {
        if (err) return res.status(500).json([]);
        const sorted = files.filter(f => /\.(png|gif|webm|jpg|jpeg)$/i.test(f)).sort();
        res.json(sorted);
    });
});

// In-memory room state
const rooms = {};

// Socket.io logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ roomId, user }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = {
                participants: [],
                timer: {
                    timeLeft: 25 * 60,
                    mode: 'focus',
                    isRunning: false,
                    intervalId: null,
                    durations: {
                        focus: 25 * 60,
                        'short-break': 5 * 60,
                        'long-break': 15 * 60
                    }
                },
                tasks: []
            };
        }

        const room = rooms[roomId];

        if (room.participants.length >= 4) {
            socket.emit('room-full');
            return;
        }

        const participant = {
            id: socket.id,
            nickname: user.nickname,
            avatar: user.avatar,
            xp: 0,
            level: 1
        };
        room.participants.push(participant);
        socket.join(roomId);

        io.to(roomId).emit('update-participants', room.participants);
        const { intervalId, ...timerState } = room.timer;
        socket.emit('timer-update', timerState);
        socket.emit('update-tasks', room.tasks);

        console.log(`${user.nickname} joined room ${roomId}. Total: ${room.participants.length}`);

        // --- TIMER HANDLERS ---
        socket.on('start-timer', () => {
            if (!room.timer.isRunning) {
                room.timer.isRunning = true;
                if (room.timer.intervalId) clearInterval(room.timer.intervalId);

                room.timer.intervalId = setInterval(() => {
                    if (room.timer.timeLeft > 0) {
                        room.timer.timeLeft--;
                    } else {
                        clearInterval(room.timer.intervalId);
                        room.timer.isRunning = false;
                        io.to(roomId).emit('timer-finished', room.timer.mode);

                        // Award XP
                        const xpGain = room.timer.mode === 'focus' ? 50 : 10;
                        const reason = room.timer.mode === 'focus' ? 'Focus Session Complete! 🔥' : 'Break Complete! 🍃';

                        room.participants.forEach(p => {
                            p.xp += xpGain;
                            checkLevelUp(p, roomId, io);
                        });

                        io.to(roomId).emit('update-participants', room.participants);
                        io.to(roomId).emit('xp-gained-all', { amount: xpGain, reason });

                        if (room.timer.mode === 'focus') {
                            room.timer.mode = 'short-break';
                            room.timer.timeLeft = room.timer.durations['short-break'];
                        } else {
                            room.timer.mode = 'focus';
                            room.timer.timeLeft = room.timer.durations['focus'];
                        }
                    }
                    const { intervalId, ...state } = room.timer;
                    io.to(roomId).emit('timer-update', state);
                }, 1000);

                const { intervalId, ...state } = room.timer;
                io.to(roomId).emit('timer-update', state);
            }
        });

        socket.on('pause-timer', () => {
            if (room.timer.isRunning) {
                clearInterval(room.timer.intervalId);
                room.timer.isRunning = false;
                const { intervalId, ...state } = room.timer;
                io.to(roomId).emit('timer-update', state);
            }
        });

        socket.on('reset-timer', () => {
            clearInterval(room.timer.intervalId);
            room.timer.isRunning = false;
            room.timer.timeLeft = room.timer.durations[room.timer.mode];
            const { intervalId, ...state } = room.timer;
            io.to(roomId).emit('timer-update', state);
        });

        socket.on('set-timer-mode', (mode) => {
            clearInterval(room.timer.intervalId);
            room.timer.isRunning = false;
            room.timer.mode = mode;
            room.timer.timeLeft = room.timer.durations[mode];
            const { intervalId, ...state } = room.timer;
            io.to(roomId).emit('timer-update', state);
        });

        socket.on('set-timer-durations', (durations) => {
            clearInterval(room.timer.intervalId);
            room.timer.isRunning = false;
            room.timer.durations = {
                focus: (durations.focus || 25) * 60,
                'short-break': (durations['short-break'] || 5) * 60,
                'long-break': (durations['long-break'] || 15) * 60
            };
            room.timer.timeLeft = room.timer.durations[room.timer.mode];
            const { intervalId, ...state } = room.timer;
            io.to(roomId).emit('timer-update', state);
        });

        // --- TASK HANDLERS ---
        socket.on('add-task', (taskText) => {
            const newTask = {
                id: Date.now().toString(),
                text: taskText,
                completed: false,
                author: room.participants.find(p => p.id === socket.id)?.nickname || 'Someone'
            };
            room.tasks.push(newTask);
            io.to(roomId).emit('update-tasks', room.tasks);
        });

        socket.on('toggle-task', (taskId) => {
            const task = room.tasks.find(t => t.id === taskId);
            if (task) {
                task.completed = !task.completed;
                io.to(roomId).emit('update-tasks', room.tasks);

                if (task.completed) {
                    const p = room.participants.find(p => p.id === socket.id);
                    if (p) {
                        const earned = 25;
                        p.xp += earned;
                        checkLevelUp(p, roomId, io);
                        socket.emit('xp-gained', { amount: earned, reason: 'Task Completed! ✅' });
                        io.to(roomId).emit('update-participants', room.participants);
                        io.to(roomId).emit('task-completed-celebration', task.text);
                    }
                }
            }
        });

        socket.on('delete-task', (taskId) => {
            room.tasks = room.tasks.filter(t => t.id !== taskId);
            io.to(roomId).emit('update-tasks', room.tasks);
        });

        // --- CHIBI GOD & CHAT ---
        socket.on('chat-message', (text) => {
            const p = room.participants.find(p => p.id === socket.id);
            if (p) {
                io.to(roomId).emit('new-message', {
                    nickname: p.nickname,
                    avatar: p.avatar,
                    text: text,
                    timestamp: Date.now()
                });
            }
        });

        socket.on('send-reaction', (emoji) => {
            io.to(roomId).emit('new-reaction', { emoji });
        });

        // --- QUIZ HANDLERS (V2 Robust) ---
        socket.on('start-quiz-v2', async (topic) => {
            if (!process.env.GROQ_API_KEY) return;

            room.quizSession = {
                topic,
                questions: [],
                currentQuestionIndex: 0,
                scores: {},
                timers: []
            };
            room.participants.forEach(p => room.quizSession.scores[p.id] = 0);

            io.to(roomId).emit('quiz-state-loading');

            try {
                const prompt = `Generate 10 multiple-choice questions about "${topic}". 
                Return a JSON Object with a "questions" key containing an array of objects.
                Each object must have:
                - "question": string
                - "options": array of 4 strings
                - "correctIndex": integer (0-3)
                
                Ensure valid JSON.`;

                const completion = await groq.chat.completions.create({
                    messages: [{ role: "user", content: prompt }],
                    model: "openai/gpt-oss-120b",
                    response_format: { type: "json_object" }
                });

                const data = JSON.parse(completion.choices[0]?.message?.content);
                if (data.questions && Array.isArray(data.questions)) {
                    room.quizSession.questions = data.questions;
                    runQuizStepV2(roomId, room);
                }
            } catch (error) {
                console.error(error);
                io.to(roomId).emit('quiz-state-error');
            }
        });

        socket.on('submit-answer-v2', ({ qIndex, aIndex }) => {
            const session = room.quizSession;
            if (!session || session.currentQuestionIndex !== qIndex || session.isRevealed) return;

            if (!session.answeredUsers) session.answeredUsers = new Set();
            if (session.answeredUsers.has(socket.id)) return;

            session.answeredUsers.add(socket.id);
            const isCorrect = session.questions[qIndex].correctIndex === aIndex;

            if (isCorrect) {
                const points = 100;
                session.scores[socket.id] = (session.scores[socket.id] || 0) + points;

                const p = room.participants.find(p => p.id === socket.id);
                if (p) {
                    p.xp = (p.xp || 0) + points;
                    checkLevelUp(p, roomId, io);
                    io.to(roomId).emit('update-participants', room.participants);
                }
                socket.emit('quiz-feedback-v2', { correct: true, newScore: session.scores[socket.id] });
            } else {
                socket.emit('quiz-feedback-v2', { correct: false });
            }
        });

        function runQuizStepV2(roomId, room) {
            const session = room.quizSession;
            if (!session) return;

            if (session.currentQuestionIndex >= session.questions.length) {
                const leaderboard = room.participants
                    .map(p => ({
                        nickname: p.nickname,
                        avatar: p.avatar,
                        score: session.scores[p.id] || 0
                    }))
                    .sort((a, b) => b.score - a.score);
                io.to(roomId).emit('quiz-state-gameover', leaderboard);
                room.quizSession = null;
                return;
            }

            session.answeredUsers = new Set();
            session.isRevealed = false;
            const q = session.questions[session.currentQuestionIndex];

            io.to(roomId).emit('quiz-state-question', {
                current: session.currentQuestionIndex + 1,
                total: session.questions.length,
                question: q.question,
                options: q.options,
                timeLeft: 15
            });

            const revealTimer = setTimeout(() => {
                session.isRevealed = true;
                io.to(roomId).emit('quiz-state-reveal', { correctIndex: q.correctIndex });

                const nextTimer = setTimeout(() => {
                    session.currentQuestionIndex++;
                    runQuizStepV2(roomId, room);
                }, 5000);
                session.timers.push(nextTimer);
            }, 15000);
            session.timers.push(revealTimer);
        }

        // Handle Disconnect
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            const index = room.participants.findIndex(p => p.id === socket.id);
            if (index !== -1) {
                const leaver = room.participants[index];
                room.participants.splice(index, 1);
                io.to(roomId).emit('update-participants', room.participants);
                console.log(`${leaver.nickname} left room ${roomId}.`);
                if (room.participants.length === 0) {
                    if (room.timer.intervalId) clearInterval(room.timer.intervalId);
                    if (room.quizSession && room.quizSession.timers) {
                        room.quizSession.timers.forEach(t => clearTimeout(t));
                    }
                    delete rooms[roomId];
                    console.log(`Room ${roomId} deleted.`);
                }
            }
        });
    });
});

// --- HELPERS ---
function checkLevelUp(participant, roomId, io) {
    if (!participant) return;
    participant.level = participant.level || 1;
    participant.xp = participant.xp || 0;
    const previousLevel = participant.level;
    const newLevel = 1 + Math.floor(participant.xp / 500);

    if (newLevel > previousLevel) {
        participant.level = newLevel;
        io.to(roomId).emit('player-leveled-up', {
            id: participant.id,
            nickname: participant.nickname,
            newLevel: newLevel
        });
    }
}

server.listen(PORT, () => {
    console.log(`🌸 Serenity server is running on http://localhost:${PORT}`);
});
