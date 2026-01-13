import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';

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
    if (currentRoom.started) {
      return <GamePage currentRoom={currentRoom} socket={socket} />;
    }
    return <LobbyPage currentRoom={currentRoom} socket={socket} handleStartGame={handleStartGame} />;
  }

  return (
    <LoginPage
      playerName={playerName}
      setPlayerName={setPlayerName}
      roomId={roomId}
      setRoomId={setRoomId}
      handleCreateRoom={handleCreateRoom}
      handleJoinRoom={handleJoinRoom}
      connected={connected}
    />
  );
}

export default App;
