import React from 'react';

interface LoginPageProps {
    playerName: string;
    setPlayerName: (name: string) => void;
    roomId: string;
    setRoomId: (id: string) => void;
    handleCreateRoom: () => void;
    handleJoinRoom: () => void;
    connected: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({
    playerName,
    setPlayerName,
    roomId,
    setRoomId,
    handleCreateRoom,
    handleJoinRoom,
    connected,
}) => {
    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
            <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">
                Anadolu Munchkin Multiplayer Test
            </h1>

            <div className="w-full max-w-md bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl">
                <div className="mb-6">
                    <label className="block text-slate-400 mb-2">Oyuncu Adı</label>
                    <input
                        type="text"
                        value={playerName}
                        onChange={e => setPlayerName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-amber-500"
                        placeholder="Adını yaz..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                        onClick={handleCreateRoom}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded transition"
                    >
                        Oda Oluştur
                    </button>
                    <div className="flex flex-col gap-2">
                        <input
                            type="text"
                            value={roomId}
                            onChange={e => setRoomId(e.target.value.toUpperCase())}
                            className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-center tracking-widest uppercase"
                            placeholder="ODA KODU"
                        />
                        <button
                            onClick={handleJoinRoom}
                            className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-1 px-4 rounded transition"
                        >
                            Katıl
                        </button>
                    </div>
                </div>

                <div className="text-center text-sm text-slate-500">
                    Status: {connected ? <span className="text-green-500">Connected</span> : <span className="text-red-500">Disconnected</span>}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
