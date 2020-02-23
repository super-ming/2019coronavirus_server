const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CaseSchema = new Schema({
    'Province/State': String,
    'Country/Region': String,
    'Last Update': String,
    'Confirmed': Number,
    'Deaths': Number,
    'Recovered': Number
}, {autoCreate: true});

module.exports = mongoose.model('Case', CaseSchema);