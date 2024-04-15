const { app, BrowserWindow, shell, nativeTheme } = require('electron');
const path = require('path');
const { dialog } = require('electron');
const fs = require('fs');
const { ipcMain } = require('electron');
const { globalShortcut } = require('electron');
const Store = require('electron-store');
let mainWindow;

var homePath = require('os').homedir();
var store = new Store();
var minimizeOnLaunch = false;

app.on('window-all-closed', function () {
  if (process.platform == 'darwin') {
    app.quit();
  }
});

function loadConfig() {
  if (!Number.isInteger(store.get('windowWidth'))) {
    mainWindow.setSize(400, 800);
    saveConfig();
  } else {
    mainWindow.setSize(store.get('windowWidth'), store.get('windowHeight'));
  }

  if (store.get('appearance') == undefined) {
    store.set('appearance', 'system');
  }
  if (store.get('appearance') != 'gundam') {
    nativeTheme.themeSource = store.get('appearance');
  }

  if (store.get('minimizeOnLaunch') == undefined) {
    store.set('minimizeOnLaunch', minimizeOnLaunch);
  }
  minimizeOnLaunch = store.get('minimizeOnLaunch');
}

function saveConfig() {
  store.set('windowWidth', mainWindow.getContentSize()[0]);
  store.set('windowHeight', mainWindow.getContentSize()[1]);
}

ipcMain.on('setZoom', function (event, zoom) {
  store.set('uiScale', zoom);
  event.returnValue = 'ok';
});

ipcMain.handle('showAbout', (event) => {
  about();
});

ipcMain.on('showError', function (event, message) {
  let options = {
    detail: message,
    type: 'warning',
    message: 'Warning',
    title: 'Stellar',
    icon: 'icon.png',
  };
  dialog.showMessageBox(options);
  event.returnValue = 'ok'; //always set a returnValue for ipc call, if not app may hang
});

ipcMain.on('setAppearance', function (event, appearance) {
  store.set('appearance', appearance);

  if (appearance != 'gundam') {
    nativeTheme.themeSource = appearance;
  }
  //gundam theme needs dark variant of icons & graphics
  else {
    nativeTheme.themeSource = 'dark';
  }
  event.returnValue = 'ok';
});

ipcMain.on('setMinimizeBehavior', function (event, behavior) {
  console.log('setting min behavior');
  console.log(behavior);
  minimizeOnLaunch = behavior;
  store.set('minimizeOnLaunch', behavior);
  event.returnValue = 'ok';
});

ipcMain.handle('minimize', function (event) {
  if (minimizeOnLaunch) {
    BrowserWindow.getFocusedWindow().minimize();
  }
});

ipcMain.handle('focusWindow', function (event) {
  mainWindow.focus();
});

ipcMain.on('getHome', function (event) {
  event.returnValue = homePath;
});

ipcMain.handle('setWindowOnTop', function (event) {
  mainWindow.setAlwaysOnTop('true');
});

ipcMain.handle('setWindowOnBottom', function (event) {
  mainWindow.setAlwaysOnTop('false');
});

ipcMain.on('resize-window', (event, width, height) => {
  let browserWindow = BrowserWindow.fromWebContents(event.sender);
  browserWindow.setSize(width, height);
});

ipcMain.on('makeDir', (event, dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

function about() {
  const options = {
    type: 'info',
    message: 'Stellar ' + app.getVersion(),
    detail:
      'Developed and maintained by Jimmy Blanck www.jbx.design\n\nCopyright © ' +
      new Date().getFullYear() +
      ' Jimmy Blanck',
    title: 'About',
    icon: 'icon.png',
  };
  dialog.showMessageBox(options).then((box) => {});
}

ipcMain.on('setProgress', (event, progress) => {
  mainWindow.setProgressBar(progress);
  event.returnValue = 'ok';
});

ipcMain.on('openFile', function (event) {
  let types = [{ name: 'Spreadsheets', extensions: ['xls', 'xlsx'] }];
  let options = { filters: types, properties: ['openFile'] };
  dialog.showOpenDialog(options).then((result) => {
    event.returnValue = result.filePaths[0];
  });
});

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 768,
    minWidth: 640,
    minHeight: 600,
    title: 'Stellar',
    icon: path.join(__dirname, 'icon.icns'),
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true,
      webviewTag: true,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
    alwaysOnTop: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  });

  mainWindow.on('close', function () {
    saveConfig();
  });

  mainWindow.webContents.on('did-fail-load', async (err) => {
    app.relaunch();
    app.exit();
  });

  globalShortcut.register('CommandOrControl+R', function () {
    console.log('CommandOrControl+R is pressed');
    app.relaunch();
    app.exit();
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  return mainWindow;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  mainWindow = createWindow();
  loadConfig();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
