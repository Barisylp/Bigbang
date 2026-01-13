import React from 'react';
import { Card } from '../components/ui/Card';

interface GamePageProps {
    currentRoom: any;
    socket: any;
}

const GamePage: React.FC<GamePageProps> = ({ currentRoom, socket }) => {
    const myPlayer = currentRoom.players.find((p: any) => p.id === socket.id);
    const myTurn = currentRoom.players[currentRoom.currentTurn].id === socket.id;

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

            {/* GAME AREA - Other Players (Simplified) */}
            <div className="flex-1 p-4 flex justify-around items-start">
                {currentRoom.players.filter((p: any) => p.id !== socket.id).map((p: any) => (
                    <div key={p.id} className="bg-slate-800 p-4 rounded border border-slate-600 w-48 text-center">
                        <div className="font-bold text-lg mb-2">{p.name}</div>
                        <div className="text-sm text-slate-400">Level: {p.level}</div>
                        <div className="text-sm text-slate-400">Elindeki Kart: {p.hand.length}</div>
                        <div className="mt-2 flex justify-center gap-1">
                            {p.hand.map((_: any, i: number) => (
                                <div key={i} className="w-4 h-6 bg-slate-600 rounded border border-slate-500"></div>
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
                            {myPlayer?.name} <span className="text-sm bg-amber-600 px-2 rounded">Lvl {myPlayer?.level}</span>
                        </h2>
                    </div>
                    {myTurn && (
                        <button
                            onClick={() => socket.emit('endTurn', currentRoom.id)}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all"
                        >
                            Turu Bitir
                        </button>
                    )}
                </div>

                {/* MY HAND */}
                <div className="flex gap-4 overflow-x-auto pb-4 px-2 custom-scrollbar">
                    {myPlayer?.hand.map((card: any, idx: number) => (
                        <div key={`${card.id}-${idx}`} className="flex-shrink-0">
                            <Card card={card} isPlayable={myTurn} onClick={() => alert(`Kart Oynandı: ${card.name}`)} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GamePage;
