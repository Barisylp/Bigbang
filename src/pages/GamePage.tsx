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

    const playFightSpell = (cardId: string, target: 'player' | 'monster') => {
        socket.emit('playFightSpell', { roomId: currentRoom.id, cardId, target });
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

                {/* CENTER DECKS (Absolute Positioned) */}
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
                                    <div className="text-center flex flex-col items-center bg-slate-900/80 p-6 rounded-xl border border-blue-500/30">
                                        <div className="text-white font-bold text-2xl mb-1">{combatant?.name}</div>
                                        <div className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-4">SAVAŞÇI</div>
                                        <div className="text-6xl font-black text-white flex items-center gap-3 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                            <span className="text-3xl text-blue-500">⚔️</span> {combatantPower + (currentRoom.currentCombat.playerBonus || 0)}
                                        </div>
                                        {currentRoom.currentCombat.playerBonus > 0 && (
                                            <div className="text-green-400 font-bold mt-1 text-sm">+{currentRoom.currentCombat.playerBonus} Bonus</div>
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
                                                playFightSpell(draggedCard.id, 'monster');
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

                                {showSpellTarget && (
                                    <div className="mt-4 flex flex-col items-center gap-2 bg-slate-800 p-4 rounded-xl border border-amber-500">
                                        <div className="text-amber-500 font-bold text-sm">Hedef Seç: {showSpellTarget.name}</div>
                                        <div className="flex gap-4">
                                            <button onClick={() => playFightSpell(showSpellTarget.id, 'player')} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-bold">OYUNCU (+{showSpellTarget.bonus})</button>
                                            <button onClick={() => playFightSpell(showSpellTarget.id, 'monster')} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded font-bold">CANAVAR (+{showSpellTarget.bonus})</button>
                                        </div>
                                        <button onClick={() => setShowSpellTarget(null)} className="text-xs text-slate-400 mt-2">İptal</button>
                                    </div>
                                )}

                                {isMe ? (
                                    <div className="flex flex-col items-center gap-4 w-full">
                                        <button
                                            onClick={() => socket.emit('resolveCombat', { roomId: currentRoom.id })}
                                            className={`w-full max-w-md text-white font-black py-4 px-10 rounded-xl shadow-2xl text-2xl transition-all hover:scale-105 active:scale-95 border-b-8
                                        ${(combatantPower + (currentRoom.currentCombat.playerBonus || 0)) > (currentRoom.currentCombat.monster.level + (currentRoom.currentCombat.monsterBonus || 0))
                                                    ? 'bg-gradient-to-r from-green-600 to-green-500 border-green-800 hover:from-green-500 hover:to-green-400 shadow-[0_0_30px_rgba(34,197,94,0.4)]'
                                                    : 'bg-gradient-to-r from-red-800 to-red-600 border-red-950 hover:from-red-700 hover:to-red-500 shadow-[0_0_30px_rgba(220,38,38,0.4)]'}`}
                                        >
                                            {(combatantPower + (currentRoom.currentCombat.playerBonus || 0)) > (currentRoom.currentCombat.monster.level + (currentRoom.currentCombat.monsterBonus || 0)) ? "ŞİMDİ KAZAN! (WIN)" : "KAYBET... (LOSE)"}
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
                                socket.emit('drawDoorCard', { roomId: currentRoom.id });
                            } else {
                                alert("Sadece kendi turunda kart çekebilirsin!");
                            }
                        }}
                        className={`w-32 h-44 bg-slate-900 border-4 border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-amber-600 transition-colors shadow-xl group relative select-none
                        ${!myTurn ? 'opacity-70 cursor-not-allowed' : ''}`}
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
                        onClick={() => {
                            if (myTurn) {
                                socket.emit('drawTreasureCard', { roomId: currentRoom.id });
                            } else {
                                alert("Sadece kendi turunda kart çekebilirsin!");
                            }
                        }}
                        className={`w-32 h-44 bg-slate-900 border-4 border-yellow-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-yellow-500 transition-colors shadow-xl group relative select-none
                        ${!myTurn ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        <div className="absolute inset-2 border-2 border-dashed border-yellow-600 rounded opacity-50 bg-yellow-900/10"></div>
                        <div className="z-10 text-center">
                            <div className="text-4xl mb-2">💰</div>
                            <div className="font-bold text-yellow-500">HAZİNE</div>
                            <div className="text-xs text-slate-400 mt-1">{currentRoom.treasureDeck?.length || 0} Kart</div>
                        </div>
                        <div className="absolute bottom-2 text-[10px] text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                            ÇEKMEK İÇİN TIKLA
                        </div>
                    </div>
                </div>

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

                            {/* END TURN BUTTON */}
                            <button
                                onClick={() => {
                                    if (myPlayer.hand.length > 5) {
                                        alert(`Elinizde ${myPlayer.hand.length} kart var! Turu bitirmek için en fazla 5 kartınız olmalı. Fazlalıkları atmak için kartların üzerindeki çarpı işaretini kullanın.`);
                                        return;
                                    }
                                    socket.emit('endTurn', currentRoom.id);
                                }}
                                className={`${myPlayer.hand.length > 5 ? 'bg-red-600 hover:bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'} text-white font-bold py-2 px-6 rounded-lg shadow-lg border-b-4 ${myPlayer.hand.length > 5 ? 'border-red-800' : 'border-blue-800'} active:border-b-0 active:translate-y-1 transition-all`}
                            >
                                {myPlayer.hand.length > 5 ? `Fazla Kart Var (${myPlayer.hand.length}/5)` : 'Turu Bitir'}
                            </button>
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
                                isPlayable={myTurn}
                                onClick={() => {
                                    if (card.subType === 'fightspells') {
                                        if (currentRoom.currentCombat?.status === 'active') {
                                            setShowSpellTarget(card);
                                        } else {
                                            alert("Savaş büyülerini sadece savaş sırasında kullanabilirsin!");
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
        </div>
    );
};

export default GamePage;
