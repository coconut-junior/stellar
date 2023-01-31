// Modules to control application life and create native browser window
const {app, BrowserWindow, shell} = require('electron');
const path = require('path');
const {dialog} = require('electron');
const { fstat } = require('fs');
const fs = require('fs');
const {ipcMain} = require('electron');
const {autoUpdater} = require('electron-updater');
const {globalShortcut} = require('electron');

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

var homePath = require('os').homedir();

ipcMain.handle('showAbout',(event) => {
  about();
});

ipcMain.on('getHome', function(event) {
    event.returnValue = homePath;
});

function about() {
  const { dialog } = require('electron');
  const options = {
    type: 'info',
    message: 'Pasteboard',
    detail:'Developed and maintained by Jimmy Blanck www.jbx.design\n\nCopyright © 2023 Jimmy Blanck',
    title:'About',
    icon:'icon.png'
  };
  dialog.showMessageBox(options).then(box => {});
}

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 768,
    title: 'Layout Engine',
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
  var folders = ['Pasteboard','Pasteboard/temp','Pasteboard/scripts'];
  for(var f = 0;f<folders.length;++f){
    if(!fs.existsSync(homePath + '/' + folders[f])){
      fs.mkdirSync(homePath + '/' + folders[f]);
    }
  }

  createWindow() 

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  console.log("Checking for updates...");
  autoUpdater.checkForUpdatesAndNotify()
  //autoUpdater.checkForUpdates();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded');
});