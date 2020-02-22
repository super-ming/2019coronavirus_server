require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session')
const MongoStore = require('connect-mongo')(session);
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');

// MongoDb database connection
const db = require('./db/config');

// Routes
//const authRoutes = require('./routes/auth');
const mainRoutes = require('./routes/main');

// passport strategies
const auth = require('./auth/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// general error handler
const errorHandler = (err, req, res, next) => {
  res.send({ error: err.message.split(',') })
}

// Setup session
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: new MongoStore({ mongooseConnection: db }),
  resave: false,   // don't save session if unmodified
  saveUninitialized: false,  // don't create session until something stored
  cookie: {
    path: '/',
    httpOnly: true,
    secure: false,
    maxAge:  1800000
  }
}));

// Configure passport middleware
app.use(passport.initialize()); 
app.use(passport.session()); 

auth(passport);

// Setup parser
app.use(express.urlencoded({extended: true}));
app.use(express.json());

// Enable cors
app.use(cors({ credentials: true, origin: true }));

// Need to read cookie
app.use(cookieParser());

app.use(errorHandler);

if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../', 'client', 'build', 'index.html'));
  });
}

// Routes will begin with `/api/auth`
//app.use('/api/auth', authRoutes);
app.use('/', mainRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
