const express = require('express')
const server = express()

const routes = require('./routes/routes');

routes(server);

const port = process.env.PORT || 9001;
server.listen(port)
