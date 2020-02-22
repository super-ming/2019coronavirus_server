const {google} = require('googleapis');
const axios = require('axios');
const fs = require('fs');
const Case = require('../models/Case');

exports.getData = (req, res, next) => {
    const TOKEN_PATH = process.env.GOOGLE_TOKEN;
    const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

    /**
     * Prints the 2019-nCoV Cases from JHU spreadsheet:
     * @see https://docs.google.com/spreadsheets/d/1wQVypefm946ch4XDp37uZ-wartW4V7ILdg-qYiDXUHM
     * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
     */
    async function listSheets(auth) {
      const sheets = google.sheets({version: 'v4', auth});
      const id = '1wQVypefm946ch4XDp37uZ-wartW4V7ILdg-qYiDXUHM';
      await sheets.spreadsheets.get({
        spreadsheetId: id
      }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rows = res.data;
        if (rows.sheets) {
          rows.sheets.map((sheet) => {
            if(sheet.properties.index === 1) listLatestSheet(auth, id, sheet.properties.title);
          });
        } else {
          console.log('No data found.');
        }
      });
    }

    async function listLatestSheet(auth, id, title){
      const sheets = google.sheets({version: 'v4', auth});
      await sheets.spreadsheets.values.get({
        spreadsheetId: id,
        range: `${title}!A2:F`,
      }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
          rows.map((row) => {
            try{
              Case.findOneAndUpdate({'Province/State': row[0]}, {
                'Last Update': row[2],
                'Confirmed': row[3],
                'Deaths': row[4],
                'Recovered': row[5]
              }, {new: true}).then(foundCase => {
                if(!foundCase){
                  Case.create({
                    'Province/State': row[0],
                    'Country/Region': row[1],
                    'Last Update': row[2],
                    'Confirmed': row[3],
                    'Deaths': row[4],
                    'Recovered': row[5]
                  });
                  console.log(foundCase);
                  res.json(foundCase);
                }
              }).catch(err =>{
                console.log(err);
                res.status(500).json({message: err})
              })
            } catch(err){
              console.log(err);
              res.status(500).json({message: err})
            }
          });
        } else {
          console.log('Sheet is empty.');
          res.status(500).json({message: 'Sheet is empty.'})
        }
      });
    }

    /**
     * Get and store new token after prompting for user authorization, and then
     * execute the given callback with the authorized OAuth2 client.
     * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
     * @param {getEventsCallback} callback The callback for the authorized client.
     */
    const getNewToken = (oAuth2Client, callback) => {
        oAuth2Client.getToken(req.body.data, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            req.session.token = token;
            console.log("token",token)
            callback(oAuth2Client);
        });
    }

    /**
     * Create an OAuth2 client with the given credentials, and then execute the
     * given callback function.
     * @param {Object} credentials The authorization client credentials.
     * @param {function} callback The callback to call with the authorized client.
     */
    const authorize = (credentials, callback) => {
        const {client_secret, client_id, redirect_uris} = credentials;
        const oAuth2Client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);
    
        // Check if we have previously stored a token.
        //read cookies[connect.sid]
        //req.session.token = null;
        //token.refresh_token
        if (!req.session.token) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(req.session.token));
        callback(oAuth2Client);
    }

  
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(process.env.GOOGLE_CREDENTIALS), listSheets);
    
};

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
    const arr = res.data.split('\n').map(e => e.trim()).map(e => e.split(',').map(e => { e.trim()}))
    console.log(arr[0])
    return arr;
  })
  .catch(err => console.log(err));
  console.log(data)
};