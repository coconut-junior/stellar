const xlsx = require('xlsx');

function openFile() {
  return ipcRenderer.sendSync('openFile');
}

export default function buildFlyer() {
  let fileName = openFile();
  let worker = new Worker('worker.js');

  if (fileName) {
    $(`*`).css('cursor', 'wait');
    $(`#buildFlyerButton`).css('background-color', 'black');
    $(`#buildFlyerButton`).html('&#9889; Downloading...');
    minimizeApp();

    let logoPath = path.dirname(fileName) + '/logos';
    if (!fs.existsSync(logoPath)) {
      fs.mkdirSync(logoPath);
    }
    let workbook = xlsx.readFile(fileName);
    let sheetNames = workbook.SheetNames;
    let rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[0]]);
    focusWindow();

    let key = store.get('apiKey');
    worker.postMessage([rows, logoPath]);
  }

  var finished = 0;
  var total = 0;

  worker.onmessage = (e) => {
    if (typeof e.data[0] === 'string' && e.data[0].match('error')) {
      showError(e.data[1]);
      worker.terminate();
    }

    ++finished;
    let failed = e.data[0];
    total = e.data[1];
    let progress = (finished + failed) / total;

    if (progress < 1) {
      $(`#buildFlyerButton`).css(
        'background-size',
        `${Math.round(progress * 190)}px 60px`
      );
      ipcRenderer.send('setProgress', progress);
    } else if (progress == 1) {
      console.log('setting progress to complete');
      ipcRenderer.send('setProgress', -1);
      $(`#buildFlyerButton`).css('background-color', 'var(--primary4)');
      $(`#buildFlyerButton`).css('background-size', `0px 60px`);
      $(`#buildFlyerButton`).html('&#9889; Launch');
      $(`*`).css('cursor', 'default');
      runJSX('build_flyer_stellar.jsx', `{"${fileName}","stellar"}`);
    }
  };
}

module.exports = { buildFlyer };
