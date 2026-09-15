var doc = app.activeDocument;
var pages = doc.pages;
var tolerance = 10; //in pixels
var minWidth = 0;

alert("Howdy partner, are you ready to wrangle some product blocks? 🤠");

GeneralPreference.ungroupRemembersLayers = false;
app.activeDocument.groups.everyItem().ungroup(); //ungroup everything

for(var p = 0;p<pages.length;++p) {
    collectAssets(p);
}

function isWhite(color) {
    var white = false;
  
    if(color.name == 'None') {
      return false
    }
    else if(color.model == ColorModel.PROCESS) {
        if(color.colorValue.toString() == [0,0,0,0].toString()){
            white = true;
        }
    }
    else if(color.model == ColorModel.RGB) {
        if(color.colorValue.toString() == [255,255,255].toString()) {
            white = true;
        }
    }

    return white;
}

function collectAssets(pageIndex) {
    var whiteSpaces = [];
    var items = pages[pageIndex].pageItems.everyItem().getElements(); //how to get all items including nested ones... i know a pain

    //find the white spaces!
    for (var i = 0;i<items.length;++i){
        var item = items[i];
        //sometimes these white spaces are text frames... include them
        try{
            if(
            (item == "[object Rectangle]" || item == "[object TextFrame]")
            || item.name == "script_bg_box"
            && (isWhite(item.fillColor))
            && !item.locked){
                whiteSpaces.push(item);
            }
        }
        catch(error){}
    }

    //find the products!
    for (var i = 0;i<whiteSpaces.length;++i){
        var whiteSpace = whiteSpaces[i];
        var itemsToGroup = new Array;

        for (var p = 0;p<items.length;++p){
            var element = items[p];
            if(
            isColliding(element,whiteSpace)
            && !element.itemLayer.name.match('specs')
            && !element.locked
            && element.itemLayer == whiteSpace.itemLayer
            ){
                itemsToGroup.push(element);
            }
        }

        itemsToGroup.push(whiteSpace);

        if(itemsToGroup.length > 1) {
            try{
                var group = pages[pageIndex].groups.add(itemsToGroup);
            }
            catch(e){}
        }
    }

    alert('Yeehaw!');
}

function isColliding(child, parent) {
    //y1 x1 y2 x2
    var childBounds = child.visibleBounds;
    var parentBounds = parent.visibleBounds;

    var childHeight = childBounds[2] - childBounds[0];
    var childWidth = childBounds[3] - childBounds[1];

    var parentHeight = parentBounds[2] - parentBounds[0];
    var parentWidth = parentBounds[3] - parentBounds[1];

    if(doc.viewPreferences.horizontalMeasurementUnits == MeasurementUnits.inches) {
        tolerance = 0.1; //0.1 inches seems to be the sweet spot
        minWidth = 1;
        if(child.graphics.length > 0) {
            tolerance = 0.3;
        }
    }
    else if(doc.viewPreferences.horizontalMeasurementUnits = MeasurementUnits.pixels){
        tolerance = 20;
        minWidth = 200;
    }

    if(childBounds[0] > parentBounds[0] - tolerance
    && childBounds[1] > parentBounds[1] - tolerance
    && childBounds[2] < parentBounds[2] + tolerance
    && childBounds[3] < parentBounds[3] + tolerance
    && parentWidth > minWidth ){
        return true;
    }
    else {
        return false;
    }
}