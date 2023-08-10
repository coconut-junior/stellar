const http = require('https');
const { url } = require('inspector');
const { finished } = require('stream');
const xlsx = require('xlsx');


function openFile() {
    return ipcRenderer.sendSync('openFile');
}

function buildFlyer() {
    minimizeApp();
    
    let fileName = openFile();
    let logoPath = path.dirname(fileName) + '/logos';
    if(!fs.existsSync(logoPath)) {fs.mkdirSync(logoPath);}

    let workbook = xlsx.readFile(fileName);
    let sheetNames = workbook.SheetNames;
    let rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[0]]);

    //alert('Logos will begin downloading now. Please wait...');

    let logos = [];

    //brands on col 4
    $.each(rows, (i, row) => {
        let logo = row['Logo']
        if(logo.trim() != '') {
            logos = logos.concat(logo);
        }
    });

    console.log(logos);

    let worker = new Worker('worker.js');
    worker.postMessage([logos,logoPath]);

    var finished = 0;
    var total = logos.length;

    worker.onmessage = (e) => {
        ++finished;
        let failed = e.data;
        let progress = (finished + failed)/total;
        ipcRenderer.send('setProgress', progress);
        if(progress == 1) {
            ipcRenderer.send('setProgress', -1);
            runJSX('build_flyer_stellar.jsx',`{"${fileName}","stellar"}`);
        }
    }

}