const io = require("socket.io")(3000, {
  cors: {
    origin: ['http://localhost:5501']
  }
});

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

