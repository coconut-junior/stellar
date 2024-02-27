const { exec } = require("child_process");
const { gsap } = require("gsap/dist/gsap");
const dependencyURL = "https://jbx.design/stellar/dependencies.json";
const request = require('request');
const DecompressZip = require("decompress-zip");
const party = require('party-js');

dependencies = [];
var scriptPath = undefined;

getScriptPath();

function downloadDependencies() {
    $(`.statusBar`).html('Updating automations...');
    var i = 0;

    dependencies['scripts'].forEach(function(dependency) {
        let fileName = dependency['filename'];
        let scriptName = dependency['name'];
        let fullScriptName = scriptName;
        let version = dependency['version'];
        let hidden = dependency['hidden'];
        let url = dependency['url'];
        let filePath = `${scriptPath}/${fileName}`;
        let description = dependency['description'];
        let homePath = getHomePath();

        $(`.statusBar`).html(`Downloading ${fileName}...`);

        if(scriptName.length > 24) {
            scriptName = scriptName.slice(0,20) + "...";
        }

        if(fileName.match('.zip')) {
            $(`.statusBar`).html('Creating folders...');
            let extractPath = path.dirname(`${scriptPath}/${fileName}`);
            makeDir(extractPath);
        }
        
        $.ajax({
            url: dependency['url'],
            success: function(data) {

                if (fs.existsSync(`${scriptPath}/${fileName}`) && !fileName.match('zip')) fs.unlinkSync(`${scriptPath}/${fileName}`);
                if(!fileName.match('html') && !fileName.match('zip')) fs.writeFileSync(`${scriptPath}/${fileName}`, data);

                if(!hidden) {
                    let html = `
                    <div class="result" id = "idScript${i}" name = "${scriptName}">
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

                    let id = i;
                    gsap.from(`#idScript${id}`, {duration: 2, ease: "elastic.out(1, 0.2)",y:-100,opacity:0});
                    
                    $(`#idScript${id}`).on('mouseenter', function(event) {
                        gsap.to(`#idScript${id}`,{duration:0.02,transformOrigin:"center",ease:"circ.out",scale:0.98,perspective:'500px'});
                    });
                    $(`#idScript${id}`).on('mouseleave', function(event) {
                        gsap.to(`#idScript${id}`,{duration:0.01,rotationX: 0,transformOrigin:"center",ease:"circ.out",scale:1});
                    });

                    $(`#launchButton${id}`).on('click', function(event) {
                        launch(`#launchButton${id}`, fileName, url, null);
                    });

                    $(`#automationTasks`).attr('status','none');
                    ++i;
                }
            },
            error: function(err) {
                console.log(err.status);
            }
        });

        //download and extract zip files

        if(fileName.match('.zip')) {
            $(`.statusBar`).html('Extracting assets...');

            let out = fs.createWriteStream(`${scriptPath}/${fileName}`);
            let extractPath = path.dirname(`${scriptPath}${fileName}`);

            request(url).pipe(out).on('finish',function() {
                console.log(extractPath);
                let zipPath = `${scriptPath}/${fileName}`;
                let unzipper = new DecompressZip(zipPath);

                unzipper.on('error', function (err) {
                    console.log('Caught an error', err);
                });
                unzipper.extract({
                    path: extractPath
                });

                //build flyer automation
                console.log('enabling flyer script');
                $(`#idScript999`).css('content-visibility','visible');
                $(`#idScript999`).css('background-image', 'none');
                $(`.statusBar`).html('Automations are up to date.');

            });

        }

        ipcRenderer.send('setProgress', i/dependencies['scripts'].length);
        i = 0;
        
    });

    $(`#idScript999`).on('mouseenter', function(event) {
        gsap.to(`#idScript999`,{duration:0.02,transformOrigin:"center",ease:"circ.out",scale:0.98,perspective:'500px'});
    });
    $(`#idScript999`).on('mouseleave', function(event) {
        gsap.to(`#idScript999`,{duration:0.01,rotationX: 0,transformOrigin:"center",ease:"circ.out",scale:1});
    });
    $(`#buildFlyerInfo`).on('click', function(event) {
        alert(`Build Flyer \n\n When prompted, select the Feature View spreadsheet that was exported from Badger. Then, wait for the logos to finish downloading. You will be prompted again to select the flyer dimensions.`);
    });
    $(`#buildFlyerButton`).on('click', function(event) {
        launch(`#buildFlyerButton`, 'buildFlyer', null, null);
    });
    //

    ipcRenderer.send('setProgress', -1);
}

