// 1️⃣ SOCKET OLUŞTURULUR
const socket = io("http://localhost:3000");

socket.on("connect", () => {
    console.log("Bağlandı:", socket.id);
});

// 2️⃣ ODA OLUŞTUR
function createRoom() {
    socket.emit("createRoom", {playerName: "Efendim"});
}

socket.on("roomCreated", data => {
    alert("Oda Kodu: " + data.roomId);
});

// 3️⃣ ODAYA KATIL
function joinRoom() {
    const roomId = document.getElementById("roomId").value;
    console.log("Join basıldı:", roomId);

    socket.emit("joinRoom", {
        roomId: roomId,
        playerName: "Misafir"
    });
}

// 4️⃣ ODA GÜNCELLEMEYİ DİNLE  ✅ İŞTE ARADIĞIN YER
socket.on("roomUpdate", room => {

    const list = document.getElementById("playerList");
    list.innerHTML = ""; // listeyi temizle

    room.players.forEach(player => {
        const li = document.createElement("li");
        li.textContent = player.name;
        list.appendChild(li);
    });
    const startBtn = document.getElementById("startBtn");

    if (socket.id === room.hostId) {
        startBtn.style.display = "block";
    } else {
        startBtn.style.display = "none";
    }
});
