import React from 'react';
import { Card } from '../components/ui/Card';

interface GamePageProps {
    currentRoom: any;
    socket: any;
}

const GamePage: React.FC<GamePageProps> = ({ currentRoom, socket }) => {
    const myPlayer = currentRoom.players.find((p: any) => p.id === socket.id);
    const myTurn = (currentRoom.players[currentRoom.currentTurn]?.id === socket.id);

    // Calculate Combat Power Frontend Side
    const getCombatStrength = (player: any) => {
        if (!player) return 0;
        let strength = player.level;
        if (player.equipment) {
            player.equipment.forEach((item: any) => {
                if (item.bonus) strength += item.bonus;
            });
        }
        return strength;
    };

    const myPower = getCombatStrength(myPlayer);

    // State for spell targeting
    const [showSpellTarget, setShowSpellTarget] = React.useState<any>(null);

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
            socket.emit('moveToBackpack', { roomId: currentRoom.id, cardId: draggedCard.id });
            setDraggedCard(null);
        }
    };

    const playFromBackpack = (cardId: string) => {
        socket.emit('playFromBackpack', { roomId: currentRoom.id, cardId });
    };

    const takeFromBackpack = (cardId: string) => {
        socket.emit('removeFromBackpack', { roomId: currentRoom.id, cardId });
    };

    const playCard = (cardId: string) => {
        socket.emit('playCard', { roomId: currentRoom.id, cardId });
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
                <div className="flex-1 flex gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-700 min-h-[5rem] items-center justify-center transition-colors hover:bg-slate-800/80"
                    onDragOver={(e) => isMyPlayer && e.preventDefault()}
                    onDrop={isMyPlayer ? onDropInventory : undefined}>
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
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col overflow-hidden relative">
            {/* Combat Overlay */}
            {currentRoom.currentCombat && currentRoom.currentCombat.status === 'active' && (() => {
                const combatant = currentRoom.players.find((p: any) => p.id === currentRoom.currentCombat.playerId);
                const isMe = socket.id === combatant?.id;
                const monster = currentRoom.currentCombat.monster;
                const playerBonus = currentRoom.currentCombat.playerBonus || 0;
                const monsterBonus = currentRoom.currentCombat.monsterBonus || 0;
                const combatantPower = getCombatStrength(combatant) + playerBonus;
                const monsterPower = monster.level + monsterBonus;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="relative flex flex-col items-center bg-black/90 p-8 rounded-2xl border-4 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.5)] min-w-[600px] max-w-4xl text-center">
                            <h2 className="text-4xl font-black text-red-500 mb-8 animate-pulse uppercase">DÖVÜŞ BAŞLADI!</h2>
                            <div className="mb-6">
                                <div className={`text-4xl font-black px-6 py-2 rounded-full border-4 shadow-lg ${(currentRoom.currentCombat.timer || 0) <= 3 ? 'text-red-500 border-red-500 animate-bounce' : 'text-amber-500 border-amber-500'
                                    }`}>
                                    ⏱️ {currentRoom.currentCombat.timer || 0}s
                                </div>
                            </div>
                            <div className="flex items-center gap-12 justify-center w-full mb-8">
                                <div className="flex flex-col items-center">
                                    <div className="text-white font-black text-2xl uppercase">{combatant?.name}</div>
                                    <div className="text-7xl font-black text-blue-400 mt-4">⚔️ {combatantPower}</div>
                                    {playerBonus !== 0 && <div className="text-green-400 font-bold animate-pulse">({playerBonus > 0 ? '+' : ''}{playerBonus} Bonus)</div>}
                                </div>
                                <div className="text-5xl font-black text-slate-700">VS</div>
                                <div className="flex flex-col items-center"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        if (draggedCard && draggedCard.subType === 'fightspells') {
                                            setShowSpellTarget(draggedCard);
                                            setDraggedCard(null);
                                        }
                                    }}
                                >
                                    <div className="text-red-500 font-black text-2xl uppercase">{monster.name}</div>
                                    <div className="scale-110 my-4"><Card card={monster} /></div>
                                    <div className="text-4xl font-black text-red-500">👹 {monsterPower}</div>
                                    {monsterBonus !== 0 && <div className="text-red-400 font-bold animate-pulse">({monsterBonus > 0 ? '+' : ''}{monsterBonus} Bonus)</div>}
                                </div>
                            </div>
                            {isMe ? (
                                <button onClick={() => socket.emit('resolveCombat', { roomId: currentRoom.id })}
                                    className={`mt-12 text-white font-black py-5 px-20 rounded-full shadow-2xl text-2xl transition-all hover:scale-110 active:scale-95 uppercase ${combatantPower > monsterPower ? 'bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_40px_rgba(34,197,94,0.6)]' : 'bg-gradient-to-r from-red-800 to-red-600 shadow-[0_0_40px_rgba(153,27,27,0.6)]'
                                        }`}>
                                    {combatantPower > monsterPower ? "🦁 KAZAN! (WIN)" : "💀 KAYBET... (LOSE)"}
                                </button>
                            ) : (
                                <div className="mt-12 text-slate-500 font-black text-sm uppercase tracking-widest">{combatant?.name} DÖVÜŞÜYOR...</div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Draw Overlay */}
            {currentRoom.pendingDraw && (() => {
                const drawer = currentRoom.players.find((p: any) => p.id === currentRoom.pendingDraw.playerId);
                const isMe = socket.id === drawer?.id;
                const { card, isPublic } = currentRoom.pendingDraw;
                return (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md">
                        <div className="flex flex-col items-center text-center">
                            <div className="mb-6">
                                <div className="text-white font-black text-2xl">{drawer?.name}</div>
                                <div className="text-slate-400 font-bold uppercase text-xs">{isPublic ? 'BİR KART ÇEKTİ!' : 'GİZLİ BİR KART ALDI...'}</div>
                            </div>
                            <div className="mb-10 scale-150">
                                {isMe || isPublic ? <Card card={card} /> : <div className="w-48 h-72 bg-slate-800 border-4 border-slate-700 rounded-2xl flex items-center justify-center font-black text-7xl text-slate-600">?</div>}
                            </div>
                            {isMe && <button onClick={() => socket.emit('takeCard', { roomId: currentRoom.id })}
                                className="bg-amber-600 hover:bg-amber-500 text-white font-black py-4 px-16 rounded-full shadow-2xl text-lg uppercase tracking-widest">KARTIMI AL</button>}
                        </div>
                    </div>
                );
            })()}

            {/* Spell Modal */}
            {showSpellTarget && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                    <div className="bg-slate-900 p-8 rounded-3xl border-4 border-amber-600 shadow-2xl max-w-lg w-full text-center">
                        <h3 className="text-3xl font-black text-amber-500 mb-8 uppercase">HEDEF SEÇ!</h3>
                        <div className="flex flex-col gap-4">
                            <button onClick={() => { socket.emit('playFightSpell', { roomId: currentRoom.id, cardId: showSpellTarget.id, target: 'player' }); setShowSpellTarget(null); }}
                                className="bg-blue-900/40 hover:bg-blue-600/60 p-6 rounded-2xl border-2 border-blue-500 transition-all font-black text-xl flex justify-between items-center text-blue-400 uppercase">OYUNCU 🛡️</button>
                            <button onClick={() => { socket.emit('playFightSpell', { roomId: currentRoom.id, cardId: showSpellTarget.id, target: 'monster' }); setShowSpellTarget(null); }}
                                className="bg-red-900/40 hover:bg-red-600/60 p-6 rounded-2xl border-2 border-red-500 transition-all font-black text-xl flex justify-between items-center text-red-500 uppercase">CANAVAR 👹</button>
                        </div>
                        <button onClick={() => setShowSpellTarget(null)} className="mt-8 text-slate-500 font-bold uppercase text-xs">Vazgeç</button>
                    </div>
                </div>
            )}

            {/* Top Bar */}
            <div className="bg-slate-800 p-2 flex justify-between items-center border-b border-slate-700 shadow-md z-20">
                <div className="font-black text-amber-500 text-xl tracking-tighter uppercase px-2">Anadolu Munchkin - {currentRoom.id}</div>
                <div className="flex gap-4 items-center">
                    <div className={`px-4 py-1.5 rounded-full border-2 font-black text-sm ${myTurn ? 'bg-green-600/20 border-green-500 text-green-400 animate-pulse' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                        {myTurn ? '👉 SENİN SIRAN!' : `⏳ SIRA: ${currentRoom.players[currentRoom.currentTurn]?.name}`}
                    </div>
                </div>
                <button className="bg-red-900/50 hover:bg-red-700 text-red-400 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase">Çıkış</button>
            </div>

            {/* Main Area */}
            <div className="flex-1 p-4 flex flex-col justify-around items-center relative overflow-hidden">
                <div className="flex gap-12 items-center z-10">
                    <div onClick={() => { if (myTurn) { if (currentRoom.phase === 'kick') socket.emit('drawDoorCard', { roomId: currentRoom.id }); else if (currentRoom.phase === 'action') socket.emit('lootTheRoom', { roomId: currentRoom.id }); } }}
                        className={`w-32 h-44 bg-slate-950 border-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all shadow-2xl group relative
                            ${myTurn && (currentRoom.phase === 'kick' || currentRoom.phase === 'action') ? 'border-amber-600 hover:border-amber-400 hover:scale-110' : 'border-slate-800 opacity-50 grayscale'}`}>
                        <div className="text-5xl mb-2 group-hover:scale-125 transition-transform">🚪</div>
                        <div className="font-black text-slate-300 tracking-widest text-sm">KAPI</div>
                        <div className="text-[10px] text-amber-500 mt-1 font-bold">{currentRoom.doorDeck?.length || 0} KART</div>
                    </div>
                    <div onDragOver={(e) => e.preventDefault()} onDrop={onDropDiscard}
                        className={`w-36 h-[12rem] border-4 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all bg-slate-950/30
                            ${draggedCard ? 'border-red-500 bg-red-900/20 scale-110' : 'border-slate-800'}`}>
                        <div className="text-3xl opacity-20">🗑️</div>
                        <div className="font-black text-[10px] text-slate-700 uppercase tracking-widest">ISKAT / SAT</div>
                    </div>
                </div>
                <div className="w-full flex justify-center gap-6 overflow-x-auto p-4">
                    {currentRoom.players.filter((p: any) => p.id !== socket.id).map((p: any) => (
                        <div key={p.id} className="bg-slate-800/40 p-4 rounded-3xl border-2 border-slate-700/50 flex flex-col items-center min-w-[320px]">
                            <div className="font-black text-lg uppercase mb-3">{p.name}</div>
                            <div className="flex items-center gap-4 mb-4 text-[11px] font-black">
                                <span className="bg-amber-600 text-slate-900 px-3 py-1 rounded-full">Lvl {p.level}</span>
                                <span className="bg-red-800 px-3 py-1 rounded-full">⚔️ {getCombatStrength(p)} Güç</span>
                            </div>
                            <PlayerInventory player={p} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-slate-800/95 border-t-4 border-slate-700 p-6 backdrop-blur-xl z-30">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <h2 className="text-3xl font-black uppercase">{myPlayer?.name}</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black bg-amber-500 text-slate-900 px-4 py-1.5 rounded-full">LVL {myPlayer?.level}</span>
                                <span className="text-xs font-black bg-blue-600 px-4 py-1.5 rounded-full">⚔️ {myPower} GÜÇ</span>
                                <span className="text-xs font-black bg-yellow-600 text-slate-950 px-4 py-1.5 rounded-full tracking-widest">🪙 {myPlayer?.gold || 0} ALTIN</span>
                            </div>
                        </div>
                        <PlayerInventory player={myPlayer} />
                    </div>
                    {myTurn && <button onClick={() => socket.emit('endTurn', currentRoom.id)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-12 rounded-2xl shadow-[0_4px_0_0_#1e3a8a] transition-all uppercase tracking-widest text-sm">Turu Bitir</button>}
                </div>
                <div className="flex gap-4 overflow-x-auto py-4">
                    {myPlayer?.hand.map((card: any, idx: number) => (
                        <div key={`${card.id}-${idx}`} draggable={true} onDragStart={(e) => onDragStart(e, card)} className="transition-transform hover:-translate-y-4">
                            <Card card={card} isPlayable={myTurn || currentRoom.phase === 'combat'} onClick={() => playCard(card.id)} onDiscard={() => { if (confirm(`${card.name} kartını atmak istiyor musunuz?`)) socket.emit('discardCard', { roomId: currentRoom.id, cardId: card.id }); }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GamePage;
