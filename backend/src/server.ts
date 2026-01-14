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
    phase: 'kick' | 'action' | 'combat' | 'end';
    pendingDraw?: {
        card: any;
        playerId: string;
        isPublic: boolean;
    };
    currentCombat?: {
        monster: any; // MonsterCard
        playerId: string;
        status: 'active' | 'resolved';
        timer?: number;
        playerBonus?: number;
        monsterBonus?: number;
    };
    timerInterval?: NodeJS.Timeout | null;
}

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const rooms: Record<string, Room> = {};

/**
 * Sends room data to all players in the room, masking sensitive information (like other players' backpack contents)
 */
function emitRoomUpdate(roomId: string) {
    const room = rooms[roomId];
    if (!room) return;

    // Create a copy of the room and remove non-serializable objects (like timerInterval)
    const { timerInterval, ...serializableRoom } = room;

    room.players.forEach(p => {
        const maskedPlayers = room.players.map(player => {
            if (player.id === p.id) {
                return player; // Send full data to owner
            }
            return {
                ...player,
                backpack: player.backpack.map(() => ({ hidden: true })) // Mask contents but keep count
            };
        });

        const maskedRoom = { ...serializableRoom, players: maskedPlayers };
        io.to(p.id).emit("roomUpdate", maskedRoom);
    });
}

