var quickmarks = [];

function load() {
  quickmarks = [];
  $(`#quickmarkList`).html('');
  let dir = path.join(scriptPath, 'quickmarks');

  try {
    fs.readdir(dir, (err, files) => {
      files.forEach((file) => {
        if (file.endsWith('.json')) {
          let text = fs.readFileSync(path.join(dir, file));
          let qm = JSON.parse(text);
          quickmarks.push(qm);
        }
      });

      for (i in quickmarks) {
        let qm = quickmarks[i];
        let html = `<div class = "quickmark" id = "${qm.qmID}" style = "background-color: ${qm.color};" onclick = "Quickmarks.open('${qm.qmID}')"><p class = "quickmarkNote" style = "color: var(--dark);">${qm.note}</p></div>`;
        $(`#quickmarkList`).append(html);
      }
    });
  } catch (error) {
    console.error('Error reading files:', error);
  }
}

function create() {
  let quickmark = {};
  let quickmarkID = generateRandomId();
  quickmark.qmID = quickmarkID;
  quickmark.note = $(`#quickmarkNote`).val();
  quickmark.color = '#FFB800';
  quickmark.path = '';
  quickmark.id = '';

  let dir = path.join(scriptPath, 'quickmarks');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  try {
    let json = JSON.stringify(quickmark);
    fs.writeFileSync(`${dir}/${quickmarkID}.json`, json);

    //run add quickmark script
    //this will modify json, adding path and id
    runJSX('add_quickmark.jsx', `{"${quickmarkID}"}`);

    $(`#quickmarkNote`).val('');
    Quickmarks.load();
  } catch (e) {
    console.log(e);
  }
}

function open(qmID) {
  runJSX('open_quickmark.jsx', `{"${qmID}"}`);
}

const Quickmarks = {
  load: load,
  create: create,
  open: open,
  get: function () {
    return quickmarks;
  },
};

function generateRandomId() {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

module.exports = { Quickmarks };
