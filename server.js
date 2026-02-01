const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/avatars', express.static(path.join(__dirname, 'avatars')));

// In-memory room state
// roomID -> { participants: [ {id, nickname, avatar} ], timer: { ... } }
const rooms = {};

// Socket.io logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ roomId, user }) => {
        // Create room if it doesn't exist
        if (!rooms[roomId]) {
            rooms[roomId] = {
                participants: [],
                timer: {
                    timeLeft: 25 * 60, // Default 25 mins
                    mode: 'focus', // focus, short-break, long-break
                    isRunning: false,
                    intervalId: null,
                    durations: {
                        focus: 25 * 60,
                        'short-break': 5 * 60,
                        'long-break': 15 * 60
                    }
                }
            };
        }

        const room = rooms[roomId];

        // Check if room is full (max 4)
        if (room.participants.length >= 4) {
            socket.emit('room-full');
            return;
        }

        // Add user to room
        const participant = {
            id: socket.id,
            nickname: user.nickname,
            avatar: user.avatar
        };
        room.participants.push(participant);
        socket.join(roomId);

        // Tell everyone who is here (including the new joiner)
        io.to(roomId).emit('update-participants', room.participants);
        // Send current timer state immediately
        const { intervalId, ...timerState } = room.timer; // Don't send the intervalId
        socket.emit('timer-update', timerState);
        // Send current tasks
        if (room.tasks) {
            socket.emit('update-tasks', room.tasks);
        }

        console.log(`${user.nickname} joined room ${roomId}. Total: ${room.participants.length}`);

        // --- TIMER HANDLERS (Only need one listener setup per socket, but scoped to room) ---

        socket.on('start-timer', () => {
            if (!room.timer.isRunning) {
                room.timer.isRunning = true;

                // Clear any existing interval just in case
                if (room.timer.intervalId) clearInterval(room.timer.intervalId);

                room.timer.intervalId = setInterval(() => {
                    if (room.timer.timeLeft > 0) {
                        room.timer.timeLeft--;
                    } else {
                        // Timer finished!
                        clearInterval(room.timer.intervalId);
                        room.timer.isRunning = false;
                        io.to(roomId).emit('timer-finished', room.timer.mode);

                        // Auto-switch modes (Focus -> Short Break, Break -> Focus)
                        // Simplified flow for now
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
                }, 1000); // Tick every second

                // Broadcast immediately
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
            // Reset to start of current mode using custom durations
            room.timer.timeLeft = room.timer.durations[room.timer.mode];

            const { intervalId, ...state } = room.timer;
            io.to(roomId).emit('timer-update', state);
        });

        // Set mode manually
        socket.on('set-timer-mode', (mode) => {
            clearInterval(room.timer.intervalId);
            room.timer.isRunning = false;
            room.timer.mode = mode;

            room.timer.timeLeft = room.timer.durations[mode];

            const { intervalId, ...state } = room.timer;
            io.to(roomId).emit('timer-update', state);
        });

        // Set custom durations
        socket.on('set-timer-durations', (durations) => {
            // durations = { focus: mins, 'short-break': mins, 'long-break': mins }
            clearInterval(room.timer.intervalId);
            room.timer.isRunning = false;

            room.timer.durations = {
                focus: (durations.focus || 25) * 60,
                'short-break': (durations['short-break'] || 5) * 60,
                'long-break': (durations['long-break'] || 15) * 60
            };

            // Reset current timer to new duration
            room.timer.timeLeft = room.timer.durations[room.timer.mode];

            const { intervalId, ...state } = room.timer;
            io.to(roomId).emit('timer-update', state);
        });

        // --- CHAT HANDLERS ---
        socket.on('chat-message', (message) => {
            const sender = room.participants.find(p => p.id === socket.id);
            if (sender && message.trim()) {
                io.to(roomId).emit('new-message', {
                    nickname: sender.nickname,
                    avatar: sender.avatar,
                    text: message.trim(),
                    timestamp: Date.now()
                });
            }
        });

        socket.on('send-reaction', (emoji) => {
            const sender = room.participants.find(p => p.id === socket.id);
            if (sender) {
                io.to(roomId).emit('new-reaction', {
                    nickname: sender.nickname,
                    emoji: emoji
                });
            }
        });

        // --- TASK HANDLERS ---
        socket.on('add-task', (taskText) => {
            if (!room.tasks) room.tasks = [];

            const newTask = {
                id: Date.now().toString(), // Simple unique ID
                text: taskText,
                completed: false,
                author: room.participants.find(p => p.id === socket.id)?.nickname || 'Someone'
            };
            room.tasks.push(newTask);
            io.to(roomId).emit('update-tasks', room.tasks);
        });

        socket.on('toggle-task', (taskId) => {
            if (!room.tasks) return;
            const task = room.tasks.find(t => t.id === taskId);
            if (task) {
                task.completed = !task.completed;
                io.to(roomId).emit('update-tasks', room.tasks);

                if (task.completed) {
                    io.to(roomId).emit('task-completed-celebration', task.text);
                }
            }
        });

        socket.on('delete-task', (taskId) => {
            if (!room.tasks) return;
            room.tasks = room.tasks.filter(t => t.id !== taskId);
            io.to(roomId).emit('update-tasks', room.tasks);
        });


        // Handle Disconnect
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            // Remove user from room
            const index = room.participants.findIndex(p => p.id === socket.id);
            if (index !== -1) {
                const leaver = room.participants[index];
                room.participants.splice(index, 1);

                // Broadcast update
                io.to(roomId).emit('update-participants', room.participants);
                console.log(`${leaver.nickname} left room ${roomId}.`);

                // If room empty, clean up
                if (room.participants.length === 0) {
                    if (room.timer.intervalId) clearInterval(room.timer.intervalId);
                    delete rooms[roomId];
                    console.log(`Room ${roomId} deleted.`);
                }
            }
        });
    });

});

server.listen(PORT, () => {
    console.log(`🌸 Serenity server is running on http://localhost:${PORT}`);
});