function handleResolveCombat(roomId: string) {
    const room = rooms[roomId];
    if (!room || !room.currentCombat || room.currentCombat.status !== 'active') return;

    // Clear timer
    if (room.timerInterval) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;
    }

    const currentCombat = room.currentCombat;
    const player = room.players.find(p => p.id === currentCombat.playerId);
    if (!player) return;

    const monster = currentCombat.monster;

    // Explicitly calculate strengths to ensure no type issues or missing prototype methods
    const playerLevel = Number(player.level) || 0;
    let equipmentBonus = 0;
    if (player.equipment) {
        player.equipment.forEach(item => {
            if (item.bonus) equipmentBonus += Number(item.bonus);
        });
    }

    const playerBonus = Number(currentCombat.playerBonus) || 0;
    const monsterLevel = Number(monster.level) || 0;
    const monsterBonus = Number(currentCombat.monsterBonus) || 0;

    const playerTotalStrength = playerLevel + equipmentBonus + playerBonus;
    const monsterTotalStrength = monsterLevel + monsterBonus;

    console.log(`[COMBAT RESOLUTION] Room: ${roomId}`);
    console.log(`Player: ${player.name} | Lvl: ${playerLevel} + Equip: ${equipmentBonus} + Bonus: ${playerBonus} = TOTAL: ${playerTotalStrength}`);
    console.log(`Monster: ${monster.name} | Lvl: ${monsterLevel} + Bonus: ${monsterBonus} = TOTAL: ${monsterTotalStrength}`);

    // In Munchkin, player must be STRICTLY GREATER to win (unless they have Warrior/Savasci class)
    // For now, we assume simple comparison.
    if (playerTotalStrength > monsterTotalStrength) {
        // WIN
        const oldLevel = player.level;
        player.level = Math.min(10, player.level + (monster.levelReward || 1));

        const treasureCount = monster.treasure || 1;
        const earnedTreasures = [];
        for (let i = 0; i < treasureCount; i++) {
            if (!room.treasureDeck || room.treasureDeck.length === 0) {
                room.treasureDeck = initializeTreasureDeck();
            }
            const tCard = room.treasureDeck.pop();
            if (tCard) {
                player.hand.push(tCard);
                earnedTreasures.push(tCard.name);
            }
        }

        console.log(`Result: WIN for ${player.name}`);
        io.to(roomId).emit("notification", `${player.name} canavarı yendi! Seviye: ${oldLevel} -> ${player.level}. Hazineler: ${earnedTreasures.join(", ")}`);
        io.to(roomId).emit("combatResolved", { result: 'win', player });
    } else {
        // LOSE
        const oldLevel = player.level;
        player.level = Math.max(1, player.level - 1);

        console.log(`Result: LOSS for ${player.name}`);
        io.to(roomId).emit("notification", `${player.name} savaşı kaybetti! Canavarın laneti üzerine çöktü. Seviye: ${oldLevel} -> ${player.level}.`);
        io.to(roomId).emit("combatResolved", { result: 'loss', player });
    }

    room.currentCombat = undefined;
    emitRoomUpdate(roomId);
}

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
            treasureDeck: initializeTreasureDeck(),
            phase: 'kick'
        };
        rooms[roomId] = room;
        socket.join(roomId);
        socket.emit("roomCreated", { roomId });
        emitRoomUpdate(roomId);
    });

    // ➕ ODAYA KATIL
    socket.on("joinRoom", ({ roomId, playerName }: { roomId: string; playerName: string }) => {
        const room = rooms[roomId];
        if (!room) {
            socket.emit("error", "Oda bulunamadı");
            return;
        }
        const existingPlayer = room.players.find(p => p.id === socket.id);
        if (!existingPlayer) {
            const player = new Player(socket.id, playerName);
            room.players.push(player);
        }
        socket.join(roomId);
        emitRoomUpdate(roomId);
    });

    socket.on("startGame", (roomId: string) => {
        const room = rooms[roomId];
        if (!room || socket.id !== room.hostId) return;

        console.log("Starting game for room", roomId);

        // Decks are already initialized in createRoom
        room.players.forEach(player => {
            player.hand = [];
            // Deal 4 Door and 4 Treasure
            for (let i = 0; i < 4; i++) {
                if (room.doorDeck.length === 0) room.doorDeck = initializeDoorDeck();
                const dCard = room.doorDeck.pop();
                if (dCard) player.hand.push(dCard);

                if (room.treasureDeck.length === 0) room.treasureDeck = initializeTreasureDeck();
                const tCard = room.treasureDeck.pop();
                if (tCard) player.hand.push(tCard);
            }
        });

        room.started = true;
        room.phase = 'kick';
        io.to(roomId).emit("gameStarted", room);
        emitRoomUpdate(roomId);
    });

    socket.on("endTurn", (roomId: string) => {
        const room = rooms[roomId];
        if (!room) return;
        room.currentTurn = (room.currentTurn + 1) % room.players.length;
        room.phase = 'kick';
        console.log("Turn changed to", room.currentTurn);

        io.to(roomId).emit("turnChanged", room);
        emitRoomUpdate(roomId);
    });

    // 🃏 KART OYNA
    socket.on("playCard", ({ roomId, cardId }: { roomId: string; cardId: string }) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex > -1) {
            const playedCard = player.hand[cardIndex];
            player.hand.splice(cardIndex, 1);

            if (playedCard.subType === 'item') {
                const itemSlot = playedCard.slot;
                if (itemSlot) {
                    let existingItemIndex = -1;
                    if (itemSlot === 'hand') {
                        const handItems = player.equipment.filter(i => i.slot === 'hand');
                        if (handItems.length >= 2) existingItemIndex = player.equipment.findIndex(i => i.slot === 'hand');
                    } else {
                        existingItemIndex = player.equipment.findIndex(i => i.slot === itemSlot);
                    }
                    if (existingItemIndex > -1) {
                        const oldItem = player.equipment[existingItemIndex];
                        player.equipment.splice(existingItemIndex, 1);
                        player.hand.push(oldItem);
                    }
                }
                player.equipment.push(playedCard);
            } else if (playedCard.subType === 'race') {
                player.race = playedCard;
            } else if (playedCard.subType === 'class') {
                player.class = playedCard;
            } else if (playedCard.subType === 'blessing') {
                if (playedCard.id === 'b_ballipust' || (playedCard.effect && playedCard.effect.includes && playedCard.effect.includes("Level Up"))) {
                    if (player.level < 9) player.level += 1;
                }
            }

            if (room.currentCombat && room.currentCombat.status === 'active') {
                if (room.currentCombat.timer !== undefined) room.currentCombat.timer += 2;
            }
            emitRoomUpdate(roomId);
        }
    });

    // 🪄 SAVAŞ BÜYÜSÜ OYNA
    socket.on("playFightSpell", ({ roomId, cardId, target }: { roomId: string; cardId: string; target: 'player' | 'monster' }) => {
        const room = rooms[roomId];
        if (!room || !room.currentCombat || room.currentCombat.status !== 'active') return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        let cardIndex = player.hand.findIndex(c => c.id === cardId);
        let fromHand = true;
        if (cardIndex === -1) {
            cardIndex = player.backpack.findIndex(c => c.id === cardId);
            fromHand = false;
        }

        if (cardIndex > -1) {
            const card = fromHand ? player.hand[cardIndex] : player.backpack[cardIndex];
            if (card.subType !== 'fightspells') return;

            if (fromHand) player.hand.splice(cardIndex, 1);
            else player.backpack.splice(cardIndex, 1);

            const bonus = card.bonus || 0;
            if (target === 'player') room.currentCombat.playerBonus = (room.currentCombat.playerBonus || 0) + bonus;
            else room.currentCombat.monsterBonus = (room.currentCombat.monsterBonus || 0) + bonus;

            if (room.currentCombat.timer !== undefined) {
                room.currentCombat.timer += 5;
                io.to(roomId).emit("notification", `${player.name} bir savaş büyüsü oynadı! Savaş süresi 5 saniye uzadı.`);
            }
            emitRoomUpdate(roomId);
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
            if (discardedCard.goldValue) player.gold += discardedCard.goldValue;
            room.discardPile.push(discardedCard);
            emitRoomUpdate(roomId);
        }
    });

    // 🚪 KAPI KARTI ÇEK
    socket.on("drawDoorCard", ({ roomId }: { roomId: string }) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        // Sadece sırası olan oyuncu ve doğru fazda çekebilir
        const currentPlayerIndex = room.currentTurn;
        if (room.players[currentPlayerIndex].id !== socket.id) {
            socket.emit("error", "Sıra sende değil!");
            return;
        }

        if (room.phase !== 'kick') {
            socket.emit("error", "Bu aşamada kapı kartı çekemezsin!");
            return;
        }

        // Deste bittiyse yenile
        if (!room.doorDeck || room.doorDeck.length === 0) {
            room.doorDeck = initializeDoorDeck();
            console.log("Door Deck Reshuffled!");
            io.to(roomId).emit("notification", "Kapı destesi bitti ve yeniden karıldı!");
        }

        const card = room.doorDeck.pop();
        if (card) {
            console.log(`Player ${player.name} kicked open the door: ${card.name} (${card.subType})`);

            if (card.subType === 'monster') {
                // CANAVAR ÇIKTI, DÖVÜŞ BAŞLASIN
                room.phase = 'combat';
                room.currentCombat = {
                    monster: card,
                    playerId: player.id,
                    status: 'active',
                    timer: 7,
                    playerBonus: 0,
                    monsterBonus: 0
                };
                if (room.timerInterval) clearInterval(room.timerInterval);
                room.timerInterval = setInterval(() => {
                    if (room.currentCombat && room.currentCombat.timer !== undefined) {
                        room.currentCombat.timer--;
                        if (room.currentCombat.timer <= 0) {
                            if (room.timerInterval) clearInterval(room.timerInterval);
                            room.timerInterval = null;
                            handleResolveCombat(roomId);
                        } else {
                            emitRoomUpdate(roomId);
                        }
                    }
                }, 1000);
                io.to(roomId).emit("combatStarted", { monster: card, playerId: player.id });
                io.to(roomId).emit("notification", `${player.name} bir canavarla karşılaştı: ${card.name}! (Seviye ${card.level})`);
            } else {
                // Canavar değilse POPUP göster (Genel)
                room.pendingDraw = {
                    card: card,
                    playerId: player.id,
                    isPublic: true
                };
            }
            emitRoomUpdate(roomId);
        }
    });

    // 📩 KARTI AL
    socket.on("takeCard", ({ roomId }: { roomId: string }) => {
        const room = rooms[roomId];
        if (!room || !room.pendingDraw) return;

        if (room.pendingDraw.playerId !== socket.id) {
            socket.emit("error", "Sadece kartı çeken kişi alabilir!");
            return;
        }

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        const card = room.pendingDraw.card;

        if (card.subType === 'curse' && room.pendingDraw.isPublic) {
            // Lanet ise discard olur (zaten uygulanmış sayıyoruz şimdilik)
            room.discardPile.push(card);
        } else {
            player.hand.push(card);
        }

        room.pendingDraw = undefined;
        room.phase = (room.phase === 'kick') ? 'action' : 'end';

        emitRoomUpdate(roomId);
    });

    // 😈 BELA ARA
    socket.on("lookForTrouble", ({ roomId, cardId }: { roomId: string; cardId: string }) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (room.phase !== 'action') {
            socket.emit("error", "Bu aşamada bela arayamazsın!");
            return;
        }

        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;

        const card = player.hand[cardIndex];
        if (card.subType !== 'monster') {
            socket.emit("error", "Sadece bir canavar ile bela arayabilirsin!");
            return;
        }

        // Canavarı elinden çıkar ve savaşı başlat
        player.hand.splice(cardIndex, 1);
        room.phase = 'combat';
        room.currentCombat = {
            monster: card,
            playerId: player.id,
            status: 'active',
            timer: 7,
            playerBonus: 0,
            monsterBonus: 0
        };

        if (room.timerInterval) clearInterval(room.timerInterval);
        room.timerInterval = setInterval(() => {
            if (room.currentCombat && room.currentCombat.timer !== undefined) {
                room.currentCombat.timer--;
                if (room.currentCombat.timer <= 0) {
                    if (room.timerInterval) clearInterval(room.timerInterval);
                    room.timerInterval = null;
                    handleResolveCombat(roomId);
                } else {
                    emitRoomUpdate(roomId);
                }
            }
        }, 1000);

        console.log(`Player ${player.name} is looking for trouble with ${card.name}`);
        io.to(roomId).emit("combatStarted", { monster: card, playerId: player.id });
        io.to(roomId).emit("notification", `${player.name} elindeki bir canavarla kapışıyor: ${card.name}!`);
        emitRoomUpdate(roomId);
    });

    // 💰 YAĞMALA
    socket.on("lootTheRoom", ({ roomId }: { roomId: string }) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (room.phase !== 'action') {
            socket.emit("error", "Bu aşamada yağma yapamazsın!");
            return;
        }

        // Deste bittiyse yenile
        if (!room.doorDeck || room.doorDeck.length === 0) {
            room.doorDeck = initializeDoorDeck();
        }

        const card = room.doorDeck.pop();
        if (card) {
            room.pendingDraw = {
                card: card,
                playerId: player.id,
                isPublic: false
            };
            console.log(`Player ${player.name} looted the room (pending draw)`);
            io.to(roomId).emit("notification", `${player.name} odayı sessizce yağmaladı.`);
            emitRoomUpdate(roomId);
        }
    });
    socket.on("drawTreasureCard", ({ roomId }: { roomId: string }) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (!room.treasureDeck || room.treasureDeck.length === 0) room.treasureDeck = initializeTreasureDeck();
        const card = room.treasureDeck.pop();
        if (card) {
            player.hand.push(card);
            emitRoomUpdate(roomId);
        }
    });

    // 🎒 SIRT ÇANTASINA TAŞI
    socket.on("moveToBackpack", ({ roomId, cardId }: { roomId: string; cardId: string }) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex > -1) {
            const card = player.hand[cardIndex];
            if (card.subType === 'item' || card.subType === 'fightspells') {
                player.hand.splice(cardIndex, 1);
                player.backpack.push(card);
                emitRoomUpdate(roomId);
            } else {
                socket.emit("error", "Sadece eşya veya savaş büyüsü koyabilirsin!");
            }
        }
    });

    // 🎒 SIRT ÇANTASINDAN ÇIKAR
    socket.on("removeFromBackpack", ({ roomId, cardId }: { roomId: string; cardId: string }) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        const cardIndex = player.backpack.findIndex(c => c.id === cardId);
        if (cardIndex > -1) {
            const card = player.backpack[cardIndex];
            player.backpack.splice(cardIndex, 1);
            player.hand.push(card);
            emitRoomUpdate(roomId);
        }
    });

    // 🎒 SIRT ÇANTASINDAN KART OYNA
    socket.on("playFromBackpack", ({ roomId, cardId }: { roomId: string; cardId: string }) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        const cardIndex = player.backpack.findIndex(c => c.id === cardId);
        if (cardIndex > -1) {
            const playedCard = player.backpack[cardIndex];
            player.backpack.splice(cardIndex, 1);

            if (playedCard.subType === 'item') {
                const itemSlot = playedCard.slot;
                if (itemSlot) {
                    let existingItemIndex = -1;
                    if (itemSlot === 'hand') {
                        const handItems = player.equipment.filter(i => i.slot === 'hand');
                        if (handItems.length >= 2) existingItemIndex = player.equipment.findIndex(i => i.slot === 'hand');
                    } else {
                        existingItemIndex = player.equipment.findIndex(i => i.slot === itemSlot);
                    }
                    if (existingItemIndex > -1) {
                        const oldItem = player.equipment[existingItemIndex];
                        player.equipment.splice(existingItemIndex, 1);
                        player.hand.push(oldItem);
                    }
                }
                player.equipment.push(playedCard);
            } else if (playedCard.subType === 'race') {
                player.race = playedCard;
            } else if (playedCard.subType === 'class') {
                player.class = playedCard;
            } else if (playedCard.subType === 'blessing') {
                if (playedCard.id === 'b_ballipust' || (playedCard.effect && playedCard.effect.includes && playedCard.effect.includes("Level Up"))) {
                    if (player.level < 9) player.level += 1;
                }
            }

            if (room.currentCombat && room.currentCombat.status === 'active') {
                if (room.currentCombat.timer !== undefined) room.currentCombat.timer += 2;
            }
            emitRoomUpdate(roomId);
        }
    });

    // 💰 SEVİYE SATIN AL
    socket.on("buyLevel", ({ roomId }: { roomId: string }) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (player.level < 9 && player.gold >= 1000) {
            const levelsToBuy = Math.min(Math.floor(player.gold / 1000), 9 - player.level);
            if (levelsToBuy > 0) {
                player.level += levelsToBuy;
                player.gold = 0;
                emitRoomUpdate(roomId);
            }
        }
    });

    // ❌ ÇIKIŞ
    socket.on("disconnect", () => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) {
                if (room.timerInterval) clearInterval(room.timerInterval);
                delete rooms[roomId];
            } else {
                emitRoomUpdate(roomId);
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server ${PORT} portunda çalışıyor`));
