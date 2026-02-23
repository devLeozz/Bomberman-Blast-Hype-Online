const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

// Servir arquivos do site (game.html etc)
app.use(express.static('public'));

// Armazena servidores de jogo
let gameServers = {};

// Conexão de jogadores
io.on('connection', socket => {
  console.log("Jogador conectado:", socket.id);

  // Entrar em lobby
  socket.on('joinLobby', data => {
    const { serverID, nick } = data;

    if (!gameServers[serverID]) return socket.emit('errorMsg', "Servidor não existe");

    const server = gameServers[serverID];
    if (server.players.length >= server.maxPlayers) return socket.emit('errorMsg', "Servidor cheio");

    server.players.push({id: socket.id, nick});
    socket.join(serverID);
    io.to(serverID).emit('updatePlayers', server.players);
  });

  // Criar servidor
  socket.on('createServer', data => {
    const { serverID, nick, maxPlayers } = data;
    gameServers[serverID] = { id: serverID, owner: socket.id, players:[{id: socket.id, nick}], maxPlayers };
    socket.join(serverID);
    io.to(serverID).emit('updatePlayers', gameServers[serverID].players);
  });

  // Iniciar partida
  socket.on('startGame', serverID => {
    const server = gameServers[serverID];
    if (server && socket.id === server.owner){
      io.to(serverID).emit('startGame'); // avisa todos os jogadores
    }
  });

  socket.on('disconnect', ()=>{
    for(const id in gameServers){
      const s = gameServers[id];
      const index = s.players.findIndex(p=>p.id===socket.id);
      if(index>=0) s.players.splice(index,1);
      io.to(id).emit('updatePlayers', s.players);
    }
    console.log("Jogador desconectou:", socket.id);
  });
});

http.listen(PORT, ()=>console.log(`Servidor rodando na porta ${PORT}`));