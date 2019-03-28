const express = require('express');
require('dotenv').config();


// Initializations
const app = express();


// Middlewares
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));


// Settings
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

let port = process.env.PORT || 3000;


// Server
app.listen(port, () => {
    console.log('webhook is listening on port', port);
});


// Routes
// app.use(require('./routes/index.routes.js'));
app.use(require('./routes/webhook.routes.js'));
