const {google} = require('googleapis');
const axios = require('axios');
const Case = require('../models/Case');

exports.getDataTimeSeries = (req, res, next) => {
  const dataTypes = ['Confirmed', 'Deaths', 'Recovered'];
  const getData = (type) => {
    axios.get(`https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-${type}.csv`)
    .then(res => {
      const arr = res.data.split('\n').map(e => e.trim()).map(e => e.split(',').map(e => e.trim()))
      return arr;
    })
    .catch(err => console.log(err));
  }

  const confirmedCases = getData(dataTypes[0]);
  const deathCases = getData(dataTypes[1]);
  const recoveredCases = getData(dataTypes[2]);

};

exports.getDataReport = async (req, res, next) => {
  const today = new Date();
  let month = today.getMonth()+1 < 10 ? `0${today.getMonth()+1}` : today.getMonth()+1, day = today.getDate(), year = today.getFullYear();
  const data = await axios.get(`https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/${month}-21-${year}.csv`)
  .then(res => {
    //split string to lines, then split each line into array
    const arr = res.data.split('\n').map(e => e.trim()).map(e => e.split(',').map(e => e.trim()))

    if(arr[0][0] === 'Province/State') arr.splice(0,1);
    arr.forEach(e => {
      if(e.length > 6){
        e[0] = e.slice(0,2).join();
        e.splice(1, 1);
      }
      e[0] ? e[0] = e[0].replace(/"/g, "") : e[0];
    });
    //remove empty rows
    let newArr = arr.filter(e => e[1]);
    return newArr
  })
  .catch(err => console.log(err));

  const updateCases = async (data) => {
    const promises = data.map(async e => {
      const query = {'Province/State': e[0], 'Country/Region': e[1]};
      const newData = {'Last Update': e[2], 'Confirmed': e[3], 'Deaths': e[4], 'Recovered': e[5]};
      const options = {new:true, upsert: true};
      try {
        let updated = await Case.findOneAndUpdate(query, newData, options).exec();
        return updated;
      } catch(err){
        res.send(500, {error: err});
      }
    });
    await Promise.all(promises).then(res => console.log(res)).catch(err => res.send(500, {error: err}));
  }

  updateCases(data);
  return res.json(data);
};