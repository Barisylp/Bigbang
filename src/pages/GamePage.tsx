import React from 'react';
import { Card } from '../components/ui/Card';

interface GamePageProps {
    currentRoom: any;
    socket: any;
}

const GamePage: React.FC<GamePageProps> = ({ currentRoom, socket }) => {
    const myPlayer = currentRoom.players.find((p: any) => p.id === socket.id);
    const myTurn = currentRoom.players[currentRoom.currentTurn].id === socket.id;

    // Calculate Combat Power Frontend Side
    const getCombatStrength = (player: any) => {
        if (!player) return 0;
        let strength = player.level;
        if (player.equipment) {
            player.equipment.forEach((item: any) => {
                if (item.bonus) strength += item.bonus;
            });
        }
        if (player.activeModifiers) {
            player.activeModifiers.forEach((mod: any) => strength += mod.value);
        }
        return strength;
    };

    const myPower = getCombatStrength(myPlayer);

    // Drag & Drop Handlers
    const [draggedCard, setDraggedCard] = React.useState<any>(null);

    const onDragStart = (e: React.DragEvent, card: any) => {
        setDraggedCard(card);
        e.dataTransfer.effectAllowed = "move";
    };

    const onDropInventory = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedCard) {
            socket.emit('playCard', { roomId: currentRoom.id, cardId: draggedCard.id });
            setDraggedCard(null);
        }
    };

    const onDropDiscard = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedCard) {
            if (confirm(`${draggedCard.name} kartını atmak (satmak) istiyor musunuz?`)) {
                socket.emit('discardCard', { roomId: currentRoom.id, cardId: draggedCard.id });
            }
            setDraggedCard(null);
        }
    };

    const onDropBackpack = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedCard) {
            if (draggedCard.subType !== 'item' && draggedCard.subType !== 'fightspells') {
                alert("Sadece eşya (item) veya savaş büyüsü (fightspells) kartlarını sırt çantasına koyabilirsin!");
                setDraggedCard(null);
                return;
            }
            socket.emit('moveToBackpack', { roomId: currentRoom.id, cardId: draggedCard.id });
            setDraggedCard(null);
        }
    };

    const [showSpellTarget, setShowSpellTarget] = React.useState<any>(null);
    const [selectingMonsterMode, setSelectingMonsterMode] = React.useState(false);
    const [selectingOlmBakGitMonster, setSelectingOlmBakGitMonster] = React.useState<{ spellCard: any } | null>(null);
    const [shownCard, setShownCard] = React.useState<any>(null);
    const [allySelectionMode, setAllySelectionMode] = React.useState(false);
    const [incomingAllyRequest, setIncomingAllyRequest] = React.useState<any>(null);
    const [treasureShare, setTreasureShare] = React.useState(1);

    React.useEffect(() => {
        socket.on('showCard', (data: any) => {
            setShownCard(data);
            setTimeout(() => {
                setShownCard(null);
            }, 3000);
        });
        socket.on('allyRequestReceived', (data: any) => {
            setIncomingAllyRequest(data);
        });

        return () => {
            socket.off('showCard');
            socket.off('allyRequestReceived');
        };
    }, []);

    const playCurseTarget = (cardId: string, targetId: string) => {
        socket.emit('playCurse', { roomId: currentRoom.id, cardId, targetId });
        setShowSpellTarget(null);
    };

    const takeFromBackpack = (cardId: string) => {
        socket.emit('removeFromBackpack', { roomId: currentRoom.id, cardId });
    };

    const playFromBackpack = (cardId: string) => {
        socket.emit('playFromBackpack', { roomId: currentRoom.id, cardId });
    };



    // Inventory Slot Component
    const InventorySlot = ({ label, item, type = "item" }: { label: string, item: any, type?: string }) => (
        <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 mb-1">{label}</span>
            <div className={`w-12 h-16 rounded border flex items-center justify-center text-center p-1 text-[9px] relative
                ${item ? 'bg-slate-700 border-amber-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-500'}`}>
                {item ? (
                    <>
                        <span className="font-bold">{item.name}</span>
                        {item.bonus && <span className="absolute top-0 right-0 bg-blue-600 text-[8px] px-1 rounded-bl">+{item.bonus}</span>}
                    </>
                ) : (
                    <span className="opacity-30">{type === 'race' ? 'IRK' : type === 'class' ? 'SINIF' : 'BOŞ'}</span>
                )}
            </div>
        </div>
    );

    // Player Inventory Display Component
    const PlayerInventory = ({ player }: { player: any }) => {
        if (!player) return null;

        const headItem = player.equipment?.find((i: any) => i.slot === 'head');
        const bodyItem = player.equipment?.find((i: any) => i.slot === 'body');
        const footItem = player.equipment?.find((i: any) => i.slot === 'foot');
        const handItems = player.equipment?.filter((i: any) => i.slot === 'hand') || [];
        const otherItems = player.equipment?.filter((i: any) => !['head', 'body', 'foot', 'hand'].includes(i.slot)) || [];
        const isMyPlayer = player.id === socket.id;

        return (
            <div className="flex gap-4 items-start">
                {/* Equipment Slots */}
                <div className="flex-1 flex gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-700 min-h-[5rem] items-center justify-center transition-colors hover:bg-slate-800/80"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDropInventory}>
                    <InventorySlot label="Irk" item={player.race} type="race" />
                    <InventorySlot label="Sınıf" item={player.class} type="class" />
                    <div className="w-px bg-slate-600 mx-1 self-stretch"></div>
                    <InventorySlot label="Kafa" item={headItem} />
                    <InventorySlot label="Gövde" item={bodyItem} />
                    <InventorySlot label="Ayak" item={footItem} />
                    <InventorySlot label="El 1" item={handItems[0]} />
                    <InventorySlot label="El 2" item={handItems[1]} />
                    {otherItems.map((item: any, idx: number) => (
                        <InventorySlot key={`other-${idx}`} label="Diğer" item={item} />
                    ))}
                </div>

                {/* Backpack Section */}
                <div className={`w-48 bg-slate-900/50 p-2 rounded-lg border flex flex-col transition-all min-h-[5.5rem]
                    ${isMyPlayer && draggedCard ? 'border-amber-500 bg-amber-900/20 scale-105' : 'border-slate-700'}`}
                    onDragOver={(e) => isMyPlayer && e.preventDefault()}
                    onDrop={isMyPlayer ? onDropBackpack : undefined}>
                    <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <span>🎒 Çanta</span>
                            <span className="text-amber-500 font-bold">({player.backpack?.length || 0})</span>
                        </div>
                    </div>

                    <div className="flex gap-1 flex-wrap content-start">
                        {player.backpack?.map((card: any, idx: number) => (
                            <div key={`bp-${idx}`} className="group relative"
                                draggable={isMyPlayer}
                                onDragStart={(e) => isMyPlayer && onDragStart(e, card)}
                            >
                                {card.hidden ? (
                                    <div className="w-10 h-14 bg-slate-800 border border-slate-700 rounded flex items-center justify-center">
                                        <span className="text-lg opacity-20">?</span>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => {
                                            if (card.subType === 'fightspells') {
                                                if (currentRoom.currentCombat?.status === 'active') {
                                                    setShowSpellTarget(card);
                                                } else {
                                                    alert("Savaş büyülerini sadece savaş sırasında kullanabilirsin!");
                                                }
                                            } else {
                                                playFromBackpack(card.id);
                                            }
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            takeFromBackpack(card.id);
                                        }}
                                        className="w-10 h-14 bg-slate-700 border border-amber-600 rounded text-[7px] p-1 flex items-center justify-center text-center relative overflow-hidden cursor-pointer hover:bg-slate-600 transition-colors"
                                        title="Sol Tık: Oyna | Sağ Tık: Ele Al"
                                    >
                                        <span className="font-bold text-white z-10">{card.name}</span>
                                        <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[5px] text-slate-300 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            SOL: OYNA | SAĞ: AL
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {(!player.backpack || player.backpack.length === 0) && (
                            <div className="text-[9px] text-slate-600 italic py-2 w-full text-center">Boş</div>
                        )}
                    </div>
                </div>

                {/* Active Modifiers (Debuff Box) */}
                <div className="w-48 bg-red-900/20 p-2 rounded-lg border border-red-800/50 flex flex-col min-h-[5.5rem]">
                    <div className="text-[10px] text-red-400 mb-1 flex items-center justify-between">
                        <span>💀 Lanetler & Etkiler</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        {(!player.activeModifiers || player.activeModifiers.length === 0) && (
                            <span className="text-[10px] text-slate-500 italic p-1">Etkin lanet yok</span>
                        )}
                        {player.activeModifiers?.map((mod: any, idx: number) => (
                            <div key={`mod-${idx}`} className="bg-red-950/80 border border-red-900/50 rounded px-2 py-1 flex justify-between items-center text-xs">
                                <span className="text-red-200 font-medium truncate max-w-[80px]" title={mod.source}>{mod.source}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-red-400 font-bold">{mod.value > 0 ? `+${mod.value}` : mod.value}</span>
                                    <span className="text-[10px] text-slate-400 bg-slate-900/50 px-1 rounded">{mod.duration} Tur</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
            {/* TOP BAR */}
            <div className="bg-slate-800 p-2 flex justify-between items-center border-b border-slate-700">
                <div className="font-bold text-amber-500 text-xl">Anadolu Munchkin - Oda: {currentRoom.id}</div>
                <div className={`px-4 py-1 rounded font-bold ${myTurn ? 'bg-green-600 animate-pulse' : 'bg-slate-600'}`}>
                    {myTurn ? 'SENİN SIRAN!' : `Sıra: ${currentRoom.players[currentRoom.currentTurn].name}`}
                </div>
                <button className="bg-red-900 px-3 py-1 rounded text-xs hover:bg-red-700">Çık</button>
            </div>

            <div className="flex-1 p-4 flex justify-around items-start relative">

                {/* SHOWN CARD OVERLAY (Kick Open Reveal) */}
                {shownCard && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <div className="bg-black/90 p-6 rounded-2xl border-4 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.5)] flex flex-col items-center">
                            <div className="text-amber-500 font-bold text-xl mb-4 text-center">
                                {shownCard.playerId === socket.id ? 'Kart Çektin!' : `${currentRoom.players.find((p: any) => p.id === shownCard.playerId)?.name} Çekti!`}
                            </div>
                            <Card
                                card={shownCard.card}
                                isPlayable={false}
                                onClick={() => { }}
                            />
                            <div className="text-white mt-4 font-bold text-lg">{shownCard.card.name}</div>
                        </div>
                    </div>
                )}

                {/* TARGET SELECTION OVERLAY */}
                {showSpellTarget && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="flex flex-col items-center gap-4 bg-slate-800 p-8 rounded-2xl border-2 border-amber-500 shadow-2xl scale-110">
                            <div className="text-amber-500 font-bold text-xl mb-2">
                                {showSpellTarget.subType === 'curse' ? '🎯 Kimi Lanetleyeceksin?' :
                                    showSpellTarget.id.startsWith('fs_arabulucu') ? '🎯 Barış Sağla (Savaşçıya Yardım Et)' :
                                        `🎯 Hedef Seç: ${showSpellTarget.name}`}
                            </div>

                            {showSpellTarget.subType === 'curse' ? (
                                <div className="flex gap-3 flex-wrap justify-center max-w-md">
                                    {currentRoom.players.map((p: any) => (
                                        <button
                                            key={p.id}
                                            onClick={() => playCurseTarget(showSpellTarget.id, p.id)}
                                            className="bg-gradient-to-br from-purple-700 to-purple-900 hover:from-purple-600 hover:to-purple-800 border border-purple-400/50 text-white px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg min-w-[120px]"
                                        >
                                            {p.name}
                                            {p.id === socket.id && " (SENSİN)"}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex gap-6">
                                    <button
                                        onClick={() => {
                                            if (showSpellTarget.id.startsWith('fs_olmbakgit')) {
                                                // Olm Bak Git logic: need auxiliary card
                                                socket.emit('playFightSpell', {
                                                    roomId: currentRoom.id,
                                                    cardId: showSpellTarget.id,
                                                    target: 'player',
                                                    auxiliaryCardId: showSpellTarget.auxMonsterId
                                                });
                                            } else {
                                                socket.emit('playFightSpell', { roomId: currentRoom.id, cardId: showSpellTarget.id, target: 'player' });
                                            }
                                            setShowSpellTarget(null);
                                        }}
                                        className="bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 px-8 py-4 rounded-xl font-bold shadow-xl border-b-4 border-blue-900 active:border-b-0 active:translate-y-1 transition-all text-lg"
                                    >
                                        {showSpellTarget.id.startsWith('fs_arabulucu') ? 'BARIŞ SAĞLA' :
                                            showSpellTarget.id.startsWith('fs_olmbakgit') ? 'SAVAŞÇIYA CANAVAR SAL' :
                                                `SAVAŞÇIYA (+${showSpellTarget.bonus})`}
                                    </button>

                                    {!showSpellTarget.id.startsWith('fs_arabulucu') && (
                                        <button
                                            onClick={() => {
                                                if (showSpellTarget.id.startsWith('fs_olmbakgit')) {
                                                    socket.emit('playFightSpell', {
                                                        roomId: currentRoom.id,
                                                        cardId: showSpellTarget.id,
                                                        target: 'monster',
                                                        auxiliaryCardId: showSpellTarget.auxMonsterId
                                                    });
                                                } else {
                                                    socket.emit('playFightSpell', { roomId: currentRoom.id, cardId: showSpellTarget.id, target: 'monster' });
                                                }
                                                setShowSpellTarget(null);
                                            }}
                                            className="bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 px-8 py-4 rounded-xl font-bold shadow-xl border-b-4 border-red-950 active:border-b-0 active:translate-y-1 transition-all text-lg"
                                        >
                                            {showSpellTarget.id.startsWith('fs_olmbakgit') ? 'CANAVARA CANAVAR EKLE' :
                                                `CANAVARA (+${showSpellTarget.bonus})`}
                                        </button>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={() => setShowSpellTarget(null)}
                                className="text-sm text-slate-500 mt-4 hover:text-white transition-colors bg-slate-700/50 px-4 py-1 rounded-full border border-slate-600"
                            >
                                Vazgeç (İptal)
                            </button>
                        </div>
                    </div>
                )}

                {/* ALLY REQUEST OVERLAY (Sender) */}
                {allySelectionMode && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md">
                        <div className="bg-slate-900 p-8 rounded-3xl border-2 border-amber-500 shadow-2xl max-w-md w-full">
                            <h3 className="text-amber-500 font-bold text-2xl mb-4 text-center">🤝 Müttefik Ara</h3>
                            <p className="text-slate-300 text-sm mb-6 text-center">Yardımına karşılık kaç hazine kartı vermeyi vaat ediyorsun?</p>

                            <div className="mb-6">
                                <label className="block text-xs text-slate-500 mb-2 uppercase font-bold tracking-widest">Hazine Payı</label>
                                <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
                                    <button
                                        onClick={() => setTreasureShare(Math.max(0, treasureShare - 1))}
                                        className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 font-bold text-xl">-</button>
                                    <div className="flex-1 text-center font-black text-2xl text-yellow-500">{treasureShare}</div>
                                    <button
                                        onClick={() => setTreasureShare(Math.min(currentRoom.currentCombat?.monster?.treasure || 1, treasureShare + 1))}
                                        className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 font-bold text-xl">+</button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 text-center">Canavarın toplam hazinesi: {currentRoom.currentCombat?.monster?.treasure || 1}</p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="block text-xs text-slate-500 mb-2 uppercase font-bold tracking-widest">Kimi Çağırıyorsun?</label>
                                {currentRoom.players.filter((p: any) => p.id !== socket.id).map((p: any) => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            socket.emit('requestAlly', { roomId: currentRoom.id, targetId: p.id, treasures: treasureShare });
                                            setAllySelectionMode(false);
                                        }}
                                        className="bg-slate-800 hover:bg-slate-700 p-3 rounded-xl border border-slate-700 flex justify-between items-center group transition-all"
                                    >
                                        <span className="font-bold">{p.name} <span className="text-xs text-slate-500 font-normal">(Savaş Gücü: {getCombatStrength(p)})</span></span>
                                        <span className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">SEÇ</span>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setAllySelectionMode(false)}
                                className="w-full mt-6 py-2 text-slate-500 hover:text-white transition-colors">Kapat</button>
                        </div>
                    </div>
                )}

                {/* ALLY INVITATION OVERLAY (Receiver) */}
                {incomingAllyRequest && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-lg">
                        <div className="bg-slate-900 p-8 rounded-3xl border-4 border-amber-500 shadow-2xl max-w-sm w-full text-center animate-in zoom-in duration-300">
                            <div className="text-5xl mb-4">🤝</div>
                            <h3 className="text-white font-black text-2xl mb-2">{incomingAllyRequest.requesterName} senden yardım istiyor!</h3>
                            <p className="text-slate-400 mb-6">Savaşı kazanırsanız size <span className="text-yellow-500 font-bold">{incomingAllyRequest.treasures} hazine kartı</span> verecek. Kabul ediyor musun?</p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        socket.emit('respondToAllyRequest', {
                                            roomId: currentRoom.id,
                                            requesterId: incomingAllyRequest.requesterId,
                                            accepted: true,
                                            treasures: incomingAllyRequest.treasures
                                        });
                                        setIncomingAllyRequest(null);
                                    }}
                                    className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-all"
                                >
                                    EVET, YARDIM ET
                                </button>
                                <button
                                    onClick={() => {
                                        socket.emit('respondToAllyRequest', {
                                            roomId: currentRoom.id,
                                            requesterId: incomingAllyRequest.requesterId,
                                            accepted: false,
                                            treasures: incomingAllyRequest.treasures
                                        });
                                        setIncomingAllyRequest(null);
                                    }}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-bold text-slate-300 active:scale-95 transition-all"
                                >
                                    HAYIR
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MONSTER SELECTION OVERLAY (For Olm Bak Git) */}
                {selectingOlmBakGitMonster && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in zoom-in duration-200">
                        <div className="bg-slate-900 p-8 rounded-3xl border-2 border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)] max-w-4xl w-full">
                            <div className="text-green-500 font-black text-3xl mb-2 text-center">OLM BAK GİT!</div>
                            <div className="text-slate-300 text-center mb-8">Savaşa dahil etmek istediğin canavarı seç:</div>

                            <div className="flex gap-4 overflow-x-auto pb-6 px-2 justify-center">
                                {myPlayer.hand.filter((c: any) => c.subType === 'monster').length > 0 ? (
                                    myPlayer.hand.filter((c: any) => c.subType === 'monster').map((card: any) => (
                                        <div key={card.id}
                                            onClick={() => {
                                                setShowSpellTarget({ ...selectingOlmBakGitMonster.spellCard, auxMonsterId: card.id });
                                                setSelectingOlmBakGitMonster(null);
                                            }}
                                            className="cursor-pointer hover:scale-110 transition-transform active:scale-95"
                                        >
                                            <Card card={card} />
                                            <div className="mt-2 text-center text-green-400 font-bold">Güç: {card.level}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-red-400 font-bold text-lg py-12">Elinizde hiç canavar yok!</div>
                                )}
                            </div>

                            <div className="flex justify-center mt-4">
                                <button
                                    onClick={() => setSelectingOlmBakGitMonster(null)}
                                    className="px-8 py-2 rounded-full border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                                >
                                    Vazgeç (Kapat)
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-8 items-center z-10">

                    {/* COMBAT ARENA OVERLAY */}
                    {currentRoom.currentCombat && currentRoom.currentCombat.status === 'active' && (() => {
                        const combatant = currentRoom.players.find((p: any) => p.id === currentRoom.currentCombat.playerId);
                        const combatantPower = getCombatStrength(combatant);
                        const isMe = socket.id === combatant?.id;

                        return (
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center bg-black/95 p-8 rounded-2xl border-4 border-red-600 shadow-[0_0_100px_rgba(220,38,38,0.7)] min-w-[600px] backdrop-blur-md">
                                <div className="absolute -top-6 bg-red-600 text-white px-6 py-2 rounded-full font-black text-2xl animate-bounce shadow-lg">
                                    DÖVÜŞ VAR!
                                </div>

                                {/* Timer Display */}
                                {currentRoom.currentCombat.timer !== undefined && (
                                    <div className="mb-6 flex flex-col items-center">
                                        <div className={`text-6xl font-black transition-all transform ${currentRoom.currentCombat.timer <= 3 ? 'text-red-500 scale-125 animate-ping' : 'text-amber-500'}`}>
                                            {currentRoom.currentCombat.timer}
                                        </div>
                                        <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Saniye Kaldı</div>
                                    </div>
                                )}

                                <div className="flex items-center gap-12 justify-center w-full mb-8">
                                    {/* Player Stats */}
                                    <div className="text-center flex flex-col items-center bg-slate-900/80 p-6 rounded-xl border border-blue-500/30 relative">
                                        <div className="text-white font-bold text-2xl mb-1">{combatant?.name}</div>
                                        <div className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-4">SAVAŞÇI</div>
                                        <div className="text-6xl font-black text-white flex items-center gap-3 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                            <span className="text-3xl text-blue-500">⚔️</span> {combatantPower + (currentRoom.currentCombat.playerBonus || 0)}
                                        </div>
                                        {currentRoom.currentCombat.playerBonus > 0 && (
                                            <div className="text-green-400 font-bold mt-1 text-sm">+{currentRoom.currentCombat.playerBonus} Bonus</div>
                                        )}

                                        {currentRoom.currentCombat.allyId && (
                                            <div className="mt-4 pt-4 border-t border-slate-700 w-full animate-in slide-in-from-top-2">
                                                <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mb-1">MÜTTEFİK</div>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-white font-bold">{currentRoom.players.find((p: any) => p.id === currentRoom.currentCombat.allyId)?.name}</span>
                                                    <span className="bg-amber-600 text-[10px] px-1 rounded font-black">+{getCombatStrength(currentRoom.players.find((p: any) => p.id === currentRoom.currentCombat.allyId))}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-5xl font-black text-slate-700 italic select-none">VS</div>

                                    {/* Monster Card */}
                                    <div className={`scale-150 transform transition-transform hover:rotate-2 relative rounded overflow-visible ${draggedCard && (draggedCard.subType === 'fightspells' || draggedCard.subType === 'modifier') ? 'ring-4 ring-red-500 ring-offset-4 ring-offset-black animate-pulse cursor-crosshair' : ''}`}
                                        onDragOver={(e) => {
                                            if (draggedCard && (draggedCard.subType === 'fightspells' || draggedCard.subType === 'modifier')) {
                                                e.preventDefault();
                                            }
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            if (draggedCard && (draggedCard.subType === 'fightspells' || draggedCard.subType === 'modifier')) {
                                                socket.emit('playFightSpell', { roomId: currentRoom.id, cardId: draggedCard.id, target: 'monster' });
                                                setDraggedCard(null);
                                            }
                                        }}
                                    >
                                        <div className="absolute -inset-4 bg-red-600/20 blur-xl rounded-full animate-pulse"></div>
                                        <Card card={currentRoom.currentCombat.monster} />
                                        <div className="absolute -bottom-4 -right-4 bg-red-600 text-white text-3xl font-black px-3 py-1 rounded border-2 border-white shadow-lg flex flex-col items-center">
                                            <span>{currentRoom.currentCombat.monster.level + (currentRoom.currentCombat.monsterBonus || 0)}</span>
                                            {currentRoom.currentCombat.monsterBonus > 0 && (
                                                <span className="text-[10px] text-yellow-300">+{currentRoom.currentCombat.monsterBonus}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {isMe ? (
                                    <div className="flex flex-col items-center gap-4 w-full">
                                        <button
                                            onClick={() => socket.emit('resolveCombat', { roomId: currentRoom.id })}
                                            className={`w-full max-w-md text-white font-black py-4 px-10 rounded-xl shadow-2xl text-2xl transition-all hover:scale-105 active:scale-95 border-b-8
                                                    ${(combatantPower + (currentRoom.currentCombat.playerBonus || 0)) > ((currentRoom.currentCombat.monster?.level || 0) + (currentRoom.currentCombat.monsterBonus || 0))
                                                    ? 'bg-gradient-to-r from-green-600 to-green-500 border-green-800 hover:from-green-500 hover:to-green-400 shadow-[0_0_30px_rgba(34,197,94,0.4)]'
                                                    : 'bg-gradient-to-r from-red-800 to-red-600 border-red-950 hover:from-red-700 hover:to-red-500 shadow-[0_0_30px_rgba(220,38,38,0.4)]'}`}
                                        >
                                            {(combatantPower + (currentRoom.currentCombat.playerBonus || 0)) > ((currentRoom.currentCombat.monster?.level || 0) + (currentRoom.currentCombat.monsterBonus || 0)) ? "ŞİMDİ KAZAN! (WIN)" : "KAYBET... (LOSE)"}
                                        </button>
                                        <p className="text-slate-500 text-xs italic">Süre dolduğunda otomatik çözülecek</p>
                                    </div>
                                ) : (
                                    <div className="w-full flex flex-col items-center">
                                        <div className="text-slate-300 font-bold text-lg mb-2 flex items-center gap-2">
                                            <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                                            {combatant?.name} ter döküyor...
                                        </div>
                                        <p className="text-slate-500 text-xs">Müdahale etmek için bir kart oyna! (+2 sn)</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}


                    {/* DOOR DECK */}
                    <div
                        onClick={() => {
                            if (myTurn) {
                                if (currentRoom.turnPhase === 'kick_open') {
                                    socket.emit('drawDoorCard', { roomId: currentRoom.id });
                                } else {
                                    alert("Kapı açma evresini geçtiniz! Şimdi 'Bela Ara', 'Yağmala' veya 'Devam Et' seçmelisiniz.");
                                }
                            } else {
                                alert("Sadece kendi turunda kart çekebilirsin!");
                            }
                        }}
                        className={`w-32 h-44 bg-slate-900 border-4 border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-amber-600 transition-colors shadow-xl group relative select-none
                        ${!myTurn || currentRoom.turnPhase !== 'kick_open' ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        <div className="absolute inset-2 border-2 border-dashed border-slate-600 rounded opacity-50"></div>
                        <div className="z-10 text-center">
                            <div className="text-4xl mb-2">🚪</div>
                            <div className="font-bold text-slate-300">KAPI DESTESİ</div>
                            <div className="text-xs text-slate-500 mt-1">{currentRoom.doorDeck?.length || 0} Kart</div>
                        </div>
                        <div className="absolute bottom-2 text-[10px] text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                            ÇEKMEK İÇİN TIKLA
                        </div>
                    </div>

                    {/* DISCARD PILE */}
                    <div
                        className={`w-32 h-44 border-4 border-dashed rounded-xl flex items-center justify-center transition-all relative
                        ${draggedCard ? 'border-red-500 bg-red-900/20 scale-105 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'border-slate-600 bg-slate-800/50'}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={onDropDiscard}
                    >
                        <div className="text-center text-slate-500 text-xs pointer-events-none">
                            <div className="font-bold mb-1">ÇÖP / SAT</div>
                            <div className="text-[10px] mb-2">(Sürükle Bırak)</div>
                            <div>{currentRoom.discardPile?.length || 0} Çöp</div>
                            {currentRoom.discardPile?.length > 0 && <div className="text-[10px] mt-1 text-slate-400">Son: {currentRoom.discardPile[currentRoom.discardPile.length - 1].name}</div>}
                        </div>
                    </div>

                    {/* TREASURE DECK */}
                    <div
                        className={`w-32 h-44 bg-slate-900 border-4 border-yellow-700/50 rounded-xl flex flex-col items-center justify-center shadow-xl group relative select-none opacity-80`}
                    >
                        <div className="absolute inset-2 border-2 border-dashed border-yellow-600 rounded opacity-50 bg-yellow-900/10"></div>
                        <div className="z-10 text-center">
                            <div className="text-4xl mb-2">💰</div>
                            <div className="font-bold text-yellow-500">HAZİNE</div>
                            <div className="text-xs text-slate-400 mt-1">{currentRoom.treasureDeck?.length || 0} Kart</div>
                        </div>
                        <div className="absolute bottom-2 text-[10px] text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                            OTOMATİK VERİLİR
                        </div>
                    </div>
                </div>

                {/* ACTION SELECTION BUTTONS (CENTRAL) */}
                {myTurn && currentRoom.turnPhase === 'action_selection' && (
                    <div className="absolute top-[65%] left-1/2 transform -translate-x-1/2 mt-8 flex flex-col items-center gap-2 z-20 bg-slate-900/90 p-4 rounded-xl border border-amber-500/50 shadow-2xl backdrop-blur-sm">
                        <div className="text-amber-500 font-bold text-sm mb-1 uppercase tracking-widest">Ne Yapacaksın?</div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setSelectingMonsterMode(!selectingMonsterMode)}
                                className={`px-6 py-3 rounded-lg font-black text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg border-b-4 
                                ${selectingMonsterMode ? 'bg-red-600 border-red-800 animate-pulse ring-4 ring-red-500/30' : 'bg-gradient-to-b from-red-700 to-red-900 border-red-950 text-red-100 hover:from-red-600 hover:to-red-800'}`}
                            >
                                {selectingMonsterMode ? 'KART SEÇ...' : '💀 BELA ARA'}
                            </button>
                            <button
                                onClick={() => socket.emit('lootTheRoom', { roomId: currentRoom.id })}
                                className="px-6 py-3 rounded-lg font-black text-lg bg-gradient-to-b from-amber-600 to-amber-800 border-b-4 border-amber-950 text-amber-100 hover:from-amber-500 hover:to-amber-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                            >
                                🕵️ YAĞMALA
                            </button>
                            <button
                                onClick={() => socket.emit('passActionPhase', currentRoom.id)}
                                className="px-6 py-3 rounded-lg font-black text-lg bg-gradient-to-b from-blue-600 to-blue-800 border-b-4 border-blue-950 text-blue-100 hover:from-blue-500 hover:to-blue-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                            >
                                ⏩ DEVAM ET
                            </button>
                        </div>
                        <div className="text-[10px] text-slate-400 max-w-md text-center">
                            Canavarın yoksa yağmala, varsa bela ara. Hiçbiri yoksa devam et.
                        </div>
                    </div>
                )}

                {/* OTHER PLAYERS */}
                {currentRoom.players.filter((p: any) => p.id !== socket.id).map((p: any) => (
                    <div key={p.id} className="bg-slate-800 p-4 rounded border border-slate-600 flex flex-col items-center z-0">
                        <div className="font-bold text-lg mb-1">{p.name}</div>
                        <div className="flex items-center gap-2 mb-2 text-xs">
                            <span className="bg-amber-600 px-1 rounded">Lvl {p.level}</span>
                            {p.race && <span className="bg-green-700 px-1 rounded">{p.race.name}</span>}
                            {p.class && <span className="bg-blue-700 px-1 rounded">{p.class.name}</span>}
                            <span className="bg-red-800 px-1 rounded">⚔️ {getCombatStrength(p)}</span>
                        </div>

                        <div className="mb-2 w-full">
                            <PlayerInventory player={p} />
                        </div>

                        {/* OTHER PLAYER DEBUFFS */}
                        {p.activeModifiers && p.activeModifiers.length > 0 && (
                            <div className="w-full bg-red-900/20 p-1 rounded border border-red-800/50 flex flex-col mb-2">
                                <span className="text-[8px] text-red-400 font-bold mb-0.5">Lanetler</span>
                                {p.activeModifiers.map((mod: any, idx: number) => (
                                    <div key={`op-mod-${idx}`} className="flex justify-between items-center text-[9px] text-red-200 bg-red-950/50 px-1 rounded mb-0.5">
                                        <span className="truncate max-w-[50px]">{mod.source}</span>
                                        <div className="flex gap-1">
                                            <span className="font-bold">{mod.value}</span>
                                            <span className="text-slate-400">({mod.duration})</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="text-sm text-slate-400">Elindeki Kart: {p.hand.length}</div>
                        <div className="mt-1 flex justify-center gap-1">
                            {p.hand.map((_: any, i: number) => (
                                <div key={i} className="w-3 h-5 bg-slate-600 rounded border border-slate-500"></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* MY AREA */}
            <div className="bg-slate-800 p-4 border-t border-slate-700">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            {myPlayer?.name}
                            <span className="text-sm bg-amber-600 px-2 rounded">Lvl {myPlayer?.level}</span>
                            {myPlayer?.race && <span className="text-sm bg-green-700 px-2 rounded">{myPlayer.race.name}</span>}
                            {myPlayer?.class && <span className="text-sm bg-blue-700 px-2 rounded">{myPlayer.class.name}</span>}
                            <span className="text-sm bg-red-800 px-2 rounded flex items-center gap-1">
                                ⚔️ {myPower}
                            </span>
                            <span className="text-sm bg-yellow-600 text-black font-bold px-2 rounded flex items-center gap-1">
                                🪙 {myPlayer?.gold || 0}
                            </span>
                        </h2>
                        <div className="mt-2">
                            <PlayerInventory player={myPlayer} />
                        </div>
                    </div>
                    {myTurn && (
                        <div className="flex flex-col gap-2 items-end">
                            {/* ALLY BUTTON */}
                            {currentRoom.currentCombat?.status === 'active' && currentRoom.currentCombat.playerId === socket.id && !currentRoom.currentCombat.allyId && (
                                <button
                                    onClick={() => setAllySelectionMode(true)}
                                    className="bg-amber-500 hover:bg-amber-400 text-black font-black py-2 px-6 rounded-lg shadow-lg border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 transition-all"
                                >
                                    🤝 MÜTTEFİK ARA
                                </button>
                            )}

                            <div className="flex gap-2">
                                {/* BUY LEVEL BUTTON */}
                                <button
                                    onClick={() => socket.emit('buyLevel', { roomId: currentRoom.id })}
                                    disabled={myPlayer.gold < 1000 || myPlayer.level >= 9}
                                    className={`
                                        flex flex-col items-center justify-center px-4 py-1 rounded-lg border-b-4 transition-all
                                        ${myPlayer.gold >= 1000 && myPlayer.level < 9
                                            ? 'bg-yellow-600 hover:bg-yellow-500 border-yellow-800 text-black cursor-pointer active:border-b-0 active:translate-y-1'
                                            : 'bg-slate-700 border-slate-900 text-slate-500 cursor-not-allowed opacity-50'}
                                    `}
                                    title="1000 Altın karşılığında 1 Seviye al (Max Lvl 9)"
                                >
                                    <span className="font-bold text-sm">Seviye Al</span>
                                    <span className="text-[10px] font-mono">1000 G</span>
                                </button>

                                {/* END TURN BUTTON / ACTION BUTTONS */}
                                {/* END TURN BUTTON */}
                                {currentRoom.turnPhase !== 'action_selection' && (
                                    <button
                                        onClick={() => {
                                            if (currentRoom.turnPhase === 'kick_open') {
                                                alert("Önce kapı açmalısın!");
                                                return;
                                            }
                                            if (myPlayer.hand.length > 5) {
                                                alert(`Elinizde ${myPlayer.hand.length} kart var! Turu bitirmek için en fazla 5 kartınız olmalı. Fazlalıkları atmak için kartların üzerindeki çarpı işaretini kullanın.`);
                                                return;
                                            }
                                            socket.emit('endTurn', currentRoom.id);
                                        }}
                                        disabled={currentRoom.turnPhase === 'kick_open'}
                                        className={`${myPlayer.hand.length > 5 ? 'bg-red-600 hover:bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'} text-white font-bold py-2 px-6 rounded-lg shadow-lg border-b-4 ${myPlayer.hand.length > 5 ? 'border-red-800' : 'border-blue-800'} active:border-b-0 active:translate-y-1 transition-all
                                        ${currentRoom.turnPhase === 'kick_open' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {myPlayer.hand.length > 5 ? `Fazla Kart Var (${myPlayer.hand.length}/5)` : 'Turu Bitir'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* MY HAND */}
                <div className="flex gap-4 overflow-x-auto pb-4 px-2 custom-scrollbar">
                    {myPlayer?.hand.map((card: any, idx: number) => (
                        <div
                            key={`${card.id}-${idx}`}
                            className="flex-shrink-0"
                            draggable={myTurn}
                            onDragStart={(e) => onDragStart(e, card)}
                        >
                            <Card
                                card={card}
                                isPlayable={myTurn || (currentRoom.currentCombat?.status === 'active' && (card.subType === 'fightspells' || card.subType === 'curse'))}
                                onClick={() => {
                                    if (selectingMonsterMode) {
                                        if (card.subType === 'monster') {
                                            socket.emit('lookForTrouble', { roomId: currentRoom.id, cardId: card.id });
                                            setSelectingMonsterMode(false);
                                        } else {
                                            alert("Bela aramak için bir CANAVAR kartı seçmelisiniz!");
                                        }
                                        return;
                                    }

                                    if (card.subType === 'fightspells' || card.subType === 'curse') {
                                        // Curses can also be played in combat (or usually anytime, but prompt says "same as fight spells... when others in combat")
                                        if (currentRoom.currentCombat?.status === 'active') {
                                            if (card.id.startsWith('fs_olmbakgit')) {
                                                setSelectingOlmBakGitMonster({ spellCard: card });
                                            } else {
                                                setShowSpellTarget(card);
                                            }
                                        } else {
                                            if (card.subType === 'fightspells') {
                                                alert("Savaş büyülerini sadece savaş sırasında kullanabilirsin!");
                                            } else {
                                                setShowSpellTarget(card);
                                            }
                                        }
                                    } else {
                                        socket.emit('playCard', { roomId: currentRoom.id, cardId: card.id });
                                    }
                                }}
                                onDiscard={() => {
                                    if (confirm(`${card.name} kartını atmak (satmak) istiyor musunuz?`)) {
                                        socket.emit('discardCard', { roomId: currentRoom.id, cardId: card.id });
                                    }
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
};

export default GamePage;
