const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CaseSchema = new Schema({
    'province': String,
    'country': String,
    'lastUpdate': String,
    'confirmed': Number,
    'deaths': Number,
    'recovered': Number
}, {autoCreate: true});

module.exports = mongoose.model('Case', CaseSchema);