const fs = require('fs');
const https = require('https');

const apiKey = "vceurIcnyp6RJqyg0j87l8Phcya5Upzk9SswSuMy";
const host = "openapi.us-1.lytho.us";
const headers = {
    'x-api-key': apiKey
};

onmessage = (e) => {
    let rows = e.data[0];
    let logoPath = e.data[1];
    downloadLogos(rows,logoPath);
}

var failed = 0;

function download(url,dest,total,cb) {
    var file = fs.createWriteStream(dest);
    https.get(url, function(response) {
      response.pipe(file);
      file.on('finish', function() {
        file.close(cb);
        postMessage([failed, total]); //send response back to renderer
      });

      file.on('error',function() {
        console.log('file write error');
      })
    });
}

function searchAssets(query) {
    query = query.replaceAll(' ','%20'); //make path vaild without spaces
    var size = 1; //for now, keep size to 1, otherwise json parser will shit itself
    var path = '/v1/assets/search?searchQuery=' + query + '&size=' + size;
    var assets;

    let options = {
        hostname: host,
        path: path,
        headers: headers
    }

    return new Promise((resolve, reject) => {
        https.get(options, function(response) {
            response.on('data', function(data) {
                try {
                    let json = JSON.parse(data);
                    assets = json.content;
                    resolve(assets);
                }
                catch(e) {
                    reject();
                }
            });
        });
    });
}


function findMatch(brand) {
    return new Promise((resolve,reject) => {
        searchAssets(brand).then((assets) => {
            if(assets.length != 0) {
                let id = assets[0].id;
                resolve(getAssetLink(id));
            }
            else {
                ++failed;
                console.log(brand + ' was not matched');
            }
        });
    });
}

function getAssetLink(assetID) {
    var path = "/v1/assets/" + assetID + "/embeddedlink-original";

    let options = {
        method: 'POST',
        hostname: host,
        path: path,
        headers: headers
    }

    return new Promise((resolve, reject) => {
        const req = https.request(options, function(response) {
            response.on('data', function(data) {
                let json = JSON.parse(data);
                let link = json.link;
                resolve(link);
            });
        });

        req.write(''); //i dunno why but you gotta send something!
        req.end();
    });
}

function downloadLogos(rows,logoPath) {
    // searchAssets('Ty - Squish-a-Boos (use uploaded logos)').then((r)=>{console.log(r);})
    var logos = [];
    var brands = [];

    //parse excel sheet
    for(let i = 0;i<rows.length;++i) {
        var row = rows[i];
        var logo = row['Logo']
        if(logo.trim() != '' && logo.trim().toLowerCase() != 'none') {
            brands = brands.concat(logo);
        }
    }

    for(let i = 0;i<brands.length;++i) {
        let brand = brands[i];
        brand = brand.replaceAll('\',').replaceAll(/\//g, " ");

        findMatch(brand).then((match) => {
            download(match, `${logoPath}/${brand}.ai`,brands.length);
        });

    }
}