// api/index.js
const serverless = require('serverless-http');

const app = require('../src/app'); // reaproveita a configuração do Express

module.exports.handler = serverless(app);