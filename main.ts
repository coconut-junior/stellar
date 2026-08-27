const { app, BrowserWindow, nativeTheme } = require('electron');
const path = require('path');
const { dialog } = require('electron');
const fs = require('fs');
const { ipcMain } = require('electron');
const { globalShortcut } = require('electron');
const Store = require('electron-store');
const homePath = require('os').homedir();
let mainWindow;
let updateWindow;
var store = new Store();
var minimizeOnLaunch = false;

const { updateElectronApp } = require('update-electron-app');
updateElectronApp();

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

ipcMain.handle('showUpdateWindow', () => {
  updateWindow = new BrowserWindow({
    width: 400,
    height: 180,
    closable: false,
    resizable: false,
    minimizable: false,
    alwaysOnTop: true,
  });
  updateWindow.removeMenu();

  updateWindow.once('ready-to-show', () => {
    updateWindow.show();
  });

  updateWindow.loadFile(path.join(__dirname, 'update.html'));
});

ipcMain.handle('showReleaseNotes', () => {
  let releaseNotes = new BrowserWindow({
    title: 'Release Notes',
    width: 400,
    height: 800,
    closable: true,
    minimizable: false,
    alwaysOnTop: true,
  });

  releaseNotes.once('ready-to-show', () => {
    releaseNotes.show();
  });

  releaseNotes.loadFile(path.join(__dirname, 'changelog.md'));
});

ipcMain.handle('closeUpdateWindow', () => {
  if (updateWindow) updateWindow.destroy();
});

ipcMain.on('setZoom', function (event: Electron.IpcMainEvent, zoom: Number) {
  store.set('uiScale', zoom);
  event.returnValue = 'ok';
});

ipcMain.handle('showAbout', () => {
  app.showAboutPanel();
});

ipcMain.handle('quitApp', () => {
  app.quit();
});

ipcMain.on(
  'showError',
  function (event: Electron.IpcMainEvent, message: String) {
    let options = {
      detail: message,
      type: 'warning',
      message: 'Warning',
      title: 'Stellar',
      icon: 'icon.png',
    };
    dialog.showMessageBox(options);
    event.returnValue = 'ok'; //always set a returnValue for ipc call, if not app may hang
  },
);

ipcMain.on(
  'setAppearance',
  function (event: Electron.IpcMainEvent, appearance: String) {
    store.set('appearance', appearance);

    if (appearance != 'gundam') {
      nativeTheme.themeSource = appearance;
    }
    //gundam theme needs dark variant of icons & graphics
    else {
      nativeTheme.themeSource = 'dark';
    }
    event.returnValue = 'ok';
  },
);

ipcMain.on('setMinimizeBehavior', function (event, behavior) {
  console.log('setting min behavior');
  console.log(behavior);
  minimizeOnLaunch = behavior;
  store.set('minimizeOnLaunch', behavior);
  event.returnValue = 'ok';
});

ipcMain.handle('minimize', function () {
  if (minimizeOnLaunch) {
    BrowserWindow.getFocusedWindow().minimize();
  }
});

ipcMain.handle('focusWindow', function () {
  mainWindow.focus();
});

ipcMain.on('getHome', function (event: Electron.IpcMainEvent) {
  event.returnValue = homePath;
});

ipcMain.on('isPackaged', function (event: Electron.IpcMainEvent) {
  event.returnValue = app.isPackaged;
});

ipcMain.handle('setWindowOnTop', function () {
  mainWindow.setAlwaysOnTop('true');
});

ipcMain.handle('setWindowOnBottom', function () {
  mainWindow.setAlwaysOnTop('false');
});

ipcMain.on(
  'resize-window',
  (event: Electron.IpcMainEvent, width: Number, height: Number) => {
    let browserWindow = BrowserWindow.fromWebContents(event.sender);
    browserWindow.setSize(width, height);
  },
);

ipcMain.on('makeDir', (event: Electron.IpcMainEvent, dir: String) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

ipcMain.on('getVersion', (event: Electron.IpcMainEvent) => {
  event.returnValue = app.getVersion();
});

ipcMain.on('setProgress', (event: Electron.IpcMainEvent, progress: Number) => {
  mainWindow.setProgressBar(progress);
  event.returnValue = 'ok';
});

ipcMain.on('openFile', function () {
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
    minWidth: 600,
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
    app.isPackaged
      ? mainWindow.removeMenu()
      : mainWindow.setMenuBarVisibility(true);
    // Open the DevTools.
    //mainWindow.webContents.openDevTools();
  });

  mainWindow.on('close', function () {
    saveConfig();
  });

  mainWindow.webContents.on('did-fail-load', async () => {
    app.relaunch();
    app.exit();
  });

  globalShortcut.register('CommandOrControl+R', function () {
    if (mainWindow.isFocused()) {
      console.log('CommandOrControl+R is pressed');
      app.relaunch();
      app.exit();
    }
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

export {};
