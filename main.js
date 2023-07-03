/*what needs to be figured out on per-user basis:
  where scripts are hosted
  licensing information


  create option to pin scripts to nav bar

*/

const {app, BrowserWindow, shell} = require('electron');
const path = require('path');
const {dialog} = require('electron');
const { fstat } = require('fs');
const fs = require('fs');
const {ipcMain} = require('electron');
const {globalShortcut} = require('electron');
const http = require('https');
var mainWindow;

app.commandLine.appendSwitch('ignore-certificate-errors');

var homePath = require('os').homedir();

app.on('window-all-closed', function(){
  if(process.platform == 'darwin')
      app.quit();
});

ipcMain.handle('showAbout',(event) => {
  about();
});

ipcMain.handle('minimize', function(event){
  BrowserWindow.getFocusedWindow().minimize();
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
  let browserWindow = BrowserWindow.fromWebContents(event.sender)
  browserWindow.setSize(width,height)
})

function about() {
  const { dialog } = require('electron');
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
      contextIsolation: false
    },
    titleBarStyle: "hiddenInset"
  });

  globalShortcut.register('CommandOrControl+R', function() {
		console.log('CommandOrControl+R is pressed')
		mainWindow.reload()
	})

  mainWindow.loadFile('index.html');
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

