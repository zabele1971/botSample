let restify = require('restify');
let middleware = require('@line/bot-sdk').middleware;
let line = require('./line.js');

let server = restify.createServer();
server.use(middleware(line.LINE_CONFIG));
// server.use(restify.plugins.queryParser({ mapParams: true }));

server.post('/webhook', line.webhook);

server.listen(process.env.PORT || 3000, function() {
      console.log("Node is running...");
});

