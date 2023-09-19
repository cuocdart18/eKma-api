const express = require('express')
const server = express()

var bodyParser = require('body-parser');
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());

const routes = require('./routes/routes')

routes(server)

const port = process.env.PORT || 9001
server.listen(port)