const express = require('express')
const app = express()

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const socketServer = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(socketServer);

const portSocket = process.env.PORT_SOCKET || 3002
socketServer.listen(portSocket, () => {
    console.log('socketServer listening on port = ' + portSocket);
});

const portApp = process.env.PORT_APP || 9002
app.listen(portApp, () => {
    console.log('app listening on port = ' + portApp);
});

const routes = require('./routes/routes')
routes(app, io)