const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Player = require("./Player");
const path = require("path");

function generateRoomId() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});
app.use(express.static("public"));

app.use(express.static(path.join(__dirname, "public")));
const rooms = {}; // Tüm odalar burada tutulur

io.on("connection", (socket) => {
    console.log("Bağlanan:", socket.id);

    // 🏠 ODA OLUŞTUR
    socket.on("createRoom", ({ playerName }) => {
        const roomId = generateRoomId();

        const room = {
            id: roomId,
            hostId: socket.id,
            players: []
        };

        const player = new Player(socket.id, playerName);
        room.players.push(player); // ✅ SADECE BURASI

        rooms[roomId] = room;
        socket.join(roomId);

        console.log("ROOM CREATED:", room);

        socket.emit("roomCreated", { roomId });
        io.to(roomId).emit("roomUpdate", room);
    });

    // ➕ ODAYA KATIL
    socket.on("joinRoom", ({ roomId, playerName }) => {
        const room = rooms[roomId];
        if (!room) {
            socket.emit("error", "Oda bulunamadı");
            return;
        }

        const player = new Player(socket.id, playerName);
        room.players.push(player); // ✅ SADECE BU

        console.log("ROOM:", room);

        socket.join(roomId);
        io.to(roomId).emit("roomUpdate", room);
    });


    // ▶️ OYUNU BAŞLAT
    socket.on("startGame", (roomId) => {
        const room = rooms[roomId];
        if (!room) return;

        if (socket.id !== room.hostId) return;

        room.started = true;
        io.to(roomId).emit("gameStarted", room);
    });

    // 🔁 SIRA GEÇ
    socket.on("endTurn", (roomId) => {
        const room = rooms[roomId];
        if (!room) return;

        room.currentTurn =
            (room.currentTurn + 1) % room.players.length;

        io.to(roomId).emit("turnChanged", room);
    });

    // ❌ ÇIKIŞ
    socket.on("disconnect", () => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            room.players = room.players.filter(p => p.id !== socket.id);

            if (room.players.length === 0) {
                delete rooms[roomId];
            } else {
                io.to(roomId).emit("roomUpdate", room);
            }
        }
    });
});

server.listen(3000, () =>
    console.log("Server 3000 portunda çalışıyor")
);
