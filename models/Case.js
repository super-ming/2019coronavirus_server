const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CaseSchema = new Schema({
    'city': String,
    'province': String,
    'country': String,
    'lastUpdate': String,
    'lat': Number,
    'lng': Number,
    'confirmedCount': Number,
    'deathCount': Number,
    'recoveredCount': Number,
    'activeCount': Number,
    'key': String
}, {autoCreate: true});

module.exports = mongoose.model('Case', CaseSchema);