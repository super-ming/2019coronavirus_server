const axios = require('axios');
const Case = require('../models/Case');

exports.getDataTimeSeries = async (req, res, next) => {
  const dataTypes = ['Confirmed', 'Deaths', 'Recovered'];
  const getData = async (type) => {
    try {
      const result = await axios.get(`https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-${type}.csv`);
      const arr = result.data.split('\n').map(e => e.trim()).map(e => e.split(',').map(e => e.trim()))
      return arr
    } catch(err){
      return res.status(500).json({err: err})
    }
  }

  const getConfirmedCases = getData(dataTypes[0]);
  const getDeathCases = getData(dataTypes[1]);
  const getRecoveredCases = getData(dataTypes[2]);

  const confirmedCases = await getConfirmedCases;
  const deathCases = await getDeathCases;
  const recoveredCases = await getRecoveredCases;

};

exports.getDataReport = async (req, res, next) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  let todayMonth = today.getMonth()+1 < 10 ? `0${today.getMonth()+1}` : today.getMonth()+1, todayDay = today.getDate(), todayYear = today.getFullYear();
  let yesterdayMonth = yesterday.getMonth()+1 < 10 ? `0${yesterday.getMonth()+1}` : yesterday.getMonth()+1, yesterdayDay = yesterday.getDate(), yesterdayYear = yesterday.getFullYear();
  
  const updateCases = async (data) => {
    const promises = data.map(async e => {
      const query = {'province': e[0], 'country': e[1]};
      const newData = {'lastUpdate': e[2], 'confirmedCount': e[3], 'deathCount': e[4], 'recoveredCount': e[5], 'lat': e[6], 'lng': e[7]};
      const options = {new:true, upsert: true};
      try {
        let updated = await Case.findOneAndUpdate(query, newData, options).exec();
        if(!updated.lat || !updated.lng){
          const location = await this.getGeoLocation(e);
          updated = await Case.findOneAndUpdate(query, location, options).exec();
        }
        return updated;
      } catch(err){
        return err;
      }
    });
    return await Promise.all(promises).then(res => res).catch(err => res.send(500, {error: err}));
  }
  
  try {
    const result = await axios.get(`https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/03-06-${todayYear}.csv`);
    //split string to lines, then split each line into array
    let updatedData, casesByCountry, minMaxLatLng;
    const arr = result.data.split('\n').map(e => e.trim()).map(e => e.split(',').map(e => e.trim()))
    if(arr[0][0] === 'Province/State') arr.splice(0,1);
    //remove any extra columns
    arr.forEach(e => {
      if(e.length > 8){
        e[0] = e.slice(0,2).join();
        e.splice(1, 1);
      }
      e[0] ? e[0] = e[0].replace(/"/g, "") : e[0];
    });
    //remove empty rows
    let data = arr.filter(e => e[1]);
    
    updatedData = await updateCases(data);
    casesByCountry = await this.getDataReportByCountry();
    minMaxLatLng = await this.getMinMaxLatLng(casesByCountry);
    return res.status(200).json({cases: updatedData, casesByCountry, minMaxLatLng});
  } catch(err){
    if(err.response.status === 404){
      const cache = await this.getCachedData();
      if(!cache.err){
        return res.status(200).json(cache);
      }
    } else {
      return res.status(500).json({err: err.response})
    }
  }
};

exports.getDataReportByCountry = async () => {
  const aggregatorOpts = [{
    $group: {
      _id: "$country",
      confirmedCount: { $sum: "$confirmedCount" },
      deathCount: { $sum: "$deathCount" },
      recoveredCount: { $sum: "$recoveredCount" },
      lat: { $first: "$lat"},
      lng: { $first: "$lng"}
    }},
    {
      $sort: {"confirmedCount": -1}
    }
  ]
  
  const groupedByCountry = Case.aggregate(aggregatorOpts).exec();
  return groupedByCountry
};

exports.getGeoLocation = async (loc) => {
  try {
    let location;
    if(!loc[0]){
      location = loc[1];
    } else if(loc[1] === 'Mainland China'){
      location = loc[0].concat(",", 'China');
    } else if(loc[0] === 'From Diamond Princess' || loc[0] === "Unassigned Location (From Diamond Princess)" || loc[1] === 'Others'){
      location = 'Yokohama International Passenger Terminal';
    } else if(loc[0].search("(From Diamond Princess)")){
      location = loc[0].replace(/\(From Diamond Princess\)/i,"")
    } else if(loc[1] === 'US') {
      location = loc[0];
    } else {
      location = loc[0].concat(",", loc[1]);
    }
    let geoData = await axios.get(`http://open.mapquestapi.com/geocoding/v1/address?key=${process.env.MAPQUEST_APIKEY}&location=${location}`);
    if(geoData.data.results[0].locations[0].latLng.lat !== 39.78373 && geoData.data.results[0].locations[0].latLng.lat !== -100.445882){
      return geoData.data.results[0].locations[0].latLng;
    } else {
      geoData = await axios.get(`http://open.mapquestapi.com/nominatim/v1/search.php?key=${process.env.MAPQUEST_APIKEY}&q=${location}&format=json&addressdetails=1&limit=3`);
      const latLng = {lat: geoData.data[0].lat, lng: geoData.data[0].lon};
      return latLng
    }
  } catch(err){
    return err;
  }
};

exports.getMinMaxLatLng = async (data) => {
  try {
    let minLat = 34.554091, minLng = 103.502982, maxLat = 34.554091, maxLng = 103.502982;
    for(let i = 1; i < data.length; i++){
      if(data[i].lat || data[i].lng){
        minLat = (data[i].lat < minLat) ? data[i].lat : minLat;
        minLng = (data[i].lng < minLng) ? data[i].lng : minLng;
        maxLat = (data[i].lat > maxLat) ? data[i].lat : maxLat;
        maxLng = (data[i].lng > maxLng) ? data[i].lng : maxLng;
      }
    }
    return {minLat, minLng, maxLat, maxLng}
  } catch(err){
    return err;
  };
}

exports.getCachedData = async () => {
  try {
    const data = await Case.find({});
    if(data.length){
      const casesByCountry = await this.getDataReportByCountry();
      const minMaxLatLng = await this.getMinMaxLatLng(casesByCountry);
      return {cases: data, casesByCountry, minMaxLatLng};
    } else {
      return {err: "No data found!"};
    }
  } catch(err){
    return {err: err};
  }
};