// api/index.js
import serverless from 'serverless-http';

import app from '../src/app.js'; // reaproveita a configuração do Express

module.exports.handler = serverless(app);