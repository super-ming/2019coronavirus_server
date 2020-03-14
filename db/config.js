const mongoose = require('mongoose');

// Set up MongoDb connection
const mongoURI = process.env.NODE_ENV === 'production' ? `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PW}@ds061711.mlab.com:61711/heroku_gbg72cmc` : 'mongodb://localhost:27017/2019coronavirus';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

const db = mongoose.connection;

db.on('connected', () => { console.log('Connected to Mongoose!')});
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

module.exports = db;