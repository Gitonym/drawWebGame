const express  = require('express');
const app = express();
const server = require('http').createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: ['http://localhost:5501']
  }
});

//config
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static('public'));

app.get('/', (req, res) => {
  //on connection
  io.on('connection', socket => {
    console.log(socket.id);
    socket.on('newStroke', newStroke => {
      socket.broadcast.emit('newStroke', newStroke);
    });
  
    socket.on('playerState', player => {
      socket.broadcast.emit('playerState', player);
    });
  
    socket.on('cameraPos', camera => {
      socket.broadcast.emit('cameraPos', camera);
    });
  
    socket.on('undo', () => {
      socket.broadcast.emit('undo');
    });
  
    socket.on('currentStroke', currentStroke => {
      socket.broadcast.emit('currentStroke', currentStroke);
    });
  });
  res.render('index');
});

server.listen(3000, () => {
  console.log('Server running');
})