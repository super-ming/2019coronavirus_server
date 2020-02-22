const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CaseSchema = new Schema({
    'Province/State': String,
    'Country/Region': String,
    'Last Update': Date,
    'Confirmed': Number,
    'Deaths': Number,
    'Recovered': Number
});

module.exports = mongoose.model('Case', CaseSchema);