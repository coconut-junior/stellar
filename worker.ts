const { resolveObjectURL } = require('buffer');
const wFs = require('fs');
const wFetch = require('node-fetch');
const { settings } = require('party-js');
const https = require('https');
const wPath = require('path');
const { hostname } = require('os');
const decompress = require('@xhmikosr/decompress');

var assetDict: Record<string, Asset> = {};

interface Asset {
  logo?: string;
  id?: string;
  fileName?: string;
}

var apiKey: string = wFs.readFileSync(
  wPath.join(__dirname, 'lytho_api.key'),
  'utf8',
);

const requestOverloadMsg =
  'Looks like Lytho is overloaded at the moment! Please try again in a few minutes.';
const lythoRequestInterval = 150;
let lastLythoRequestAt = 0;
let lythoRequestQueue = Promise.resolve();

const host = 'openapi.us-1.lytho.us';
var headers = {
  'x-api-key': apiKey,
};

function reportStatus(message: string) {
  postMessage({ type: 'status', message });
}

function waitForLythoRequest(statusMessage: string): Promise<void> {
  const wait = lythoRequestQueue.then(async () => {
    const delay = Math.max(
      0,
      lastLythoRequestAt + lythoRequestInterval - Date.now(),
    );
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    reportStatus(statusMessage);
    lastLythoRequestAt = Date.now();
  });
  lythoRequestQueue = wait;
  return wait;
}

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

function download(url, dest, total, cb?, assetLabel?) {
  let settings = { method: 'Get', cache: 'no-store', keepalive: false };

  if (!url) {
    postMessage([failed, total]);
    return;
  }

  if (assetLabel) {
    reportStatus(`Downloading ${assetLabel}...`);
  }

  wFetch(url, settings).then((res) => {
    var file = wFs.createWriteStream(dest);
    res.body.pipe(file);
    file.on('finish', function () {
      file.close(cb);
      postMessage([failed, total, res.statusText]); //send response back to renderer

      if (url.match('.zip')) {
        console.log(`downloaded zip file from ${url}`);
        let extractPath = wPath.dirname(dest).replaceAll('//', '/');
        console.log(`extract path is ${extractPath}`);
        decompress(dest, extractPath).then(() => {
          console.log('finished unzipping');
          postMessage('unzipComplete');
        });
      }
    });

    file.on('error', function () {
      console.log('file write error');
      ++failed;
      postMessage([failed, total]);
    });
  });
}

async function getTagId(tagName, assetLabel) {
  await waitForLythoRequest(`Looking up ${assetLabel} in Lytho...`);
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
    try {
      var req = https.request(options, function (response: any) {
        response.on('data', function (data: any) {
          let content = JSON.parse(data);
          if (JSON.stringify(content).match('Too Many Requests')) {
            console.log('Too many requests!');
            console.log(content);
            postMessage(['error', requestOverloadMsg]);
            reject();
          }
          resolve(content.id);
        });
      });
      req.write(postData);
      req.end();
    } catch (e) {
      console.log('FAILED TO GET TAG');
      reject();
    }
  });
}

async function getAssetsByTags(tagIds, assetLabel) {
  await waitForLythoRequest(`Looking up ${assetLabel} in Lytho...`);
  var path = `/v1/assets?size=1&tagIds=${tagIds}`;

  let options = {
    hostname: host,
    path: path,
    headers: headers,
  };

  return new Promise<any[]>((resolve, reject) => {
    try {
      https.get(options, function (response: any) {
        response.on('data', function (data: any) {
          let json = JSON.parse(data);
          if (JSON.stringify(json).match('Too Many Requests')) {
            console.log('Too many requests!');
            console.log(json);
            postMessage(['error', requestOverloadMsg]);
            reject();
          }
          let assets = json.content;
          resolve(assets);
        });
      });
    } catch (e) {
      console.log('couldnt reach server');
      reject();
    }
  });
}

async function searchAssets(query) {
  await waitForLythoRequest(`Searching Lytho for ${query}...`);
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
    https.get(options, function (response: any) {
      response.on('data', function (data: any) {
        try {
          let json = JSON.parse(data);
          assets = json.content;
          resolve(assets);
        } catch (e) {
          console.log('could not get content object');
          reject();
        }
      });
    });
  });
}

let logoTagIdPromise: Promise<any>;
const matchPromises = new Map<string, Promise<any>>();

function findMatch(brand) {
  let matchPromise = matchPromises.get(brand);
  if (matchPromise) {
    return matchPromise;
  }

  matchPromise = (async () => {
    logoTagIdPromise ??= getTagId('logo', brand);
    let logoTagId = await logoTagIdPromise;
    let brandTagId = await getTagId(brand, brand);

    let assets = await getAssetsByTags(`${logoTagId},${brandTagId}`, brand);
    if (brandTagId && assets && assets.length != 0) {
      let id = assets[0].id;
      let fileName = assets[0].fileName;
      return getAssetLink(id, fileName, brand);
    }
    return brand;
  })();
  matchPromises.set(brand, matchPromise);
  matchPromise.catch(() => matchPromises.delete(brand));
  return matchPromise;
}

async function getAssetLink(assetID, fileName, assetLabel) {
  await waitForLythoRequest(`Preparing ${assetLabel} download...`);
  var path = '/v1/assets/' + assetID + '/embeddedlink-original';

  let options = {
    method: 'POST',
    hostname: host,
    path: path,
    headers: headers,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, function (response: any) {
      response.on('data', function (data: any) {
        let json = JSON.parse(data);
        let link = json.link;
        if (link) {
          resolve({ link: link, fileName: fileName });
        } else {
          ++failed;
          reject();
        }
      });
    });

    req.write(''); //i dunno why but you gotta send something!
    req.end();
  });
}

function formatForURL(text: string) {
  return text
    .trim()
    .replaceAll(`'`, ``)
    .replaceAll(/\//g, ' ')
    .replaceAll(' ', ' ')
    .replace(/[\r\n]+/g, ' ');
}

function cleanString(str: string) {
  return str
    .split('')
    .filter((char) => char.toLowerCase() !== char.toUpperCase())
    .join('');
}

function downloadLogos(
  rows: Array<{ [key: string]: string }>,
  logoPath: string,
) {
  assetDict = {};
  var brands: string[] = []; //valid logos only

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
          //if brand is returned, that means url wasnt
          try {
            //@ts-ignore
            let link = match.link;
            //@ts-ignore
            let fileName = match.fileName;

            let logo = rows[i]['Logo'];
            let logoKeyText = logo.match(',')
              ? cleanString(logo.split(',')[0])
              : cleanString(logo);
            let asset: Asset = { logo: `${fileName}` };
            assetDict[logoKeyText] = asset; //catalog logo
            wFs.writeFileSync(
              `${logoPath}/assets.json`,
              JSON.stringify(assetDict),
            );
            download(
              link,
              `${logoPath}/${fileName}`,
              brands.length,
              undefined,
              brand,
            );
          } catch (e) {
            postMessage([failed, brands.length]);
          }
        } else {
          postMessage([failed, brands.length]);
        }
      });
    }
  }

  if (brands.length === 0) {
    reportStatus('Downloads complete.');
  }
}
