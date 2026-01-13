import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:3000', {
  autoConnect: false,
});

function App() {
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [inLobby, setInLobby] = useState(false);

  useEffect(() => {
    socket.on('connect', () => {
      setConnected(true);
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from server');
    });

    socket.on('roomCreated', (data: { roomId: string }) => {
      console.log('Room Created:', data.roomId);
      setRoomId(data.roomId);
      setInLobby(true);
    });

    socket.on('roomUpdate', (room: any) => {
      console.log('Room Update:', room);
      setCurrentRoom(room);
      setInLobby(true);
    });

    socket.on('error', (msg: string) => {
      alert('Error: ' + msg);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('roomCreated');
      socket.off('roomUpdate');
      socket.off('error');
    };
  }, []);

  const handleConnect = () => {
    socket.connect();
  };

  const handleCreateRoom = () => {
    if (!playerName) return alert("Adını gir!");
    if (!connected) socket.connect();
    socket.emit('createRoom', { playerName });
  };

  const handleJoinRoom = () => {
    if (!playerName || !roomId) return alert("Ad ve Oda ID gir!");
    if (!connected) socket.connect();
    socket.emit('joinRoom', { roomId, playerName });
  };

  const handleStartGame = () => {
    if (currentRoom) {
      socket.emit('startGame', currentRoom.id);
    }
  }

  if (inLobby && currentRoom) {
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
              OYUN BAŞLADI!
            </div>
          )}
        </div>
      </div>
    )
  }

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
  )
}

export default App
