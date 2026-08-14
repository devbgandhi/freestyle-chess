const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.send('Server ruuning ok'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {origin: '*'}
});

require('./sockets')(io);
const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));