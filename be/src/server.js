const http = require('http');
const app = require('./app');
const env = require('./config/env');

const port = parseInt(env.PORT, 10) || 3000;
app.set('port', port);
const server = http.createServer(app);
server.listen(port);
server.on('error', (error) => {
  if (error.syscall !== 'listen') throw error;
  const bind = `Port ${port}`;
  if (error.code === 'EACCES') { console.error(`${bind} requires elevated privileges`); process.exit(1); }
  if (error.code === 'EADDRINUSE') { console.error(`${bind} is already in use`); process.exit(1); }
  throw error;
});
server.on('listening', () => console.log(`Listening on port ${port}`));

function shutdown(signal) {
  console.log(`${signal} received, closing...`);
  server.close(() => process.exit(0));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
