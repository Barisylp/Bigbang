import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import { Player } from "./classes/Player";
import path from "path";
import cors from "cors";
import { DOOR_DECK, TREASURE_DECK, GameCard } from "./data/cards";

function generateRoomId(): string {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function initializeDoorDeck(): GameCard[] {
    // 2Copies of each card
    let deck: GameCard[] = [];
    DOOR_DECK.forEach(card => {
        deck.push({ ...card, id: card.id + "_1" }); // Unique ID for copies
        deck.push({ ...card, id: card.id + "_2" });
    });

    // Shuffle (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

function initializeTreasureDeck(): GameCard[] {
    // 2Copies of each card
    let deck: GameCard[] = [];
    TREASURE_DECK.forEach(card => {
        deck.push({ ...card, id: card.id + "_1" }); // Unique ID for copies
        deck.push({ ...card, id: card.id + "_2" });
    });

    // Shuffle (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

interface Room {
    id: string;
    hostId: string;
    players: Player[];
    started: boolean;
    currentTurn: number;
    discardPile: any[];
    doorDeck: any[]; // GameCard[]

    treasureDeck: any[]; // GameCard[]
    currentCombat?: {
        monster: any; // MonsterCard
        playerId: string;
        status: 'active' | 'resolved';
    };
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
            discardPile: [],

            doorDeck: initializeDoorDeck(),
            treasureDeck: initializeTreasureDeck()
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

            // Altın Değeri Varsa Ekle
            if (discardedCard.goldValue) {
                player.gold += discardedCard.goldValue;
            }

            room.discardPile.push(discardedCard);

            console.log(`Player ${player.name} discarded: ${discardedCard.name}, Gained ${discardedCard.goldValue || 0} Gold`);
            io.to(roomId).emit("roomUpdate", room);
        }
    });

    // 🚪 KAPI KARTI ÇEK (KAPIYI TEKMELE)
    socket.on("drawDoorCard", ({ roomId }: { roomId: string }) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        // Deste bittiyse yenile
        if (!room.doorDeck || room.doorDeck.length === 0) {
            room.doorDeck = initializeDoorDeck();
            console.log("Door Deck Reshuffled!");
            io.to(roomId).emit("notification", "Kapı destesi bitti ve yeniden karıldı!");
        }

        const card = room.doorDeck.pop();
        if (card) {
            console.log(`Player ${player.name} drew door card: ${card.name} (${card.subType})`);

            if (card.subType === 'monster') {
                // CANAVAR ÇIKTI, DÖVÜŞ BAŞLASIN
                room.currentCombat = {
                    monster: card,
                    playerId: player.id,
                    status: 'active'
                };
                io.to(roomId).emit("combatStarted", { monster: card, playerId: player.id });
                io.to(roomId).emit("roomUpdate", room);
                io.to(roomId).emit("notification", `${player.name} bir canavarla karşılaştı: ${card.name}! (Seviye ${card.level})`);
            } else {
                // Canavar değilse ele al
                player.hand.push(card);
                io.to(roomId).emit("roomUpdate", room);
            }
        }
    });

    // ⚔️ DÖVÜŞÜ ÇÖZ
    socket.on("resolveCombat", ({ roomId }: { roomId: string }) => {
        const room = rooms[roomId];
        if (!room || !room.currentCombat || room.currentCombat.status !== 'active') return;

        const player = room.players.find(p => p.id === room.currentCombat?.playerId);
        if (!player) return;

        if (socket.id !== player.id) {
            // Sadece savaştaki oyuncu çözebilir (şimdilik)
            return;
        }

        const monster = room.currentCombat.monster;

        // Player Strength Check (Need to recalculate here or trust client? -> Should recalculate on server)
        // Re-calculating using logic from Player class (getter logic)
        // Since `player` is an instance of Player class (memory object), the getter `combatStrength` should work!
        const playerStrength = player.combatStrength;
        const monsterStrength = monster.level; // Basic monster level for now

        console.log(`Combat: Player ${playerStrength} vs Monster ${monsterStrength}`);

        if (playerStrength > monsterStrength) {
            // WIN
            console.log("Player Wins!");
            // 1. Level Up
            const oldLevel = player.level;
            player.level = Math.min(10, player.level + (monster.levelReward || 1));

            // 2. Draw Treasures
            const treasureCount = monster.treasure || 1;
            const earnedTreasures = [];
            for (let i = 0; i < treasureCount; i++) {
                if (!room.treasureDeck || room.treasureDeck.length === 0) {
                    room.treasureDeck = initializeTreasureDeck();
                    io.to(roomId).emit("notification", "Hazine destesi bitti ve yeniden karıldı!");
                }
                const tCard = room.treasureDeck.pop();
                if (tCard) {
                    player.hand.push(tCard);
                    earnedTreasures.push(tCard.name);
                }
            }

            io.to(roomId).emit("notification", `${player.name} canavarı yendi! Seviye: ${oldLevel} -> ${player.level}. Hazineler: ${earnedTreasures.join(", ")}`);
            io.to(roomId).emit("combatResolved", { result: 'win', player });
        } else {
            // LOSE -> Bad Stuff
            console.log("Player Loses!");
            // Implementing generic Bad Stuff: Lose 1 Level (min 1)
            // TODO: Implement specific card bad stuff later
            const oldLevel = player.level;
            player.level = Math.max(1, player.level - 1);

            io.to(roomId).emit("notification", `${player.name} savaşı kaybetti! Canavarın laneti üzerine çöktü. Seviye: ${oldLevel} -> ${player.level}.`);
            io.to(roomId).emit("combatResolved", { result: 'loss', player });
        }

        // End Combat State
        room.currentCombat = undefined;
        io.to(roomId).emit("roomUpdate", room);
    });

    // 🏆 HAZİNE KARTI ÇEK
    socket.on("drawTreasureCard", ({ roomId }: { roomId: string }) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        // Deste bittiyse yenile
        if (!room.treasureDeck || room.treasureDeck.length === 0) {
            room.treasureDeck = initializeTreasureDeck();
            console.log("Treasure Deck Reshuffled!");
            io.to(roomId).emit("notification", "Hazine destesi bitti ve yeniden karıldı!");
        }

        const card = room.treasureDeck.pop();
        if (card) {
            player.hand.push(card);
            console.log(`Player ${player.name} drew treasure card: ${card.name}`);
            io.to(roomId).emit("roomUpdate", room);
        }
    });

    // 💰 SEVİYE SATIN AL
    socket.on("buyLevel", ({ roomId }: { roomId: string }) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        // Kural: Max seviye 9 olabilir. 10. seviyeyi satın alamazsın.
        if (player.level >= 9) {
            socket.emit("error", "Seviye 9'dan sonra satın alamazsın! Canavar yenmelisin.");
            return;
        }

        if (player.gold >= 1000) {
            const affordableLevels = Math.floor(player.gold / 1000);
            // Kazanabileceği maksimum seviye (9'a kadar)
            const gainableLevels = 9 - player.level;

            // Gerçekten alacağı seviye sayısı (paranın yettiği ile 9'a kalan arasındaki minimum)
            // Ama her tıklamada 1 seviye alsın demek daha mantıklı UI açısından, 
            // Veya "Hepsini al" mantığı? 
            // Kullanıcı "turu bitir tuşunun yanına seviye al tuşu yap" dedi. Tek tek almak daha güvenli.

            player.gold -= 1000;
            player.level += 1;

            console.log(`Player ${player.name} bought a level. New Level: ${player.level}, Gold Left: ${player.gold}`);
            io.to(roomId).emit("roomUpdate", room);
            io.to(roomId).emit("notification", `${player.name} 1000 Altın harcayarak Seviye aldığı! (Lvl ${player.level})`);
        } else {
            socket.emit("error", "Yeterli altının yok! (1000 Altın = 1 Seviye)");
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
