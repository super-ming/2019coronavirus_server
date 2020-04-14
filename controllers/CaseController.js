const axios = require('axios');
const Case = require('../models/Case');

const baseURL = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data'

exports.getDataTimeSeries = async (req, res, next) => {
  const dataTypes = ['Confirmed', 'Deaths', 'Recovered'];
  const getData = async (type) => {
    try {
      const result = await axios.get(`${baseURL}/csse_covid_19_time_series/time_series_19-covid-${type}.csv`);
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
  const updateCases = async (data) => {
    const promises = data.map(async e => {
      const query = {'city': e[1], 'province': e[2], 'country': e[3]};
      const newData = {'lastUpdate': e[4], 'lat': e[5], 'lng': e[6], 'confirmedCount': e[7], 'deathCount': e[8], 'recoveredCount': e[9], 'activeCount': e[10], 'key': e[11] };
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
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const mm = date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1;
    const dd = date.getDate(); 
    const yyyy = date.getFullYear();
    const dateString = `${mm}-${dd}-${yyyy}`;
    const result = await axios.get(`${baseURL}/csse_covid_19_daily_reports/${dateString}.csv`);
    //split string to lines, then split each line into array
    let updatedData, casesByCountry, minMaxLatLng;
    const arr = result.data.split('\n').map(e => e.trim()).map(e => e.split(',').map(e => e.trim()))
    if(arr[0][0] === 'FIPS') arr.splice(0,1);

    arr.forEach(e => {
      if(e.length > 14){
        e[2] = e.slice(2,4).join();
        e.splice(3,1);
      }
     
      e[1] ? e[1] = e[1].replace(/"/g, "") : e[1];
      e[2] ? e[2] = e[2].replace(/"/g, "") : e[2];
      e[3] ? e[3] = e[3].replace(/"/g, "") : e[3];
      e[4] ? e[4] = e[4].replace(/"/g, "") : e[4];
      e[9] ? e[9] = e[9].replace(/"/g, "") : e[9];
    
      if(e[3] === 'Korea') {
        e[3] = e.slice(3,5).join();
        e.splice(4,1);
      }

      e[11] = e.slice(11,13).join();
      e.splice(12,2);
      e[11] ? e[11] = e[11].replace(/"/g, "") : e[11];

    });
    //remove empty rows
    let data = arr.filter(e => e[3] && e[1] !== 'unassigned');
    updatedData = await updateCases(data);
    casesByCountry = await this.getDataReportByCountry();
    minMaxLatLng = await this.getMinMaxLatLng(casesByCountry);
    return res.status(200).json({cases: updatedData, casesByCountry, minMaxLatLng});
  } catch(err){
    console.log(err)
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
      activeCount: { $sum: "$activeCount" },
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

    minLat = data.reduce((min, c) => {
      c.lat < min ? minLat = c.lat : minLat;
    });

    minLng = data.reduce((min, c) => c.lng < min ? minLng = c.lng : minLng);
    maxLat = data.reduce((max, c) => c.lat < max ? maxLat = c.lat : maxLat);
    maxLng = data.reduce((max, c) => c.lng < max ? maxLng = c.lng : maxLng);
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