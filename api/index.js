// api/index.js
import serverless from 'serverless-http';

import app from '../src/app.js'; // reaproveita a configuração do Express

//export const handler = serverless(app);
export default serverless(app); // ✅ obrigatório para Vercel