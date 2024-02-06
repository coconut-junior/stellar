const { shell } = require('electron');
const fs = require("fs");
const {ipcRenderer} = require('electron');
const path = require('path');
const { addListener } = require('process');
const ViewModes = {normal: 0, compact: 1};
window.$ = window.jQuery = require('jquery');

var jsonData = null;
var dbURL = "https://www.dropbox.com/s/iy2ykin3udwdbb4/product_db.json?dl=1";
var viewMode = ViewModes.normal;
var results = [];
var products = [];
var adBuilderList = [];

const { webFrame } = require('electron');
webFrame.setZoomFactor(0.9);

//remember settings
const Store = require('electron-store');
const { resolvableShapes } = require('party-js');
var store = new Store();

$(`#appearanceDropdown`).val(store.get('appearance'));
$(`#minimizeDropdown`).val(String(store.get('minimizeOnLaunch')));

$(`#appearanceDropdown`).on('change', function(){
    let appearance = $(`#appearanceDropdown`).val();
    setAppearance(appearance);
});

$(`#minimizeDropdown`).on('change', function(){
    ipcRenderer.sendSync('setMinimizeBehavior',($(`#minimizeDropdown`).val() === "true"));
});

function setAppearance(appearance) {
    ipcRenderer.sendSync('setAppearance',appearance);
}

function makeDir(dir) {
    ipcRenderer.sendSync('makeDir',dir);
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

function setWindowOnTop() {
    ipcRenderer.invoke('setWindowOnTop');
}
function setWindowOnBottom() {
    console.log('setting window on bottom');
    ipcRenderer.invoke('setWindowOnBottom');
}
function compactMode() {
    ipcRenderer.send('resize-window', 400, 800);
}

// setWindowOnTop();

function drag(event) {
    event.dataTransfer.setData('text',event.target.id);
    $(`.adBuilder`).css('transition','0.3s');
}

function dragLeave(event) {
    $(`#drop_zone`).css('border-color','var(--primary1)');
    $(`#drop_zone`).css('background-color','transparent');
    $(`.adBuilder`).css('transform','perspective(50em) rotateX(0deg)');
    $(`.adBuilder`).css('scale','1');
}

function dragStart(event) {
    
}

function dragEnd(event) {
    event.preventDefault();
    $(`.adBuilder`).css('transition','0s');
}

function dropHandler(event) {
    event.preventDefault();
    $(`.adBuilder`).css('transition','0s');
    let id = event.dataTransfer.getData('text/plain');
    let product = products[parseInt(id.split('_')[1])];
    
    if(!adBuilderList.includes(product)) {
        adBuilderList.push(product);
        $(`#adList`).css('display','flex');
        $(`#adList`).append(
            `<li class = "adItem">${product.title}
                <div class = "removeButton"></div>
            </li>`
        )
        $(`.adItem .removeButton`).on('click',(event)=>{
            $.each(adBuilderList, function(index, value) {
                if(value.title == event.target.parentElement.innerText) {
                    adBuilderList.splice(index,1);
                    return false;
                }
            });

            if(adBuilderList.length == 0) {
                $(`#adList`).css('display','none');
            }
            event.target.parentElement.remove();
        });
    }

    $(`#drop_zone`).css('border-color','var(--primary1)');
    $(`#drop_zone`).css('background-color','transparent');
    $(`.adBuilder`).css('transform','perspective(50em) rotateX(0deg)');
    $(`.adBuilder`).css('scale','1');
}

function dragOverHandler(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    $(`#drop_zone`).css('border-color','var(--primary3)');
    $(`#drop_zone`).css('background-color','var(--primary1)');
    $(`.adBuilder`).css('transform','perspective(50em) rotateX(5deg)');
    $(`.adBuilder`).css('scale','0.9');
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
    try{
        search(e.target.value);
    }
    catch(e) {console.log('Could not search');}
});

function search(query) {
    let results = $(`.result`);
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