const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CaseSchema = new Schema({
    'province': String,
    'country': String,
    'lastUpdate': String,
    'confirmedCount': Number,
    'deathCount': Number,
    'recoveredCount': Number,
    'lat': Number,
    'lng': Number
}, {autoCreate: true});

module.exports = mongoose.model('Case', CaseSchema);