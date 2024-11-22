const { resolveObjectURL } = require('buffer');
const fs = require('fs');
const fetch = require('node-fetch');
const { settings } = require('party-js');
const https = require('https');
const path = require('path');
const { hostname } = require('os');
const DecompressZip = require('decompress-zip');

var apiKey = fs.readFileSync(path.join(__dirname, 'lytho_api.key'), 'utf8');

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

  if (!url) {
    postMessage([failed, total]);
    return;
  }

  fetch(url, settings).then((res) => {
    var file = fs.createWriteStream(dest);
    res.body.pipe(file);
    file.on('finish', function () {
      file.close(cb);
      postMessage([failed, total, res.statusText]); //send response back to renderer
      if (url.match('.zip')) {
        let extractPath = path.dirname(dest).replaceAll('//', '/');
        console.log(extractPath);
        let unzipper = new DecompressZip(dest);

        unzipper.on('error', function (err) {
          console.log('Caught an error', err);
        });
        unzipper.on('extract', () => {
          console.log('finished unzipping');
          postMessage('unzipComplete');
        });
        unzipper.extract({
          path: extractPath,
        });
      }
    });

    file.on('error', function () {
      console.log('file write error');
    });
    postMessage([failed, total]);
  });
}

function getTagId(tagName) {
  var size = 1; //for now, keep size to 1, otherwise json parser will shit itself
  var path = `/v1/tags/by-name`;

  let options = {
    hostname: host,
    path: path,
    method: 'POST',
    headers: headers,
  };

  return new Promise((resolve, reject) => {
    var postData = JSON.stringify({ name: tagName });
    var req = https.request(options, function (response) {
      response.on('data', function (data) {
        try {
          let content = JSON.parse(data);
          resolve(content.id);
        } catch (e) {
          reject();
        }
      });
    });
    req.write(postData);
    req.end();
  });
}

function getAssetsByTags(tagIds) {
  var path = `/v1/assets?size=1&tagIds=${tagIds}`;
  console.log(path);
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
          let assets = json.content;
          resolve(assets);
        } catch (e) {
          reject();
        }
      });
    });
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
  return new Promise(async (resolve, reject) => {
    //replace with new function to get assets by tags
    let logoTagId = await getTagId('logo');
    let brandTagId = await getTagId(brand);

    getAssetsByTags(`${logoTagId},${brandTagId}`).then((assets) => {
      if (brandTagId && assets && assets.length != 0) {
        let id = assets[0].id;
        resolve(getAssetLink(id));
      } else {
        ++failed;
        console.log(
          brand + ` was not matched, tagIds: ${logoTagId},${brandTagId}`
        );
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

function formatForURL(text) {
  return text
    .trim()
    .replaceAll("',")
    .replaceAll(/\//g, ' ')
    .replaceAll(' ', ' ')
    .replace(/[\r\n]+/g, ' ');
}

function downloadLogos(rows, logoPath) {
  var brands = []; //valid logos only
  var assetDict = new Object();

  //parse excel sheet
  for (let i = 0; i < rows.length; ++i) {
    var row = rows[i];
    var logo = row['Logo'];
    if (logo.trim() != '' && logo.trim().toLowerCase() != 'none') {
      brands = brands.concat(logo);
      let brand = logo;
      brand = formatForURL(brand);

      if (brand.match(',')) {
        brand = brand.split(',')[0]; //only grab first logo in list
      }

      console.log(`formatted brand is ${brand}`);

      findMatch(brand).then((match) => {
        if (brand != match) {
          let asset = new Object();
          asset.logo = brand + '.ai';
          assetDict[`${i}`] = asset; //catalog logo
          fs.writeFileSync(
            `${logoPath}/assets.json`,
            JSON.stringify(assetDict)
          );

          //if brand is returned, that means url wasnt
          try {
            download(match, `${logoPath}/${brand}.ai`, brands.length);
          } catch (e) {
            postMessage([failed, brands.length]);
          }
        } else {
          postMessage([failed, brands.length]);
        }
      });
    }
  }
}
