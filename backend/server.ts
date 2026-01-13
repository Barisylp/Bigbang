import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import { Player } from "./Player";
import path from "path";
import cors from "cors";

function generateRoomId(): string {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

interface Room {
    id: string;
    hostId: string;
    players: Player[];
    started: boolean;
    currentTurn: number;
}

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const rooms: Record<string, Room> = {};

io.on("connection", (socket: Socket) => {
    console.log("Bağlanan:", socket.id);

    // 🏠 ODA OLUŞTUR
    socket.on("createRoom", ({ playerName }: { playerName: string }) => {
        const roomId = generateRoomId();

        const player = new Player(socket.id, playerName);
        
        const room: Room = {
            id: roomId,
            hostId: socket.id,
            players: [player],
            started: false,
            currentTurn: 0
        };

        rooms[roomId] = room;
        socket.join(roomId);

        console.log("ROOM CREATED:", room);

        socket.emit("roomCreated", { roomId });
        io.to(roomId).emit("roomUpdate", room);
    });

    // ➕ ODAYA KATIL
    socket.on("joinRoom", ({ roomId, playerName }: { roomId: string; playerName: string }) => {
        const room = rooms[roomId];
        if (!room) {
            socket.emit("error", "Oda bulunamadı");
            return;
        }

        // Prevent duplicate joining if needed, or re-connect logic
        const existingPlayer = room.players.find(p => p.id === socket.id);
        if (!existingPlayer) {
             const player = new Player(socket.id, playerName);
             room.players.push(player);
        }

        console.log("ROOM JOINED:", room);

        socket.join(roomId);
        io.to(roomId).emit("roomUpdate", room);
    });


    // ▶️ OYUNU BAŞLAT
    socket.on("startGame", (roomId: string) => {
        const room = rooms[roomId];
        if (!room) return;

        if (socket.id !== room.hostId) return;

        room.started = true;
        io.to(roomId).emit("gameStarted", room);
    });

    // 🔁 SIRA GEÇ
    socket.on("endTurn", (roomId: string) => {
        const room = rooms[roomId];
        if (!room) return;

        room.currentTurn = (room.currentTurn + 1) % room.players.length;

        io.to(roomId).emit("turnChanged", room);
    });

    // ❌ ÇIKIŞ
    socket.on("disconnect", () => {
        console.log("Ayrılan:", socket.id);
        for (const roomId in rooms) {
            const room = rooms[roomId];
            // Remove player
            room.players = room.players.filter(p => p.id !== socket.id);

            if (room.players.length === 0) {
                delete rooms[roomId];
            } else {
                io.to(roomId).emit("roomUpdate", room);
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () =>
    console.log(`Server ${PORT} portunda çalışıyor`)
);
