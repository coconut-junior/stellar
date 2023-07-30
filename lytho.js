const http = require('https');
const { url } = require('inspector');
const xlsx = require('xlsx');

const apiKey = "vceurIcnyp6RJqyg0j87l8Phcya5Upzk9SswSuMy";
const host = "https://openapi.us-1.lytho.us";
const headers = {
    'x-api-key': apiKey
};

$(`#apiKey`).html(apiKey);

function openFile() {
    return ipcRenderer.sendSync('openFile');
}

function getAssetLink(assetID) {
    var url = host + "/v1/assets/" + assetID + "/embeddedlink-original";
    var link;
    $.ajax({
        async: false,
        url: url,
        type: 'post',
        headers: headers,
        success: function(data) {
            link =  data.link;
        }
    });

    return link;
}

function searchAssets(query) {
    var url = host + `/v1/assets/search?searchQuery=${query}`;
    var assets;
    
    $.ajax({
        async: false,
        url: url,
        type: 'get',
        headers: headers,
        success: function(data) {
            assets = data.content;
            if(assets.length == 0) {console.log(`Could not find ${query}`)}
        },
        error: function(err) {
            //assets = err.content;
            console.log(err.status);
            console.log(err.message);
            console.log(err.traceId);
        }
    });

    return assets;
}

function findMatch(brand) {
    let assets = searchAssets(brand);

    if(assets.length > 0) {
        let match = assets[0].id;
        let link = getAssetLink(match);
        return link;
    }
}

function download (url, dest, cb) {
    var file = fs.createWriteStream(dest);
    http.get(url, function(response) {
      response.pipe(file);
      file.on('finish', function() {
        file.close(cb);
      });
    });
}

function downloadLogos(brands,logoPath) {
    $.each(brands, function(i, brand) {
        let match = findMatch(brand);
        brand = brand.replaceAll('\',').replaceAll(/\//g, " ");
        download(match, `${logoPath}/${brand}.ai`);
    });
}

function buildFlyer() {
    minimizeApp();
    
    let fileName = openFile();
    let logoPath = path.dirname(fileName) + '/logos';
    if(!fs.existsSync(logoPath)) {fs.mkdirSync(logoPath);}

    let workbook = xlsx.readFile(fileName);
    let sheetNames = workbook.SheetNames;
    let rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[0]]);

    alert('Logos will begin downloading now. Please wait...');

    //brands on col 4
    $.each(rows, (i, row) => {
        let progress = i/rows.length;
        ipcRenderer.send('setProgress', progress);
        let logos = row['Logo'];
        downloadLogos([logos],logoPath);
    });

    ipcRenderer.send('setProgress', -1);

    //launch script
    runJSX('build_flyer_stellar.jsx',`{"${fileName}","stellar"}`);
}