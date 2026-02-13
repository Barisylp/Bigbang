import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import { Player } from "./classes/Player";
import path from "path";
import cors from "cors";
import { DOOR_DECK, TREASURE_DECK, GameCard, DeckConfiguration } from "./data/cards";

function generateRoomId(): string {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function initializeDoorDeck(deckConfig?: DeckConfiguration): GameCard[] {
    let deck: GameCard[] = [];
    DOOR_DECK.forEach(card => {
        const quantity = deckConfig && deckConfig[card.id] !== undefined ? deckConfig[card.id] : 2;
        for (let i = 0; i < quantity; i++) {
            deck.push({ ...card, id: card.id + "_" + (i + 1) });
        }
    });

    // Shuffle (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

function initializeTreasureDeck(deckConfig?: DeckConfiguration): GameCard[] {
    let deck: GameCard[] = [];
    TREASURE_DECK.forEach(card => {
        const quantity = deckConfig && deckConfig[card.id] !== undefined ? deckConfig[card.id] : 2;
        for (let i = 0; i < quantity; i++) {
            deck.push({ ...card, id: card.id + "_" + (i + 1) });
        }
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
    turnPhase: 'kick_open' | 'action_selection' | 'end';
    deckConfiguration?: DeckConfiguration;
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
                room.treasureDeck = initializeTreasureDeck(room.deckConfiguration);
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
            turnPhase: 'kick_open'
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

    socket.on("updateDeckConfig", ({ roomId, deckConfig }: { roomId: string; deckConfig: DeckConfiguration }) => {
        const room = rooms[roomId];
        if (!room || socket.id !== room.hostId) return;

        room.deckConfiguration = deckConfig;
        console.log("Deck configuration updated for room", roomId);
        emitRoomUpdate(roomId);
    });

    socket.on("startGame", (roomId: string) => {
        const room = rooms[roomId];
        if (!room || socket.id !== room.hostId) return;

        console.log("Starting game for room", roomId);

        // Re-initialize decks with custom configuration
        room.doorDeck = initializeDoorDeck(room.deckConfiguration);
        room.treasureDeck = initializeTreasureDeck(room.deckConfiguration);

        room.players.forEach(player => {
            player.hand = [];
            // Deal 4 Door and 4 Treasure
            for (let i = 0; i < 4; i++) {
                if (room.doorDeck.length === 0) room.doorDeck = initializeDoorDeck(room.deckConfiguration);
                const dCard = room.doorDeck.pop();
                if (dCard) player.hand.push(dCard);

                if (room.treasureDeck.length === 0) room.treasureDeck = initializeTreasureDeck(room.deckConfiguration);
                const tCard = room.treasureDeck.pop();
                if (tCard) player.hand.push(tCard);
            }
        });

        room.started = true;
        io.to(roomId).emit("gameStarted", room);
        emitRoomUpdate(roomId);
    });

    // 🔁 SIRA GEÇ
    socket.on("endTurn", (roomId: string) => {
        const room = rooms[roomId];
        if (!room) return;

        // Reset turn-based counters for current player
        const currentPlayer = room.players[room.currentTurn];
        if (currentPlayer) {
            currentPlayer.itemsSoldThisTurn = 0;
        }

        room.currentTurn = (room.currentTurn + 1) % room.players.length;

        // Reset Phase for Next Player
        room.turnPhase = 'kick_open';

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

            if (discardedCard.goldValue) {
                let saleValue = discardedCard.goldValue;

                // ESNAF ABILITY: First item sold in turn gets 2x price
                // Check if it's player's turn is already implicit as they can usually only play on their turn, 
                // but let's strictly check if needed. logic: "itemsSoldThisTurn" reset at endTurn.
                if (player.class?.name === 'Esnaf' && player.itemsSoldThisTurn === 0) {
                    saleValue *= 2;
                }

                player.gold += saleValue;
                player.itemsSoldThisTurn++;
            }

            room.discardPile.push(discardedCard);
            emitRoomUpdate(roomId);
        }
    });

    // 🚪 KAPI KARTI ÇEK (KICK OPEN THE DOOR)
    socket.on("drawDoorCard", ({ roomId }: { roomId: string }) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        // Ensure it's the right phase
        if (room.turnPhase !== 'kick_open') {
            socket.emit("error", "Şu an kapı çekme evresinde değilsin!");
            return;
        }

        if (!room.doorDeck || room.doorDeck.length === 0) room.doorDeck = initializeDoorDeck(room.deckConfiguration);
        const card = room.doorDeck.pop();
        if (card) {
            if (card.subType === 'monster') {
                // MONSTER FOUND! DIRECTLY TO COMBAT
                room.currentCombat = {
                    monster: card,
                    playerId: player.id,
                    status: 'active',
                    timer: 7,
                    playerBonus: 0,
                    monsterBonus: 0
                };
                // Timer logic
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

                // Combat effectively ends the "Action Selection" possibility for this turn usually, 
                // or we can set it to 'end' or similar? 
                // In Munchkin, if you fight a monster on Kick Open, you can't Look for Trouble or Loot.
                // So we can set phase to 'end' (pending combat resolution) or keep it tracked.
                // Let's set it to 'end' so they can't do other phase actions.
                room.turnPhase = 'end';

            } else {
                // NO MONSTER. PUT IN HAND.
                player.hand.push(card);
                // ENABLE NEXT PHASE
                room.turnPhase = 'action_selection';
            }
            emitRoomUpdate(roomId);
        }
    });

    // 💰 HAZİNE KARTI ÇEK
    socket.on("drawTreasureCard", ({ roomId }: { roomId: string }) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (!room.treasureDeck || room.treasureDeck.length === 0) room.treasureDeck = initializeTreasureDeck(room.deckConfiguration);
        const card = room.treasureDeck.pop();
        if (card) {
            player.hand.push(card);
            emitRoomUpdate(roomId);
        }
    });

    // 🧛 BELA ARA (LOOK FOR TROUBLE)
    socket.on("lookForTrouble", ({ roomId, cardId }: { roomId: string; cardId: string }) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (room.turnPhase !== 'action_selection') return;

        // Find card in hand
        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;

        const card = player.hand[cardIndex];
        if (card.subType !== 'monster') {
            socket.emit("error", "Sadece canavar kartı ile bela aranabilir!");
            return;
        }

        // Remove from hand and start combat
        player.hand.splice(cardIndex, 1);

        room.currentCombat = {
            monster: card,
            playerId: player.id,
            status: 'active',
            timer: 7,
            playerBonus: 0,
            monsterBonus: 0
        };

        // Timer logic
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

        room.turnPhase = 'end'; // Action taken
        emitRoomUpdate(roomId);
    });

    // 🕵️ KAPIYI YAĞMALA (LOOT THE ROOM)
    socket.on("lootTheRoom", ({ roomId }: { roomId: string }) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (room.turnPhase !== 'action_selection') return;

        if (!room.doorDeck || room.doorDeck.length === 0) room.doorDeck = initializeDoorDeck(room.deckConfiguration);
        const card = room.doorDeck.pop();
        if (card) {
            // Draw Face Down (Visible to player, but logically known as "face down draw" in Munchkin terms, usually means just put in hand without showing others)
            // Since our emitRoomUpdate masks other players' hands anyway, just pushing to hand is "face down" to others.
            player.hand.push(card);

            // "alınan kartı diğer oyuncular göremesin" -> Hand masking already handles this.

            // End Turn after looting? PROMPT: "devam ete basıldığı zaman tur sonraki oyuncuya gitsin"
            // "kapı yağmalama kartına basıldığı zaman ... devam ete basıldığı zaman"
            // Suggests Loot executes, THEN they must press Continue?
            // BUT "oyuncu bu düğmelerden sdc bir tanesine basabilsin" (Only ONE of these buttons)
            // So if I click Loot, I used my "one button". I shouldn't be able to click Look For Trouble.
            // But can I click Continue? Yes, to pass the turn. 
            // OR does Loot automatically end turn?
            // "Loot... directly to inventory... hidden from others... continue button passes turn"
            // Let's make Loot change phase to 'end'. User can then click 'Continue' (EndTurn) or we auto-end?
            // Usually in UI, if I click Loot, I'm done. I can just wait or click standard "End Turn" button.
            // The prompt says "bir tanede devam et düğmesi ekle... oyuncu bu düğmelerden sdc bir tanesine basabilsin".
            // Implementation: Loot changes phase to 'end'. Then user manually clicks "End Turn" (the standard one) OR "Devam Et" action button becomes a "End Turn" trigger.
            // Let's set phase to 'end'. The UI will hide the action buttons.
            room.turnPhase = 'end';
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
