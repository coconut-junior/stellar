const { ipcRenderer, webFrame } = require('electron');
const ViewModes = { normal: 0, compact: 1 };
const Store = require('electron-store');
const { shell } = require('electron');
let $ = (window.$ = window.jQuery = require('jquery'));
var viewMode = ViewModes.normal;
var results = [];
var store = new Store();

webFrame.setZoomFactor(parseFloat(store.get('uiScale') ?? 0.8));
$(`#appearanceDropdown`).val(store.get('appearance'));
$(`#minimizeDropdown`).val(String(store.get('minimizeOnLaunch')));
$(`#uiScale`).val(store.get('uiScale') ?? 0.8);
$(`#uiScaleText`).html(`${parseInt(parseFloat($(`#uiScale`).val()) * 100)}%`);

updateAppearance();

function updateAppearance() {
  let appearance = $(`#appearanceDropdown`).val();
  if (appearance == 'gundam') {
    console.log('gundam mode!');
    $(`:root`).attr('theme', 'gundam');
  } else {
    $(`:root`).attr('theme', appearance);
  }
  setAppearance(appearance);
}

$(`#appearanceDropdown`).on('change', function () {
  updateAppearance();
});

$(`#minimizeDropdown`).on('change', function () {
  ipcRenderer.sendSync(
    'setMinimizeBehavior',
    $(`#minimizeDropdown`).val() === 'true'
  );
});

function uiScaleUpdate() {
  let zoom = parseFloat($(`#uiScale`).val());
  $(`#uiScaleText`).html(`${parseInt(zoom * 100)}%`);
}

function uiScaleChange() {
  let zoom = parseFloat($(`#uiScale`).val());
  $(`#uiScaleText`).html(`${parseInt(zoom * 100)}%`);
  webFrame.setZoomFactor(zoom);
  setZoom(zoom);
}

function createTitleBar() {
  var windowTopBar = document.getElementById('titlebar');
  windowTopBar.style.width = '100%';
  windowTopBar.style.height = '96px';
  windowTopBar.style.backgroundColor = 'transparent';
  windowTopBar.style.position = 'absolute';
  windowTopBar.style.top = windowTopBar.style.left = 0;
  windowTopBar.style.webkitAppRegion = 'drag';
  windowTopBar.style.zIndex = -1;
}

function setAppearance(appearance) {
  ipcRenderer.sendSync('setAppearance', appearance);
}

function setZoom(zoom) {
  ipcRenderer.sendSync('setZoom', zoom);
}

function showAbout() {
  ipcRenderer.invoke('showAbout');
}
function focusWindow() {
  ipcRenderer.invoke('focusWindow');
}

function getHomePath() {
  return ipcRenderer.sendSync('getHome');
}

function showError(message) {
  ipcRenderer.sendSync('showError', message);
}

function minimizeApp() {
  ipcRenderer.invoke('minimize');
}

function getRelativePath(path) {
  if (path.match('Users')) {
    var newPath = path.split('/');
    newPath.splice(0, 3);
    return getHomePath() + '/' + newPath.join('/');
  } else {
    return path;
  }
}

$(`#automationSearch`).on('keyup', function (e) {
  try {
    search(e.target.value);
  } catch (e) {
    console.log('Could not search');
  }
});

function search(query) {
  let resultCount = 0;

  for (let i = 0; i < results.length; ++i) {
    query = query.toLowerCase();
    let element = results[i];
    let name = element.getAttribute('name').toLowerCase();

    if (name.match(query)) {
      element.style.display = 'grid';
      ++resultCount;
    } else {
      element.style.display = 'none';
    }
  }

  if (resultCount < 3) {
    $(`#automationTasks`).css(
      'grid-template-columns',
      'repeat(auto-fit, minmax(300px, 350px))'
    );
  } else {
    $(`#automationTasks`).css(
      'grid-template-columns',
      'repeat(auto-fit, minmax(300px, auto))'
    );
  }
}

createTitleBar();
