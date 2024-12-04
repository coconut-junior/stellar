const interact = require('interactjs');
var quickmarks = [];
var colors = ['#FFB800', '#B0FF8B', '#CC8BFF', '#FFA5A5', '#EAE8E3'];

interact('.draggable')
  .draggable({
    inertia: true,
    styleCursor: false,

    modifiers: [
      interact.modifiers.restrictRect({
        restriction: 'parent',
        endOnly: true,
      }),
      interact.modifiers.snap({
        targets: [interact.snappers.grid({ x: 30, y: 30 })],
        range: Infinity,
        relativePoints: [{ x: 0, y: 0 }],
      }),
      interact.modifiers.restrict({
        restriction: document.getElementById('quickmarkList').parentNode,
        elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
        endOnly: true,
      }),
    ],

    autoScroll: false,

    listeners: {
      move: dragMoveListener,
      end: savePositions,
    },
  })
  .styleCursor(false);

function wait(ms) {
  var start = new Date().getTime();
  var end = start;
  while (end < start + ms) {
    end = new Date().getTime();
  }
}

function savePositions() {
  for (i in quickmarks) {
    let qm = quickmarks[i];
    let qmID = qm.qmID;
    qm.position = $(`#${qmID}`).css('transform');
    qm.x = $(`#${qmID}`).attr('data-x');
    qm.y = $(`#${qmID}`).attr('data-y');

    let dir = path.join(scriptPath, 'quickmarks');
    let json = JSON.stringify(qm);
    fs.writeFileSync(`${dir}/${qmID}.json`, json);
  }
}

function dragMoveListener(event) {
  var target = event.target;
  let quickmarks = document.querySelectorAll('.quickmark');
  quickmarks.forEach((qm) => {
    qm.style.zIndex = 0;
  });

  target.style.zIndex = 1;
  // keep the dragged position in the data-x/data-y attributes
  var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
  var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

  // translate the element
  target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';

  // update the posiion attributes
  target.setAttribute('data-x', x);
  target.setAttribute('data-y', y);
}

// this function is used later in the resizing and gesture demos
window.dragMoveListener = dragMoveListener;

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
        let html = `<div class = "quickmark draggable" id = "${qm.qmID}" >
                
        <div class = "quickmarkWrapper tilt" style = "background-color: ${qm.color};">
        <div style = "display:flex;flex-wrap:wrap;">
<div class = "quickmarkButton tooltip" id = "removeQuickmark" onclick = "Quickmarks.remove('${qm.qmID}')">
                  <span class = "tooltiptext">Remove</span>
                  
                </div>
                <div class = "quickmarkButton tooltip" id = "openQuickmark" onclick = "Quickmarks.open('${qm.qmID}')">
                  <span class = "tooltiptext">Go to Location</span>
                  
                </div>
        </div>
                <p class = "quickmarkNote" style = "color: var(--dark);">${qm.note}</p>
                </div>
                </div>
         `;
        $(`#quickmarkList`).append(html);
        if (qm.position != undefined) {
          $(`#${qm.qmID}`).css('transform', qm.position);
          $(`#${qm.qmID}`).attr('data-x', qm.x);
          $(`#${qm.qmID}`).attr('data-y', qm.y);
        }
      }

      $('.tilt').universalTilt({
        settings: {
          scale: 1.1,
        },
        callbacks: {
          // callbacks...
        },
      });
    });
  } catch (error) {
    console.error('Error reading files:', error);
  }
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function create() {
  let quickmark = {};
  let quickmarkID = generateRandomId();
  quickmark.qmID = quickmarkID;
  quickmark.note = $(`#quickmarkNote`).val();
  quickmark.color = colors[getRandomInt(0, colors.length - 1)];
  quickmark.path = '';
  quickmark.id = '';
  quickmark.createTime = Date.now();

  let dir = path.join(scriptPath, 'quickmarks');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  try {
    let json = JSON.stringify(quickmark);
    fs.writeFileSync(`${dir}/${quickmarkID}.json`, json);

    //run add quickmark script
    //this will modify json, adding path and id
    runJSX('add_quickmark.jsx', `{"${quickmarkID}"}`);

    $(`#quickmarkNote`).val('');
    wait(500);
    Quickmarks.load();
  } catch (e) {
    console.log(e);
  }
}

function remove(qmID) {
  let f = path.join(scriptPath, `quickmarks/${qmID}.json`);
  if (fs.existsSync(f)) {
    fs.rmSync(f);
    $(`#${qmID}`).remove();
  }
}

function open(qmID) {
  runJSX('open_quickmark.jsx', `{"${qmID}"}`);
}

const Quickmarks = {
  load: load,
  create: create,
  open: open,
  remove: remove,
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
