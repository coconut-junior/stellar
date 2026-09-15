app.linkingPreferences.checkLinksAtOpen = false;

var docName = arguments[0];
var indexes = arguments[1].split(',');
var doc = app.open(docName);
app.activeDocument.groups.everyItem().ungroup();
var items = doc.allPageItems;

var newDoc = app.documents.add();
newDoc.viewPreferences.horizontalMeasurementUnits = doc.viewPreferences.horizontalMeasurementUnits;
newDoc.viewPreferences.verticalMeasurementUnits = doc.viewPreferences.verticalMeasurementUnits;

//loop backwards, otherwise item z order will be reversed
for(var x = indexes.length-1;x >= 0;--x) {
  for (var i = 0;i<items.length;++i) {
    if (items[i].id == parseInt(indexes[x])) {
        var element = items[i];
        var elementCopy = element.duplicate(newDoc.pages[0]);
        if(elementCopy == "[object TextFrame]" && elementCopy.paragraphs.length >= 0) {
            elementCopy.paragraphs[0].appliedConditions = element.paragraphs[0].appliedConditions;
            //elementCopy.textFramePreferences.properties = element.textFramePreferences.properties;
        }
    }

  }
}

centerBlock(newDoc.pageItems);

function centerBlock(elements) {
    var group1 = newDoc.groups.add(elements);
    var width = group1.geometricBounds[3] - group1.geometricBounds[1];
    var height = group1.geometricBounds[2] - group1.geometricBounds[0];

    newDoc.align(group1,AlignOptions.HORIZONTAL_CENTERS,AlignDistributeBounds.PAGE_BOUNDS);
    newDoc.align(group1,AlignOptions.VERTICAL_CENTERS,AlignDistributeBounds.PAGE_BOUNDS);
    // for(var i = 0;i<elements.length;++i) {
    //     var element = elements[i];
    //     var width = element.geometricBounds[3] - element.geometricBounds[1];
    //     var height = element.geometricBounds[2] - element.geometricBounds[0];
    //     var x = element.geometricBounds[1];
    //     var y = element.geometricBounds[0];
    // }
}


doc.close(SaveOptions.NO);