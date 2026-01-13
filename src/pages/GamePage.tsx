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

    // Calculates Total Wealth (Hands + Equipment)
    const getMyWealth = () => {
        if (!myPlayer) return 0;
        let total = 0;
        // Check hand
        myPlayer.hand.forEach((card: any) => {
            if (card.goldValue) total += card.goldValue;
        });
        // Check equipment
        if (myPlayer.equipment) {
            myPlayer.equipment.forEach((item: any) => {
                if (item.goldValue) total += item.goldValue;
            });
        }
        return total;
    };

    const myWealth = getMyWealth();

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
            <div className="flex gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-700">
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
                {/* Discard Pile Visualization */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-44 border-4 border-dashed border-slate-600 rounded-xl flex items-center justify-center bg-slate-800/50">
                    <div className="text-center text-slate-500 text-xs">
                        <div className="font-bold mb-1">Discard Pile</div>
                        <div>{currentRoom.discardPile?.length || 0} Çöp</div>
                        {currentRoom.discardPile?.length > 0 && <div className="text-[10px] mt-1 text-slate-400">Son: {currentRoom.discardPile[currentRoom.discardPile.length - 1].name}</div>}
                    </div>
                </div>

                {currentRoom.players.filter((p: any) => p.id !== socket.id).map((p: any) => (
                    <div key={p.id} className="bg-slate-800 p-4 rounded border border-slate-600 flex flex-col items-center">
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
                                🪙 {myWealth}
                            </span>
                        </h2>
                        <div className="mt-2">
                            <PlayerInventory player={myPlayer} />
                        </div>
                    </div>
                    {myTurn && (
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
                    )}
                </div>

                {/* MY HAND */}
                <div className="flex gap-4 overflow-x-auto pb-4 px-2 custom-scrollbar">
                    {myPlayer?.hand.map((card: any, idx: number) => (
                        <div key={`${card.id}-${idx}`} className="flex-shrink-0">
                            <Card
                                card={card}
                                isPlayable={myTurn}
                                onClick={() => socket.emit('playCard', { roomId: currentRoom.id, cardId: card.id })}
                                onDiscard={() => {
                                    if (confirm(`${card.name} kartını atmak istiyor musunuz?`)) {
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
