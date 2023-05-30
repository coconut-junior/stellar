const { run } = require("node:test");
const dependencyURL = "https://www.dropbox.com/s/0t7yxgxf3msoll5/dependencies.json?dl=1";
var dependencies = [];
var scriptPath = getScriptPath();
const { exec } = require("child_process");
const { gsap } = require("gsap/dist/gsap");

$.ajax({
    url: dependencyURL,
    success: function(data) {
        dependencies = JSON.parse(data);
        downloadDependencies();
    },
    statusCode: {
        404: function() {
            console.log("Error 404: Couldn't reach the database.");
        },
    }
});

function downloadDependencies() {
    console.log('Downloading dependencies...')
    console.log(dependencies);
    var i = 0;

    dependencies['scripts'].forEach(function(dependency) {
        let fileName = dependency['filename'];
        let scriptName = dependency['name'];
        let version = dependency['version'];
        let hidden = dependency['hidden'];
        let url = dependency['url'];
        let filePath = `${scriptPath}/${fileName}`;
        let description = dependency['description'];
        let homePath = getHomePath();
        
        $.ajax({
            url: dependency['url'],
            success: function(data) {
                
                if(!fileName.match('html')) {
                    fs.writeFileSync(`${getScriptPath()}/${fileName}`, data);
                }

                if(!hidden) {
                    let html = `
                    <div class="result" id = "idScript${i}" style = "padding:10px;width:auto;position:relative;height:100px;margin:0;">
                        <button onclick = "alert('${description}')" class = "navButton" id = "navInfo" style = "background-color:none;border:none;height:30px;width:30px;position:absolute;top:10px;right:10px;"></button>

                        <h2 style = "padding:5px;" class = "productTitle">${scriptName}</h2>
                        <p class = "resultEntry" style = "text-align:center;">Version: ${version}</p>
                        <div style = "display:flex;flex-direction:row;gap:10px;justify-content:center;">
                            <button class = "primary" onclick = "runTool('${fileName}','${url}',null)">&#9889;<br>Launch</button>
                            <button>&#x23F0;<br>Schedule</button>
                            <button class = "modifyButton" onclick = "shell.openPath('${filePath}')">&#x270f;</span><br> Modify</button>

                        </div>
                    </div>
                    `;
                    $(`#automationTasks`).append(html);

                    let id = i;
                    gsap.from(`#idScript${id}`, {duration: 2, ease: "elastic.out(1, 0.4)",y:-100,opacity:0,lazy:true});
                    
                    $(`#idScript${id}`).on('mouseenter', function(event) {
                        gsap.to(`#idScript${id}`,{duration:0.01,rotationX:20,transformOrigin:"center",ease:"circ.out",scale:0.95});
                    });
                    $(`#idScript${id}`).on('mouseleave', function(event) {
                        gsap.to(`#idScript${id}`,{duration:0.01,rotationX: 0,transformOrigin:"center",ease:"circ.out",scale:1});
                    });

                    $(`#automationTasks`).css('background-image','none');
                    ++i;
                }
            }
        });

        i = 0;
        
    });
}

function openDoc(fileName) {
    shell.openPath(getRelativePath(`${fileName}`));
}

function openProductBlock(fileName, indexes){
    runJSX(`isolate_items.jsx`,`{"${getRelativePath(fileName)}","${indexes}"}`);
}

//runJSX(`isolate_items.jsx`,`{"/Users/jblanck/Library/CloudStorage/OneDrive-SharedLibraries-OlliesBargainOutlet/Creative Services - Designs/emails/2023/item_emails/1_31_coffee_email/1_31_coffee_email.indd","2,7"}`);
//runTool('autotagger/index.html');

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
    let latestVersionInt = 0;
    let latestVersion = '';

    folders.forEach( function(element, index) {
        if(element.toLowerCase().match('version')) {
            //get latest version
            let version = parseInt(element.replace(/[^0-9]/g, ''));
            if(version > latestVersionInt) {latestVersion = element;}
        }
    });

    return path + '/' + latestVersion + '/en_US/Scripts/Scripts Panel';
}

console.log(getScriptPath());

function getInDesignPath() {
    const fs = require("fs");
    let folders = fs.readdirSync('/Applications');
    let latestVersionInt = 0;
    let latestVersion = '';
    folders.forEach( function(element, index) {
        if(element.toLowerCase().match('indesign')) {
            //get latest version
            let version = parseInt(element.replace(/[^0-9]/g, ''));
            if(version > latestVersionInt) {latestVersion = element;}
        }
    });

    return `/Applications/${latestVersion}`;
}

function runJSX(scriptName, args) {
    //save extendscript files

    //create bash script
    if(args == null || args == ''){args = `{""}`}
    let homePath = getHomePath();
    let bashScript = `osascript -e 'tell application id "com.adobe.indesign"\nset args to ${args}\ndo script "${scriptPath}/${scriptName}" language javascript with arguments args\nend tell'`;
    console.log(bashScript);
    fs.writeFileSync(`${homePath}/Pasteboard/scripts/shell.sh`, bashScript);
    let script = `${homePath}/Pasteboard/scripts/shell.sh`;

    //run bash script

    exec(`bash ${script}`, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
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

function downloadAssets(assetList) {
    let assets = assetList.split(',');
    console.log("downloading assets...");
    
    for (let i in assets) {
        let asset = assets[i];
        if(asset.match("file:")) {
            let link = "file://" + getRelativePath(asset.replace("file:","").replaceAll('%20',' '));
            console.log(link);
            if(fs.existsSync(link.replace('file://',''))) {
                $(`#downloadLink`).attr('href',link);
                $(`#downloadLink`)[0].click();
            }
            else {
                console.log('file does not exist');
            }
        }
    }
}