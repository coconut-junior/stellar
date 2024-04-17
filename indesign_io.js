const { exec } = require('child_process');
const { gsap } = require('gsap/dist/gsap');
const dependencyURL = 'https://jbx.design/stellar/dependencies.json';
const party = require('party-js');
const fs = require('fs');
const { buildFlyer } = require(path.join(__dirname, 'lytho.js'));
const fetch = require('node-fetch');

dependencies = [];
var scriptPath = undefined;

getScriptPath();

function makeDir(dir) {
  ipcRenderer.sendSync('makeDir', dir);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function enableFlyerScript() {
  console.log('enabling flyer script');
  $(`#idScript999`).css('content-visibility', 'visible');
  $(`#idScript999`).css('background-image', 'none');
  closeUpdateWindow();
}

function showUpdateWindow() {
  ipcRenderer.invoke('showUpdateWindow');
}

function closeUpdateWindow() {
  ipcRenderer.invoke('closeUpdateWindow');
}

let newAsset;
let newVersion;

async function downloadDependencies() {
  let scripts = dependencies['scripts'];

  console.log('starting to download dependencies');
  let worker = new Worker('worker.js');
  worker.onmessage = (e) => {
    if (e.data == 'unzipComplete') {
      //unzipping finished, update version & enable script
      store.set(newAsset, newVersion);
      enableFlyerScript();
    } else if (e.data && e.data.length > 2) {
      console.log(e.data);
    }
  };

  for (i in scripts) {
    let dependency = scripts[i];
    let fileName = dependency['filename'];
    let scriptName = dependency['name'];
    let fullScriptName = scriptName;
    let version = dependency['version'];
    let hidden = dependency['hidden'];
    let url = dependency['url'];
    let filePath = `${scriptPath}/${fileName}`;
    let description = dependency['description'];

    $(`.statusBar`).html(`Downloading ${fileName}...`);

    //compare versions, skip if zip is current
    let currentVersion = store.get(fileName);
    if (fileName.match('.zip')) {
      if (currentVersion == version) {
        console.log('zip version is current, skipping!');
        enableFlyerScript();
        continue;
      } else {
        //update that mf
        newAsset = fileName;
        newVersion = currentVersion;
        showUpdateWindow();
      }
    }

    if (scriptName.length > 24) {
      scriptName = scriptName.slice(0, 20) + '...';
    }

    if (fileName.match('.zip')) {
      $(`.statusBar`).html('Extracting assets...');
      let extractPath = path.dirname(`${scriptPath}/${fileName}`);
      makeDir(extractPath);
    }

    console.log(`requesting for ${fileName} ${url}`);

    await sleep(100); //we must do this or github will punish us for so making req's so quickly
    worker.postMessage([
      'downloadFile',
      dependency['url'],
      `${scriptPath}/${fileName}`,
      dependencies['scripts'].length,
    ]);

    let id = i;

    if (!hidden) {
      let html = `
        <div class="result" id = "idScript${id}" name = "${scriptName}">
            <button onclick = "alert('${fullScriptName} \\n\\n ${description}')" class = "navButton navInfo tooltip" style = "background-color:none;border:none;height:30px;width:30px;position:absolute;top:20px;right:20px;background-position:center;">
                <span class="tooltiptext">Info</span>
            </button>

            <h2 class = "productTitle">${scriptName}</h2>
            <p class = "resultEntry">Version: ${version}</p>
            <div class = "resultButtons">
                <button id = "launchButton${i}">&#9889; Launch</button>
                <button class = "modifyButton" title = "Modify" onclick = "shell.openPath('${filePath}')">&#x270f; Modify</span></button>
            </div>
        </div>
        `;
      $(`#automationTasks`).append(html);

      //assign click event
      $(`#launchButton${id}`).on('click', function (event) {
        launch(`#launchButton${id}`, fileName, url, null);
      });
      //animate
      gsap.from(`#idScript${id}`, {
        duration: 2,
        ease: 'elastic.out(1, 0.2)',
        y: -100,
        opacity: 0,
      });
    }

    $(`.statusBar`).html('Automations are up to date.');
    $(`#automationTasks`).attr('status', 'none');
    ipcRenderer.send('setProgress', i / dependencies['scripts'].length);
  }

  $(`#buildFlyerInfo`).on('click', function (event) {
    alert(
      `Build Flyer \n\n When prompted, select the Feature View spreadsheet that was exported from Badger. Then, wait for the logos to finish downloading. You will be prompted again to select the flyer dimensions.`
    );
  });
  $(`#buildFlyerButton`).on('click', function (event) {
    launch(`#buildFlyerButton`, 'buildFlyer', null, null);
  });

  ipcRenderer.send('setProgress', -1);
}

function openDoc(fileName) {
  shell.openPath(getRelativePath(`${fileName}`));
}

function openProductBlock(fileName, indexes) {
  runJSX(`isolate_items.jsx`, `{"${getRelativePath(fileName)}","${indexes}"}`);
}

var launch = function (button, fileName, url, args) {
  gsap.from(button, {
    duration: 0.5,
    ease: 'circ.in',
    transformOrigin: 'center',
    scale: 0.9,
  });
  if (fileName == 'buildFlyer') {
    gsap.to(button, 0.1, { backgroundColor: 'black' });
  }

  //button
  gsap.to(button, {
    delay: 0.5,
    duration: 0.2,
    ease: 'circ.out',
    transformOrigin: 'center',
    scale: 1,
    onComplete: function () {
      party.resolvableShapes[
        'star'
      ] = `<img height = "20px" width = "20px" src="images/star.png"/>`;
      party.sparkles(
        document.querySelector(button, {
          spread: 10,
          count: 10,
          size: 0.2,
          speed: 1000,
          lifetime: party.variation.range(0.5, 1),
          rotation: 0,
        })
      );
    },
  });

  if (fileName == 'buildFlyer') {
    buildFlyer();
    gsap.to(button, 1, {
      delay: 1,
      y: 0,
      x: 0,
      backgroundColor: 'var(--primary4)',
      ease: 'circ.in',
    });
  } else {
    gsap.to(button, 1, {
      delay: 1,
      y: 0,
      x: 0,
      ease: 'circ.in',
      onComplete: runTool,
      onCompleteParams: [fileName, url, args],
    });
  }
};

async function getDependencies() {
  $(`.statusBar`).html('Updating automations...');

  let settings = { method: 'Get', cache: 'no-store', keepalive: false };
  await fetch(dependencyURL, settings)
    .then((res) => {
      let status = res.status;
      switch (status) {
        case 403:
          showError(
            'Error 403: Tried to reach the database, but the request was blocked.'
          );
        case 404:
          showError("Error 404: Couldn't reach the database.");
      }
      return res.json();
    })
    .then((json) => {
      dependencies = json;
      console.log(dependencies);
      return dependencies;
    })
    .catch((err) => {
      showError(
        'You are offline. Please connect to the internet to access all automations.'
      );
      $(`.statusBar`).html('You are offline.');
      $(`#automationTasks`).attr('status', 'offline');
    });
  downloadDependencies();
}

async function getScriptPath() {
  $(`.statusBar`).html('Checking InDesign configuration...');
  let versionCmd = 'ls -la /Applications/ | grep InDesign';

  exec(versionCmd, (error, stdout, stderr) => {
    var p = getHomePath() + `/Library/Preferences/Adobe InDesign`;

    if (error) {
      console.log(`error: ${error.message}`);
      showError(
        `Couldn't retrieve latest InDesign version. Please reinstall InDesign and try running the software again.`
      );
      return;
    }
    if (stderr) {
      showError(`stderr: ${stderr}`);
      return;
    }

    let versions = stdout.split('\n');
    versions = versions.filter(function (entry) {
      return /\S/.test(entry);
    });
    for (let i = 0; i < versions.length; ++i) {
      versions[i] = parseInt(
        versions[i].split('Adobe')[1].replace(/^\D+/g, '').replaceAll(':', '')
      );
    }

    const max = versions.reduce((a, b) => Math.max(a, b), -Infinity);
    let versionNumber = max - 2005;
    $(`#indVersion`).html(`${versionNumber + 2005} (v ${versionNumber}.0)`);
    versionNumber = 'Version ' + versionNumber + '.0';
    scriptPath = p + '/' + versionNumber + '/en_US/Scripts/Scripts Panel';
    getDependencies();
  });
}

function runJSX(scriptName, arguments) {
  //save extendscript files
  var args = arguments ?? `{"stellar"}`;
  let bashScript = `osascript -e 'tell application id "com.adobe.indesign"\nset args to ${args}\ndo script "${scriptPath}/${scriptName}" language javascript with arguments args\nend tell'`;
  let script = bashScript;

  //run bash script
  exec(`${script}`, (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      if (error.message.includes('authorize')) {
        showError(
          `Looks like you're missing automation permissions. Please allow Stellar to control InDesign by granting it permission in Settings on your Mac.`
        );
        window.open(
          'https://support.apple.com/en-is/guide/mac-help/mchl07817563/mac'
        );
      }
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });

  minimizeApp();
}

function runTool(fileName, url, args) {
  minimizeApp();
  console.log(`starting tool ${fileName}...`);
  let extension = fileName.split('.')[1];

  switch (extension) {
    case 'jsx':
      console.log('this is an indesign script');
      runJSX(fileName, args);
      break;
    case 'html':
      console.log('this is a webpage');
      window.open(url, '_blank', 'width=1080px');
      break;
    default:
      console.log('unknown tool type');
  }
}
