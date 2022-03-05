const express = require('express');
const app = express();

//config
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static('public'));

//routes
const indexRouter = require('./routes/index');

//use routes
app.use('/', indexRouter);

app.listen(3000);