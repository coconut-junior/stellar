const { exec } = require("child_process");
const { gsap } = require("gsap/dist/gsap");
const dependencyURL = "https://jbx.design/stellar/dependencies.json";
const request = require('request');
const DecompressZip = require("decompress-zip");
const party = require('party-js');
const { verify } = require("crypto");

dependencies = [];
var scriptPath = getScriptPath();

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
        404: function() {
            showError("Error 404: Couldn't reach the database.");
        },
    }
}).fail(function() {
    showError('You are offline. Please connect to the internet to access all automations.');
    $(`.statusBar`).html('You are offline.');
    $(`#automationTasks`).attr('status','offline');
});

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

        if(scriptName.length > 24) {
            scriptName = scriptName.slice(0,24) + "...";
        }
        
        $.ajax({
            url: dependency['url'],
            success: function(data) {
                
                if(!fileName.match('html') && !fileName.match('zip')) {
                    fs.writeFileSync(`${getScriptPath()}/${fileName}`, data);
                }

                if(!hidden) {
                    let html = `
                    <div class="result" id = "idScript${i}" style = "padding:10px;width:auto;position:relative;height:100px;margin:0;">
                        <button onclick = "alert('${fullScriptName} \\n\\n ${description}')" class = "navButton navInfo" style = "background-color:none;border:none;height:30px;width:30px;position:absolute;top:10px;right:10px;"></button>

                        <h2 style = "padding:5px;" class = "productTitle">${scriptName}</h2>
                        <p class = "resultEntry" style = "text-align:center;">Version: ${version}</p>
                        <div style = "display:flex;flex-direction:row;gap:10px;justify-content:center;">
                            <button class = "primary" id = "launchButton${i}">&#9889; Launch</button>
                            <!--<button onclick = "alert('This feature is coming soon!')">&#x23F0;<br>Schedule</button>-->
                            <button class = "modifyButton" title = "Modify" style = "width:60px;" onclick = "shell.openPath('${filePath}')">&#x270f;</span></button>
                        </div>
                    </div>
                    `;
                    $(`#automationTasks`).append(html);

                    let id = i;
                    gsap.from(`#idScript${id}`, {duration: 2, ease: "elastic.out(1, 0.4)",y:-100,opacity:0});
                    
                    $(`#idScript${id}`).on('mouseenter', function(event) {
                        gsap.to(`#idScript${id}`,{duration:0.05,transformOrigin:"center",ease:"circ.out",scale:0.95,perspective:'500px'});
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
            let out = fs.createWriteStream(`${getScriptPath()}/${fileName}`);
            let extractPath = path.dirname(`${getScriptPath()}${fileName}`);

            request(url).pipe(out).on('finish',function() { //figure out how to call this synchronously
                console.log(extractPath);
                let zipPath = `${getScriptPath()}/${fileName}`;
                let unzipper = new DecompressZip(zipPath);

                unzipper.on('error', function (err) {
                    console.log('Caught an error', err);
                });
                unzipper.extract({
                    path: extractPath
                });
            });

        }

        ipcRenderer.send('setProgress', i/dependencies['scripts'].length);
        i = 0;
        
    });

    //build flyer automation
    console.log('enabling flyer script');
    $(`#idScript999`).css('display','flex');
    gsap.from(`#idScript999`, {duration: 2, ease: "elastic.out(1, 0.4)",y:-100,opacity:0});

    $(`#idScript999`).on('mouseenter', function(event) {
        gsap.to(`#idScript999`,{duration:0.05,transformOrigin:"center",ease:"circ.out",scale:0.95,perspective:'500px'});
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

    $(`.statusBar`).html('Automations are up to date.');
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
    $(button).css('transition','none');
    gsap.from(button, {duration: 0.5, ease: "circ.in",transformOrigin:"center", scale: 0.9});
    gsap.to(button,0.1,{backgroundColor: 'black'});

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
        gsap.to(button,1,{delay: 1,y:0, x:0,backgroundColor:'var(--primary3)',ease: "circ.in",});
    }
    else {
        gsap.to(button,1,{delay: 1,y:0, x:0,backgroundColor:'var(--primary3)',ease: "circ.in",
        onComplete: runTool,
        onCompleteParams: [fileName, url, args]
    });
    }

}

function buildAd() {
    let blocks = [];
    adBuilderList.forEach(function(product, index) {
        let elements = product.indexes;
        let url = getRelativePath(product.source);
        blocks.push(url + ':' + elements);
    });
    let blockList = blocks.join(';');
    runJSX(`build_ad.jsx`,`{"${blockList}"}`);

    adBuilderList = [];
    $(`#adList`).html('');
    $(`#adList`).css('display','none');
}

function getScriptPath() {
    let path = getHomePath() + `/Library/Preferences/Adobe InDesign`;
    let folders = fs.readdirSync(path);
    let latestVersion = 0;
    let latestVersionString = '';

    folders.forEach( function(element, index) {
        if(element.toLowerCase().match('version')) {
            //get latest version
            let version = parseFloat(element.replace(/[^0-9.]/g, ''));
            if(version > latestVersion) {latestVersionString = element;latestVersion = version;}
        }
    });

    return path + '/' + latestVersionString + '/en_US/Scripts/Scripts Panel';
}

function runJSX(scriptName, arguments) {
    //save extendscript files
    var args = arguments;
    //create bash script
    if(args == null || args == ''){args = `{"stellar"}`;}
    let homePath = getHomePath();
    let bashScript = `osascript -e 'tell application id "com.adobe.indesign"\nset args to ${args}\ndo script "${scriptPath}/${scriptName}" language javascript with arguments args\nend tell'`;
    fs.writeFileSync(`${homePath}/Stellar/scripts/shell.sh`, bashScript);
    let script = `${homePath}/Stellar/scripts/shell.sh`;

    console.log(bashScript);

    //run bash script

    exec(`bash ${script}`, (error, stdout, stderr) => {
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