function openDoc(fileName) {
    shell.openPath(getRelativePath(`${fileName}`));
}

function openProductBlock(fileName, indexes){
    runJSX(`isolate_items.jsx`,`{"${getRelativePath(fileName)}","${indexes}"}`);
}

var launch = function(button, fileName, url, args){
    repeatCount = 5;
    gsap.from(button, {duration: 0.5, ease: "circ.in",transformOrigin:"center", scale: 0.9});
    if(fileName == 'buildFlyer') {
        gsap.to(button,0.1,{backgroundColor: 'black'});
    }

    //button
    gsap.to(button, {delay: 0.5,duration: 0.2, ease: "circ.out",transformOrigin:"center", scale: 1,
        onComplete: function() {
            party.resolvableShapes["star"] = `<img height = "20px" width = "20px" src="images/star.png"/>`;
            party.sparkles(document.querySelector(button, {
                spread: 10,
                count: 10,
                size: 0.2,
                speed: 1000,
                lifetime: party.variation.range(0.5,1),
                rotation: 0
            }));
        }
    });
    
    if(fileName == 'buildFlyer') {
        buildFlyer();
        gsap.to(button,1,{delay: 1,y:0, x:0,backgroundColor:'var(--primary4)',ease: "circ.in",});
    }
    else {
        gsap.to(button,1,{delay: 1,y:0, x:0,ease: "circ.in",
        onComplete: runTool,
        onCompleteParams: [fileName, url, args]
    });
    }

}

function getDependencies() {
    $.ajax({
        url: dependencyURL,
        cache: false,
        success: function(data, status) {
            console.log('Connection succeeded.');
            // dependencies = JSON.parse(data);
            dependencies = data; //sometimes server responds with json object, otherwise parse json
            downloadDependencies();
        },
        statusCode: {
            403: function() {
                showError("Error 403: Tried to reach the database, but the request was blocked.");
            },
            404: function() {
                showError("Error 404: Couldn't reach the database.");
            },
        }
    }).fail(function() {
        showError('You are offline. Please connect to the internet to access all automations.');
        $(`.statusBar`).html('You are offline.');
        $(`#automationTasks`).attr('status','offline');
    });
}

function getScriptPath() {
    $(`.statusBar`).html('Checking InDesign configuration...');
    let versionCmd = 'system_profiler SPApplicationsDataType | grep InDesign | grep -v .app';
    
    exec(versionCmd, (error, stdout, stderr) => {
        var path = getHomePath() + `/Library/Preferences/Adobe InDesign`;

        if (error) {
            console.log(`error: ${error.message}`);
            showError(`Couldn't retrieve latest InDesign version. Please reinstall InDesign and try running the software again.`);
            return;
        }
        if (stderr) {
            showError(`stderr: ${stderr}`);
            return;
        }

        let versions = stdout.split('\n');
        versions = versions.filter(function(entry) { return /\S/.test(entry); });
        for(let i = 0;i<versions.length;++i) {
            versions[i] = parseInt(versions[i].replace(/^\D+/g, '').replaceAll(':',''));
        }
        
        const max = versions.reduce((a, b) => Math.max(a, b), -Infinity);
        let versionNumber = max - 2005;
        $(`#indVersion`).html(versionNumber);
        versionNumber = 'Version ' + versionNumber + '.0';

        scriptPath = path + '/' + versionNumber + '/en_US/Scripts/Scripts Panel';
        getDependencies();
    });
}

function runJSX(scriptName, arguments) {
    //save extendscript files
    var args = arguments ?? `{"stellar"}`;
    let homePath = getHomePath();
    let bashScript = `osascript -e 'tell application id "com.adobe.indesign"\nset args to ${args}\ndo script "${scriptPath}/${scriptName}" language javascript with arguments args\nend tell'`;
    let script = bashScript;

    //run bash script
    exec(`${script}`, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            if(error.message.includes('authorize')) {
                showError(`Looks like you're missing automation permissions. Please allow Stellar to control InDesign by granting it permission in Settings on your Mac.`);
                window.open('https://support.apple.com/en-is/guide/mac-help/mchl07817563/mac');
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

    switch(extension) {
        case 'jsx':
            console.log('this is an indesign script');
            runJSX(fileName, args);
            break;
        case 'html':
            console.log('this is a webpage');
            window.open(url,'_blank','width=1080px');
            break;
        default:
            console.log('unknown tool type');
    }
}
