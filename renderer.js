const {ipcRenderer, webFrame } = require('electron');
const ViewModes = {normal: 0, compact: 1};
const Store = require('electron-store');
const { shell } = require('electron');
let $ = window.$ = window.jQuery = require('jquery');

var viewMode = ViewModes.normal;
var results = [];

webFrame.setZoomFactor(0.9);

//remember settings

var store = new Store();
$(`#appearanceDropdown`).val(store.get('appearance'));
$(`#minimizeDropdown`).val(String(store.get('minimizeOnLaunch')));

updateAppearance();

function updateAppearance() {
    let appearance = $(`#appearanceDropdown`).val();
    if(appearance == "gundam") {
        console.log('gundam mode!');
        $(`:root`).attr('theme', 'gundam');
    }
    else {
        $(`:root`).attr('theme', appearance);
    }
    setAppearance(appearance);
}

$(`#appearanceDropdown`).on('change', function(){
    updateAppearance();
});

$(`#minimizeDropdown`).on('change', function(){
    ipcRenderer.sendSync('setMinimizeBehavior',($(`#minimizeDropdown`).val() === "true"));
});

function createTitleBar() {
    var windowTopBar = document.getElementById('titlebar')
    windowTopBar.style.width = "100%"
    windowTopBar.style.height = "96px"
    windowTopBar.style.backgroundColor = "transparent"
    windowTopBar.style.position = "absolute"
    windowTopBar.style.top = windowTopBar.style.left = 0
    windowTopBar.style.webkitAppRegion = "drag"
    windowTopBar.style.zIndex = -1
}

function setAppearance(appearance) {
    ipcRenderer.sendSync('setAppearance',appearance);
}

function showAbout() {
    ipcRenderer.invoke('showAbout');
}
function focusWindow() {
    ipcRenderer.invoke('focusWindow');
}

function getHomePath() {
    return ipcRenderer.sendSync('getHome');
}

function showError(message) {
    ipcRenderer.sendSync('showError',message);
}

function minimizeApp() {
    ipcRenderer.invoke('minimize');
}

function toggleView() {
    if(viewMode == ViewModes.normal) {
        viewMode = ViewModes.compact;
        viewCompact();
    }
    else {
        viewMode = ViewModes.normal;
        viewNormal();
    }
}

function viewCompact() {
    $(`.productInfo`).css('flex-direction','row');
    $(`.productInfo`).css('gap','10px');
    $(`.resultButtons`).css('display','none');
    $(`.toggleSwitch`).css('left',"5px");
    $(`.toggleSwitch`).css('background-image',"url('images/compactview_icon.svg')");
    $(`hr`).css('border','0');
    $(`hr`).css('border-right','2px dotted lightgray');
    $(`hr`).css('margin','0px 30px 0px 0px');
}

function viewNormal() {
    $(`.productInfo`).css('flex-direction','column');
    $(`.productInfo`).css('gap','0');
    $(`.resultButtons`).css('display','flex');
    $(`.toggleSwitch`).css('left',"55px");
    $(`.toggleSwitch`).css('background-image',"url('images/normalview_icon.svg')");
    $(`hr`).css('border','0');
    $(`hr`).css('border-top','2px dotted lightgray');
    $(`hr`).css('margin','10px 0px 10px 0px');
}

function getRelativePath(path) {
    if(path.match('Users')) {
        var newPath = path.split('/');
        newPath.splice(0,3);
        return getHomePath() + '/' + newPath.join('/');
    }
    else {
        return path;
    }
}

$(`#automationSearch`).on('keyup', function(e) {
    try{search(e.target.value);}
    catch(e) {console.log('Could not search');}
});

function search(query) {
    let resultCount = 0;

    for(let i = 0;i<results.length;++i) {
        query = query.toLowerCase();
        let element = results[i];
        let name = element.getAttribute('name').toLowerCase();

        if(name.match(query)) {
            element.style.display = "grid";
            ++resultCount;
        }
        else {
            element.style.display = "none";
        }
    }

    if(resultCount < 3) {
        $(`#automationTasks`).css('grid-template-columns','repeat(auto-fit, minmax(300px, 350px))');
    }
    else {
        $(`#automationTasks`).css('grid-template-columns','repeat(auto-fit, minmax(300px, auto))');
    }

}

createTitleBar();