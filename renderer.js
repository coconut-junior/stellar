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

//assign tab click events
$(`[data-tab-target]`).each(function(index,value) {
    $(this).on('click', function(event) {
        $(`[data-tab-target]`).each(function(index,value) {
            $(this).css('background-color','transparent');
        });

        $(this).css('background-color','var(--primary3)');

        $(`[data-tab-page]`).each(function() {
            $(this).removeClass('active');
        });

        let target = $(this).attr('data-tab-target');
        $(`${target}`).addClass('active');
    });
});

function showAbout() {
    ipcRenderer.invoke('showAbout');
}

function getHomePath() {
    return ipcRenderer.sendSync('getHome');
}

function minimizeApp() {
    ipcRenderer.invoke('minimize');
}

function createTitleBar() {
    var windowTopBar = document.createElement('div')
    windowTopBar.style.width = "100%"
    windowTopBar.style.height = "32px"
    windowTopBar.style.backgroundColor = "transparent"
    windowTopBar.style.position = "absolute"
    windowTopBar.style.top = windowTopBar.style.left = 0
    windowTopBar.style.webkitAppRegion = "drag"
    document.body.appendChild(windowTopBar)
}

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

function search() {
    $(`.resultBox`).html('');
    $(`.resultBox`).css("background-size","50px");

    $.ajax({
        url: dbURL,
        success: function(data) {
            readDatabase(data);
        },
        statusCode: {
            404: function() {
                alert("Error 404: Couldn't reach the database.");
            },
            503: function() {
                console.log("Error 503: Service unavailable, trying again...");
                search();
            }
        }
    });
}

function readDatabase(jsonText) {
    results.length = 0;
    $(`.resultBox`).html('');

    let term = $(`#searchBox`).val();
    
    try {
        jsonData = JSON.parse(jsonText);
        products= jsonData['products'];
        $(`#timestamp`).html(`Last Indexed: ${jsonData['timestamp']}`);

        for (let i in products) {
            let product = products[i];
            product.title = product.title.replaceAll('%20',' ');

            if(product['title'].toLowerCase().includes(term.toLowerCase())) {
                results.push(products[i]);

                let links = product.links.join(',');

                let data = `
                <div class = "result" draggable="true" id = "result_${i}" ondragstart = "drag(event)">
                    <h2 class = "resultEntry">${product.title}</h2>
                
                    <div class = "resultGroup">
                        <div class = "productInfo">
                            <div>
                                <img class = "resultIcon" src = "images/ourprice_icon.png">
                                <p class = "resultEntry"><span class = "medium">Our Price:</span> ${product.ours}</p>
                            </div>
                            <div>
                                <img class = "resultIcon" src = "images/theirprice_icon.png">
                                <p class = "resultEntry"><span class = "medium">Their Price:</span> ${product.theirs}</p>
                            </div>
                            <hr>
                            <div>
                                <img class = "resultIcon" src = "images/flyer_icon.png">
                                <p class = "resultEntry"><span class = "medium">Page:</span> ${product.page}</p>
                            </div>
                            <div>
                                <img class = "resultIcon" src = "images/layer_icon.png">
                                <p class = "resultEntry"><span class = "medium">Layer:</span> ${product.layer}</p>
                            </div>
                        </div>
                
                        <div class = "resultButtons">
                
                            <div style = "display:flex;gap:10px;flex-direction:column;">
                                <button class = "entryButton" id = "flyerButton" onclick="openDoc('${product.source}')">&#128240; Open Ad</button>
                                <button class = "entryButton" id = "productBlockButton" onclick="openProductBlock('${product.source}','${product.indexes}')">&#129330; Pick Up</button>
                            </div>
                        
                            <button class = "entryButton" id = "assetButton" title = "Save Images" onclick="downloadAssets('${links}')"></button>
                        </div>
                    
                    </div>
                </div>`;
                
                $(`.resultBox`).append(data);
            }

            if(results.length == 1) {
                $(`#resultCounter`).html(`${results.length} Result`);
            }
            else {
                $(`#resultCounter`).html(`${results.length} Results`);
            }

            $(`.resultBox`).css("background-size","0");
        }
    }
    catch(error) {
        console.log(error);
    }
    
    return results;
}

function openWebsite() {
    console.log('opening website');
    window.open('https://jbx.design/','_blank','width=1280px,height=720px');
}

createTitleBar();
search();