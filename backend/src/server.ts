import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import { Player } from "./classes/Player";
import path from "path";
import cors from "cors";
import { DOOR_DECK, TREASURE_DECK } from "./data/cards";

function generateRoomId(): string {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

interface Room {
    id: string;
    hostId: string;
    players: Player[];
    started: boolean;
    currentTurn: number;
    discardPile: any[];
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
            currentTurn: 0,
            discardPile: []
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

        console.log("Starting game for room", roomId);

        // Deal 4 Door cards and 4 Treasure cards to each player
        room.players.forEach(player => {
            player.hand = []; // Reset hand
            // Simple mock dealing - random from decks
            for (let i = 0; i < 4; i++) {
                player.hand.push(DOOR_DECK[Math.floor(Math.random() * DOOR_DECK.length)]);
                player.hand.push(TREASURE_DECK[Math.floor(Math.random() * TREASURE_DECK.length)]);
            }
        });

        room.started = true;
        io.to(roomId).emit("gameStarted", room);
        io.to(roomId).emit("roomUpdate", room);
    });

    // 🔁 SIRA GEÇ
    socket.on("endTurn", (roomId: string) => {
        const room = rooms[roomId];
        if (!room) return;

        room.currentTurn = (room.currentTurn + 1) % room.players.length;
        console.log("Turn changed to", room.currentTurn);

        io.to(roomId).emit("turnChanged", room);
        io.to(roomId).emit("roomUpdate", room);
    });

    // 🃏 KART OYNA
    socket.on("playCard", ({ roomId, cardId }: { roomId: string; cardId: string }) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        // Kartı elinden bul ve çıkar
        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex > -1) {
            const playedCard = player.hand[cardIndex];
            player.hand.splice(cardIndex, 1);
            console.log(`Player ${player.name} played card: ${playedCard.name} (${playedCard.subType})`);

            // Kart Türüne Göre İşlem Yap
            if (playedCard.subType === 'item') {
                const itemSlot = playedCard.slot;
                if (itemSlot) {
                    // Check slot limits
                    let existingItemIndex = -1;

                    if (itemSlot === 'hand') {
                        // Max 2 hands
                        const handItems = player.equipment.filter(i => i.slot === 'hand');
                        if (handItems.length >= 2) {
                            // Find the first hand item to replace (simple swap)
                            existingItemIndex = player.equipment.findIndex(i => i.slot === 'hand');
                        }
                    } else {
                        // Max 1 for other slots
                        existingItemIndex = player.equipment.findIndex(i => i.slot === itemSlot);
                    }

                    if (existingItemIndex > -1) {
                        // Unequip old item (return to hand)
                        const oldItem = player.equipment[existingItemIndex];
                        player.equipment.splice(existingItemIndex, 1);
                        player.hand.push(oldItem);
                        console.log(`Swapped ${oldItem.name} with ${playedCard.name}`);
                    }
                }
                player.equipment.push(playedCard);
            } else if (playedCard.subType === 'race') {
                // Varsa eski ırkı ele geri al veya at (basitlik için direkt değişiyor)
                player.race = playedCard;
            } else if (playedCard.subType === 'class') {
                player.class = playedCard;
            } else if (playedCard.subType === 'blessing') {
                // Kutsama efekti - şimdilik sadece mesaj
                console.log("Blessing played:", playedCard.effect);
                // Tek kullanımlık olduğu için yok olur (zaten elden silindi)
            } else {
                // Diğer kartlar (örneğin canavar oynandı - şu anlık boş)
                console.log("Other card played");
            }

            io.to(roomId).emit("roomUpdate", room);
        }
    });

    // 🗑️ KART ATMA
    socket.on("discardCard", ({ roomId, cardId }: { roomId: string; cardId: string }) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex > -1) {
            const discardedCard = player.hand[cardIndex];
            player.hand.splice(cardIndex, 1);
            room.discardPile.push(discardedCard);

            console.log(`Player ${player.name} discarded: ${discardedCard.name}`);
            io.to(roomId).emit("roomUpdate", room);
        }
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
