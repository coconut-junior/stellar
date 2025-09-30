const { ipcRenderer, webFrame, clipboard } = require('electron');
const Store = require('electron-store');
const { shell } = require('electron');
const path = require('path');
const UniversalTilt = require('universal-tilt.js');
const fs = require('fs');
const Quickmarks = require(path.join(__dirname, 'quickmarks.js'));

var results: string[] = [];
var store = new Store();

webFrame.setZoomFactor(parseFloat(store.get('uiScale') ?? 0.8));
$(`#appearanceDropdown`).val(store.get('appearance'));
$(`#minimizeDropdown`).val(String(store.get('minimizeOnLaunch')));
$(`#uiScale`).val(store.get('uiScale') ?? 0.8);
let scaleFactor: number = parseFloat($(`#uiScale`).val() as unknown as string);
let scalePercentage: number = Math.floor(scaleFactor * 100);
$(`#uiScaleText`).html(scalePercentage + '%');
$(`#stellarVersion`).html(`${ipcRenderer.sendSync('getVersion')}`);

var apiKey: string = fs.readFileSync(
  path.join(__dirname, 'lytho_api.key'),
  'utf8'
);
if (isPackaged()) {
  $(`#betaIcon`).css('display', 'none');
}

updateAppearance();

function isPackaged(): boolean {
  return ipcRenderer.sendSync('isPackaged');
}

function updateAppearance() {
  let appearance: string = $(`#appearanceDropdown`).val() as unknown as string;
  if (appearance == 'gundam') {
    console.log('gundam mode!');
    $(`:root`).attr('theme', 'gundam');
  } else {
    $(`:root`).attr('theme', appearance);
  }
  setAppearance(appearance);
}

function copyLythoKey() {
  clipboard.writeText(apiKey);
  $(`#copyKeyButton`).text('Copied!');

  setTimeout(() => {
    $(`#copyKeyButton`).text('Copy');
  }, 2500);
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
  let zoom = parseFloat($(`#uiScale`).val() as unknown as string);
  $(`#uiScaleText`).html(`${Math.floor(zoom * 100)}%`);
}

function uiScaleChange() {
  let zoom = parseFloat($(`#uiScale`).val() as unknown as string);
  $(`#uiScaleText`).html(`${Math.floor(zoom * 100)}%`);
  webFrame.setZoomFactor(zoom);
  setZoom(zoom);
}

function createTitleBar() {
  var windowTopBar = document.getElementById('titlebar');
  windowTopBar.style.width = '100%';
  windowTopBar.style.height = '96px';
  windowTopBar.style.backgroundColor = 'transparent';
  windowTopBar.style.position = 'absolute';
  windowTopBar.style.top = windowTopBar.style.left = 0 as unknown as string;
  //@ts-expect-error
  windowTopBar.style.webkitAppRegion = 'drag';
  windowTopBar.style.zIndex = -1 as unknown as string;
}

function setAppearance(appearance) {
  ipcRenderer.sendSync('setAppearance', appearance);
}

function setZoom(zoom: number) {
  ipcRenderer.sendSync('setZoom', zoom);
}

function showReleaseNotes() {
  ipcRenderer.invoke('showReleaseNotes');
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
  try {
    ipcRenderer.invoke('minimize');
  } catch (e) {}
}

function quitApp() {
  ipcRenderer.invoke('quitApp');
}

function getRelativePath(path: string): string {
  if (path.match('Users')) {
    var newPath = path.split('/');
    newPath.splice(0, 3);
    return getHomePath() + '/' + newPath.join('/');
  } else {
    return path;
  }
}

$(`#automationSearch`).on('keyup', function (e: any) {
  search(e.target.value);
});

function search(query: string) {
  console.log(`searching for ${query}`);
  let resultCount = 0;
  let automationList = $(`.result`);

  automationList.each(function (i) {
    let name = this.getAttribute('name');
    if (name.toLowerCase().match(query.toLowerCase())) {
      this.style.display = 'grid';
      ++resultCount;
    } else {
      this.style.display = 'none';
    }
  });

  console.log(`${resultCount} results`);

  if (resultCount < 3) {
    $(`#automationTasks`).css('justify-content', 'left');
  } else {
    $(`#automationTasks`).css('justify-content', 'unset');
  }
}

createTitleBar();
