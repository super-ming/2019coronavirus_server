const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TimeSeriesSchema = new Schema({
    'Province/State': String,
    'Country/Region': String,
    'Lat': String,
    'Long': String,
    'Dates': Object
});

module.exports = mongoose.model('TimeSerie', TimeSeriesSchema);