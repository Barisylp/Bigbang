import React from 'react';

interface LobbyPageProps {
    currentRoom: any;
    socket: any;
    handleStartGame: () => void;
}

const LobbyPage: React.FC<LobbyPageProps> = ({ currentRoom, socket, handleStartGame }) => {
    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
            <h1 className="text-3xl font-bold mb-8 text-amber-500">Lobi: {currentRoom.id}</h1>

            <div className="w-full max-w-md bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h2 className="text-xl mb-4">Oyuncular:</h2>
                <ul className="space-y-2 mb-6">
                    {currentRoom.players.map((p: any) => (
                        <li key={p.id} className="p-2 bg-slate-700 rounded flex justify-between">
                            <span>{p.name} {p.id === currentRoom.hostId ? '(Host)' : ''}</span>
                            {p.id === socket.id && <span className="text-green-400">(Sen)</span>}
                        </li>
                    ))}
                </ul>

                {currentRoom.hostId === socket.id && !currentRoom.started && (
                    <button
                        onClick={handleStartGame}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition">
                        Oyunu Başlat
                    </button>
                )}

                {currentRoom.started && (
                    <div className="text-center text-green-400 text-xl font-bold animate-pulse">
                        OYUN BAŞLADI! Yükleniyor...
                    </div>
                )}
            </div>
        </div>
    );
};

export default LobbyPage;
