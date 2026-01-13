import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card } from './components/Card';

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
    // GAME BOARD VIEW
    if (currentRoom.started) {
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
      )
    }

    // LOBBY VIEW
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
