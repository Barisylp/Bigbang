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

        return (
            <div className="flex gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-700 min-h-[5rem] items-center justify-center transition-colors hover:bg-slate-800/80"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDropInventory}>
                <InventorySlot label="Irk" item={player.race} type="race" />
                <InventorySlot label="Sınıf" item={player.class} type="class" />
                <div className="w-px bg-slate-600 mx-1"></div>
                <InventorySlot label="Kafa" item={headItem} />
                <InventorySlot label="Gövde" item={bodyItem} />
                <InventorySlot label="Ayak" item={footItem} />
                <InventorySlot label="El 1" item={handItems[0]} />
                <InventorySlot label="El 2" item={handItems[1]} />
                {otherItems.map((item: any, idx: number) => (
                    <InventorySlot key={`other-${idx}`} label="Diğer" item={item} />
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col overflow-hidden relative">

            {/* 1. POPUP OVERLAYS (FIXED TO COVER EVERYTHING) */}
            {currentRoom.currentCombat && currentRoom.currentCombat.status === 'active' && (() => {
                const combatant = currentRoom.players.find((p: any) => p.id === currentRoom.currentCombat.playerId);
                const combatantPower = getCombatStrength(combatant);
                const isMe = socket.id === combatant?.id;

                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                        <div className="flex flex-col items-center bg-slate-900 p-8 rounded-3xl border-4 border-red-600 shadow-[0_0_100px_rgba(220,38,38,0.4)] min-w-[600px] max-w-4xl relative">
                            <h2 className="text-5xl font-black text-red-600 mb-10 tracking-[1rem] uppercase animate-pulse">DÖVÜŞ</h2>
                            <div className="flex items-center gap-12 justify-center w-full mb-10">
                                <div className="text-center flex flex-col items-center bg-slate-800/50 p-6 rounded-2xl border border-blue-500/30">
                                    <div className="text-white font-black text-2xl mb-2">{combatant?.name}</div>
                                    <div className="text-sm text-slate-400 font-bold uppercase tracking-widest">Seviye {combatant?.level}</div>
                                    <div className="text-7xl font-black text-blue-500 mt-4 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">{combatantPower}</div>
                                    <div className="text-blue-400 text-sm font-bold mt-2">⚔️ TOPLAM GÜÇ</div>
                                </div>
                                <div className="text-6xl font-black text-slate-700 italic">VS</div>
                                <div className="scale-125 transform transition-transform hover:scale-150 z-10 filter drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                                    <Card card={currentRoom.currentCombat.monster} />
                                </div>
                            </div>
                            {isMe ? (
                                <button
                                    onClick={() => socket.emit('resolveCombat', { roomId: currentRoom.id })}
                                    className={`text-white font-black py-5 px-16 rounded-full shadow-2xl text-2xl transition-all hover:scale-105 active:scale-95 uppercase tracking-widest
                                    ${combatantPower > currentRoom.currentCombat.monster.level
                                            ? 'bg-gradient-to-r from-green-600 to-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.4)]'
                                            : 'bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.4)]'}`}
                                >
                                    {combatantPower > currentRoom.currentCombat.monster.level ? "ZAFERİ İLAN ET!" : "YENİLGİYİ KABUL ET..."}
                                </button>
                            ) : (
                                <div className="text-slate-500 animate-pulse font-black text-xl tracking-[0.3rem] uppercase">
                                    {combatant?.name} dövüşün kaderini bekliyor...
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {currentRoom.pendingDraw && (() => {
                const drawer = currentRoom.players.find((p: any) => p.id === currentRoom.pendingDraw.playerId);
                const isMe = socket.id === drawer?.id;
                const isPublic = currentRoom.pendingDraw.isPublic;
                const card = currentRoom.pendingDraw.card;

                return (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                        <div className="flex flex-col items-center bg-slate-900/95 p-12 rounded-[2.5rem] border-4 border-amber-500 shadow-[0_0_100px_rgba(245,158,11,0.3)] min-w-[400px] max-w-lg">
                            <div className="text-amber-500 font-black text-3xl mb-8 tracking-[0.5rem] uppercase text-center drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                                {isPublic ? "KAPI ARALANDI!" : "SESSİZ YAĞMA"}
                            </div>
                            <div className="mb-10 scale-[1.3] transform drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                                {(isPublic || isMe) ? (
                                    <Card card={card} />
                                ) : (
                                    <div className="w-32 h-44 bg-slate-800 border-4 border-slate-700 rounded-xl flex items-center justify-center relative overflow-hidden">
                                        <div className="absolute inset-2 border-2 border-dashed border-slate-600 rounded opacity-20"></div>
                                        <div className="text-4xl filter grayscale opacity-20">🚪</div>
                                        <div className="absolute bottom-2 text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Gizli Kart</div>
                                    </div>
                                )}
                            </div>
                            <div className="text-center mb-10">
                                <div className="text-white font-black text-2xl mb-1">{drawer?.name}</div>
                                <div className="text-slate-400 font-bold tracking-widest uppercase text-xs">
                                    {isPublic
                                        ? (card.subType === 'curse' ? 'BİR LANETE YAKALANDI!' : 'YENİ BİR ŞEYLER BULDUN...')
                                        : 'ODADAN BİR KART AŞIRDI...'}
                                </div>
                            </div>
                            {isMe ? (
                                <button
                                    onClick={() => socket.emit('takeCard', { roomId: currentRoom.id })}
                                    className="bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-white font-black py-4 px-16 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all hover:scale-110 active:scale-95 uppercase tracking-widest text-lg"
                                >
                                    KARTIMI AL
                                </button>
                            ) : (
                                <div className="text-amber-500/30 animate-pulse font-black text-sm uppercase tracking-[0.2rem]">
                                    OYUNCU BEKLENİYOR...
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* 2. TOP BAR */}
            <div className="bg-slate-800 p-2 flex justify-between items-center border-b border-slate-700">
                <div className="font-bold text-amber-500 text-xl">Anadolu Munchkin - Oda: {currentRoom.id}</div>
                <div className="flex gap-4 items-center">
                    <div className={`px-4 py-1 rounded font-bold ${myTurn ? 'bg-green-600 animate-pulse' : 'bg-slate-600'}`}>
                        {myTurn ? 'SENİN SIRAN!' : `Sıra: ${currentRoom.players[currentRoom.currentTurn].name}`}
                    </div>
                    {myTurn && (
                        <div className="bg-blue-900/50 px-3 py-1 rounded border border-blue-700 text-xs font-bold text-blue-200 uppercase tracking-wider">
                            AŞAMA: {
                                currentRoom.phase === 'kick' ? 'Kapıyı Tekmele' :
                                    currentRoom.phase === 'action' ? 'Bela Ara / Yağmala' :
                                        currentRoom.phase === 'combat' ? 'Dövüş' : 'Tur Sonu'
                            }
                        </div>
                    )}
                </div>
                <button className="bg-red-900 px-3 py-1 rounded text-xs hover:bg-red-700">Çık</button>
            </div>

            {/* 3. MAIN CONTENT AREA */}
            <div className="flex-1 p-4 flex flex-col justify-around items-center relative overflow-hidden">
                {/* DECKS ROW */}
                <div className="flex gap-12 items-center z-10">
                    {/* DOOR DECK */}
                    <div
                        onClick={() => {
                            if (myTurn) {
                                if (currentRoom.phase === 'kick') socket.emit('drawDoorCard', { roomId: currentRoom.id });
                                else if (currentRoom.phase === 'action') socket.emit('lootTheRoom', { roomId: currentRoom.id });
                            }
                        }}
                        className={`w-32 h-44 bg-slate-900 border-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all shadow-xl group relative select-none
                            ${myTurn && (currentRoom.phase === 'kick' || currentRoom.phase === 'action') ? 'border-amber-600 hover:border-amber-400 hover:scale-105' : 'border-slate-700 opacity-70 cursor-not-allowed'}`}
                    >
                        <div className="absolute inset-2 border-2 border-dashed border-slate-600 rounded opacity-50"></div>
                        <div className="z-10 text-center">
                            <div className="text-4xl mb-2">🚪</div>
                            <div className="font-bold text-slate-300">KAPI</div>
                            <div className="text-xs text-slate-500 mt-1">{currentRoom.doorDeck?.length || 0} Kart</div>
                        </div>
                        {myTurn && currentRoom.phase === 'kick' && <div className="absolute bottom-2 text-[10px] text-amber-500 font-bold animate-bounce uppercase">Tekmele!</div>}
                        {myTurn && currentRoom.phase === 'action' && <div className="absolute bottom-2 text-[10px] text-green-500 font-bold animate-pulse uppercase">Yağmala!</div>}
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
                            <div>{currentRoom.discardPile?.length || 0} Kart</div>
                        </div>
                    </div>

                    {/* TREASURE DECK */}
                    <div className="w-32 h-44 bg-slate-900 border-4 border-yellow-700 rounded-xl flex flex-col items-center justify-center opacity-70 cursor-not-allowed relative">
                        <div className="absolute inset-2 border-2 border-dashed border-yellow-600 rounded opacity-50 bg-yellow-900/10"></div>
                        <div className="z-10 text-center">
                            <div className="text-4xl mb-2">💰</div>
                            <div className="font-bold text-yellow-500">HAZİNE</div>
                        </div>
                    </div>
                </div>

                {/* OTHER PLAYERS ROWS */}
                <div className="w-full flex justify-center gap-4 overflow-x-auto p-2">
                    {currentRoom.players.filter((p: any) => p.id !== socket.id).map((p: any) => (
                        <div key={p.id} className="bg-slate-800 p-3 rounded-xl border border-slate-600 flex flex-col items-center min-w-[180px]">
                            <div className="font-bold text-base mb-1">{p.name}</div>
                            <div className="flex items-center gap-2 mb-2 text-[10px]">
                                <span className="bg-amber-600 px-1 rounded">Lvl {p.level}</span>
                                <span className="bg-red-800 px-1 rounded">⚔️ {getCombatStrength(p)}</span>
                            </div>
                            <PlayerInventory player={p} />
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. MY AREA (BOTTOM FIXED) */}
            <div className="bg-slate-800 p-4 border-t border-slate-700">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h2 className="text-xl font-black flex items-center gap-3">
                            {myPlayer?.name}
                            <span className="text-xs bg-amber-600 px-2 py-0.5 rounded-full">LVL {myPlayer?.level}</span>
                            <span className="text-xs bg-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">⚔️ {myPower}</span>
                            <span className="text-xs bg-yellow-600 text-black font-black px-2 py-0.5 rounded-full flex items-center gap-1">🪙 {myPlayer?.gold || 0}</span>
                        </h2>
                        <div className="mt-2">
                            <PlayerInventory player={myPlayer} />
                        </div>
                    </div>
                    {myTurn && (
                        <button
                            onClick={() => socket.emit('endTurn', currentRoom.id)}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-black py-2 px-8 rounded-xl shadow-lg border-b-4 border-blue-950 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-widest text-sm"
                        >
                            Turu Bitir
                        </button>
                    )}
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 px-2 custom-scrollbar">
                    {myPlayer?.hand.map((card: any, idx: number) => {
                        const canLookForTrouble = card.subType === 'monster' && myTurn && currentRoom.phase === 'action';
                        return (
                            <div key={`${card.id}-${idx}`} className="flex-shrink-0 flex flex-col items-center gap-2">
                                <Card
                                    card={card}
                                    isPlayable={myTurn}
                                    onClick={() => socket.emit('playCard', { roomId: currentRoom.id, cardId: card.id })}
                                    onDiscard={() => socket.emit('discardCard', { roomId: currentRoom.id, cardId: card.id })}
                                />
                                {canLookForTrouble && (
                                    <button
                                        onClick={() => socket.emit('lookForTrouble', { roomId: currentRoom.id, cardId: card.id })}
                                        className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-black py-1 px-4 rounded-full shadow-lg border-b-2 border-red-950 animate-pulse uppercase"
                                    >
                                        Bela Ara!
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default GamePage;
