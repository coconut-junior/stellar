app.linkingPreferences.checkLinksAtOpen = false;

var blocks = arguments[0].split(';'); //format: url:1,2,3,4;url:5,6,7
var newDoc = app.documents.add();
var row = 0;
var col = 0;

for(var b = 0;b<blocks.length;++b) {
    var url = blocks[b].split(':')[0];
    var indexes = blocks[b].split(':')[1].split(',');
    var doc = app.open(url);
    addBlock(doc,indexes,b);
    doc.close(SaveOptions.NO);

    if(col == 1) {
        col = 0;
        ++row;
    }
    else {
        ++col;
    }
}

function addBlock(doc,indexes,blockNumber) {
    newDoc.viewPreferences.horizontalMeasurementUnits = doc.viewPreferences.horizontalMeasurementUnits;
    newDoc.viewPreferences.verticalMeasurementUnits = doc.viewPreferences.verticalMeasurementUnits;

    var pageItems = doc.pages[0].allPageItems;
    var groupItems = [];
    //loop backwards, otherwise pageItem z-order will be reversed
    for(var x = indexes.length;x>0;--x) {
        for(var i = 0;i<pageItems.length;++i) {
            var element = pageItems[i];
            if(i == parseInt(indexes[x])) {
                var elementCopy = element.duplicate(newDoc.pages[0]);
                if(element == "[object TextFrame]") {
                    elementCopy.textFramePreferences.textColumnFixedWidth = element.textFramePreferences.textColumnFixedWidth;
                    elementCopy.textFramePreferences.textColumnGutter = element.textFramePreferences.textColumnGutter;
                }
                groupItems.push(elementCopy);
            }
        }
    }

    var group1 = newDoc.groups.add(groupItems);

    //position group
    var width = group1.geometricBounds[3] - group1.geometricBounds[1];
    var height = group1.geometricBounds[2] - group1.geometricBounds[0];
    
    //pixels
    if(newDoc.viewPreferences.horizontalMeasurementUnits == MeasurementUnits.PIXELS) {
        gutter = 5;
    }
    //inches
    else {
        gutter = 10;
    }

    var y = (height * row) + (gutter * row);
    
    if(col == 0) {gutter = 0;}
    var x = (width * col) + (gutter * col);
    
    group1.move([x,y]);
}