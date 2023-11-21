/*what needs to be figured out on per-user basis:
  where scripts are hosted
  licensing information


  create option to pin scripts to nav bar

*/

const {app, BrowserWindow, shell, nativeTheme} = require('electron');
const path = require('path');
const {dialog} = require('electron');
const { fstat } = require('fs');
const fs = require('fs');
const {ipcMain} = require('electron');
const {globalShortcut} = require('electron');
const http = require('https');
const Store = require('electron-store');
const { load } = require('@fingerprintjs/fingerprintjs');
var mainWindow;

app.commandLine.appendSwitch('ignore-certificate-errors');

var homePath = require('os').homedir();
var store = new Store();
var minimizeOnLaunch = true;

app.on('window-all-closed', function(){
  if(process.platform == 'darwin') {
    app.quit();
  }
});

function loadConfig() {
  if(!Number.isInteger(store.get('windowWidth'))) {
    mainWindow.setSize(400,800);
    saveConfig();
  }
  else {
    mainWindow.setSize(store.get('windowWidth'), store.get('windowHeight'));
  }

  if(store.get('appearance') == undefined) {store.set('appearance', 'system');}
  nativeTheme.themeSource = store.get('appearance');
  if(store.get('minimizeOnLaunch') == undefined) {store.set('minimizeOnLaunch', 'false');}
  minimizeOnLaunch = store.get('minimizeOnLaunch');
}

function saveConfig() {
  store.set('windowWidth', mainWindow.getContentSize()[0]);
  store.set('windowHeight', mainWindow.getContentSize()[1]);
}

ipcMain.handle('showAbout',(event) => {
  about();
});

ipcMain.on('showError', function(event, message) {
  let options = {
    detail: message,
    type: 'warning',
    message:'Warning',
    title:'Stellar',
    icon:'icon.png'
  };
  dialog.showMessageBox(options);
  event.returnValue = 'ok'; //always set a returnValue for ipc call, if not app may hang
});

ipcMain.on('setAppearance', function(event, appearance){
  store.set('appearance', appearance);
  nativeTheme.themeSource = appearance;
  event.returnValue = 'ok';
});

ipcMain.on('setMinimizeBehavior', function(event, behavior){
  console.log('setting min behavior')
  console.log(behavior);
  minimizeOnLaunch = behavior;
  store.set('minimizeOnLaunch',behavior);
  event.returnValue = 'ok';
});

ipcMain.handle('minimize', function(event){
  if(minimizeOnLaunch){BrowserWindow.getFocusedWindow().minimize();}
});

ipcMain.handle('focusWindow', function(event){
  mainWindow.focus();
});

ipcMain.on('getHome', function(event) {
    event.returnValue = homePath;
});

ipcMain.handle('setWindowOnTop', function(event) {
  mainWindow.setAlwaysOnTop("true"); 
});

ipcMain.handle('setWindowOnBottom', function(event) {
  mainWindow.setAlwaysOnTop("false"); 
});

ipcMain.on('resize-window', (event, width, height) => {
  let browserWindow = BrowserWindow.fromWebContents(event.sender);
  browserWindow.setSize(width,height);
});

ipcMain.on('makeDir', (event, dir) => {
  if(!fs.existsSync(dir)) {fs.mkdirSync(dir);}
});

function about() {
  const options = {
    type: 'info',
    message: 'Stellar ' + app.getVersion(),
    detail:'Developed and maintained by Jimmy Blanck www.jbx.design\n\nCopyright © 2023 Jimmy Blanck',
    title:'About',
    icon:'icon.png'
  };
  dialog.showMessageBox(options).then(box => {});
}

ipcMain.on('setProgress', (event, progress) => {
  mainWindow.setProgressBar(progress);
});

ipcMain.on('openFile', function(event){
  let types = [
    {name: 'Spreadsheets', extensions: ['xls', 'xlsx']}
  ];
  let options = {filters:types, properties:['openFile']};
  dialog.showOpenDialog(options).then(result => {
    event.returnValue = result.filePaths[0];
  });
});

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 768,
    minWidth: 400,
    minHeight: 800,
    title: 'Stellar',
    icon: path.join(__dirname, 'icon.icns'),
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true
    },
    titleBarStyle: "hiddenInset",
    transparent: true,
    vibrancy: 'dark',
    show: false,
    alwaysOnTop: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on("close", function () {
    saveConfig();
  });

  globalShortcut.register('CommandOrControl+R', function() {
		console.log('CommandOrControl+R is pressed')
		mainWindow.reload()
	})

  mainWindow.loadFile('index.html');
  loadConfig();
  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  var folders = ['Stellar','Stellar/scripts'];
  for(var f = 0;f<folders.length;++f){
    if(!fs.existsSync(homePath + '/' + folders[f])){
      fs.mkdirSync(homePath + '/' + folders[f]);
    }
  }

  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
});

