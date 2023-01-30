const { run } = require("node:test");

function getJSX(scriptName) {
    // const fs = require("fs");
    // let contents = fs.readFileSync(`scripts/indesign/${scriptName}`,{encoding:'utf8', flag:'r'});
    let iframe = document.createElement('iframe');
    iframe.setAttribute('src',`scripts/indesign/${scriptName}`);
    contents = iframe.contentWindow.document.body.innerHTML;
    console.log(contents);
}

runJSX(`indexer.jsx`,null);

//runTool('autotagger/index.html');

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
    let bashScript = `osascript -e 'tell application id "com.adobe.indesign"\nset args to ${args}\ndo script "${getInDesignPath()}/Scripts/Community/Scripts Panel/${scriptName}" language javascript with arguments args\nend tell'`;
    console.log(bashScript);
    fs.writeFileSync(`${homePath}/Pasteboard/scripts/shell.sh`, bashScript);
    let script = `${homePath}/Pasteboard/scripts/shell.sh`;

    //run bash script
    const { exec } = require("child_process");

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