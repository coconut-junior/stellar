const { run } = require("node:test");
const dependencyURL = "https://www.dropbox.com/s/0t7yxgxf3msoll5/dependencies.json?dl=1";
var dependencies = [];
var scriptPath = getScriptPath();
const { exec } = require("child_process");

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
    dependencies['scripts'].forEach(function(dependency) {
        var fileName = dependency['filename'];
        var filePath = `${scriptPath}/${fileName}`;
        var homePath = getHomePath();
        
        $.ajax({
            url: dependency['url'],
            success: function(data) {
                //fs.chmod(scriptPath, '755', function(error){console.log(error);});
                fs.writeFileSync(`${getScriptPath()}/${fileName}`, data);
            }
        });
        
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
}

function runTool(fileName, args) {
    console.log(`starting tool ${fileName}...`);
    let extension = fileName.split('.')[1];

    switch(extension) {
        case 'jsx':
            console.log('this is an indesign script');
            runJSX(fileName, args);
            break;
        case 'html':
            console.log('this is a webpage');
            window.open(`pages/${fileName}`,'_blank','width=1080px');
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