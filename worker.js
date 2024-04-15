const { resolveObjectURL } = require('buffer');
const fs = require('fs');
const fetch = require('node-fetch');
const { settings } = require('party-js');
const https = require('https');
const path = require('path');
const { hostname } = require('os');

var apiKey = 'vceurIcnyp6RJqyg0j87l8Phcya5Upzk9SswSuMy';
const host = 'openapi.us-1.lytho.us';
var headers = {
  'x-api-key': apiKey,
};

onmessage = (e) => {
  if (e.data[0] == 'downloadFile') {
    let url = e.data[1];
    let dest = e.data[2];
    let total = e.data[3];
    download(url, dest, total);
  } else {
    let rows = e.data[0];
    let logoPath = e.data[1];
    downloadLogos(rows, logoPath);
  }
};

var failed = 0;

function download(url, dest, total, cb) {
  let settings = { method: 'Get', cache: 'no-store', keepalive: false };

  fetch(url, settings).then((res) => {
    var file = fs.createWriteStream(dest);
    res.body.pipe(file);
    file.on('finish', function () {
      file.close(cb);
      postMessage([failed, total, res.statusText]); //send response back to renderer
    });

    file.on('error', function () {
      console.log('file write error');
    });
    postMessage([failed, total]);
  });
}

function searchAssets(query) {
  query = query.replaceAll(' ', '%20').replaceAll('&', '').replaceAll('#', '');

  var size = 1; //for now, keep size to 1, otherwise json parser will shit itself
  var path = '/v1/assets/search?searchQuery=' + query + '&size=' + size;
  var assets;

  let options = {
    hostname: host,
    path: path,
    headers: headers,
  };

  return new Promise((resolve, reject) => {
    https.get(options, function (response) {
      response.on('data', function (data) {
        try {
          let json = JSON.parse(data);
          assets = json.content;
          resolve(assets);
        } catch (e) {
          reject();
        }
      });
    });
  });
}

function findMatch(brand) {
  return new Promise((resolve, reject) => {
    searchAssets(brand).then((assets) => {
      if (assets.length != 0) {
        let id = assets[0].id;
        resolve(getAssetLink(id));
      } else {
        ++failed;
        console.log(brand + ' was not matched');
        resolve(brand);
      }
    });
  });
}

function getAssetLink(assetID) {
  var path = '/v1/assets/' + assetID + '/embeddedlink-original';

  let options = {
    method: 'POST',
    hostname: host,
    path: path,
    headers: headers,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, function (response) {
      response.on('data', function (data) {
        let json = JSON.parse(data);
        let link = json.link;
        resolve(link);
      });
    });

    req.write(''); //i dunno why but you gotta send something!
    req.end();
  });
}

function downloadLogos(rows, logoPath) {
  // searchAssets('Ty - Squish-a-Boos (use uploaded logos)').then((r)=>{console.log(r);})
  var logos = [];
  var brands = [];

  //parse excel sheet
  for (let i = 0; i < rows.length; ++i) {
    var row = rows[i];
    var logo = row['Logo'];
    if (logo.trim() != '' && logo.trim().toLowerCase() != 'none') {
      brands = brands.concat(logo);
    }
  }

  for (let i = 0; i < brands.length; ++i) {
    let brand = brands[i];
    brand = brand.replaceAll("',").replaceAll(/\//g, ' ');

    findMatch(brand).then((match) => {
      try {
        download(match, `${logoPath}/${brand}.ai`, brands.length);
      } catch (e) {
        console.log(`failed to download ${brand}`);
        postMessage([failed, brands.length]);
      }
    });
  }
}
