//DESCRIPTION:Create a sign for each individual prepared product in the InDesign file

// Modified 2022-04-25
// Keith Gilbert, Gilbert Consulting
// http://www.gilbertconsulting.com

var existingFileInc = 0;

//backport replaceall function to es3
String.prototype.replaceAll = function (str1, str2, ignore) {
  return this.replace(
    new RegExp(
      str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g, '\\$&'),
      ignore ? 'gi' : 'g'
    ),
    typeof str2 == 'string' ? str2.replace(/\$/g, '$$$$') : str2
  );
};

Pre();

function Pre() {
  // Check to make sure all required conditions are met
  var _scriptRedraw = app.scriptPreferences.enableRedraw,
    _userInteraction = app.scriptPreferences.userInteractionLevel;
  _measurementUnit = app.scriptPreferences.measurementUnit;
  app.scriptPreferences.enableRedraw = false;
  app.scriptPreferences.userInteractionLevel =
    UserInteractionLevels.interactWithAll;
  app.scriptPreferences.userInteractionLevel =
    UserInteractionLevels.neverInteract;
  app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
  if (app.documents.length == 0) {
    alert('Please open a document and try again.');
    return;
  }
  Main();
  app.scriptPreferences.enableRedraw = _scriptRedraw;
  app.scriptPreferences.userInteractionLevel = _userInteraction;
  app.scriptPreferences.measurementUnit = _measurementUnit;
  beep();
}
function Main() {
  var myDoc = app.activeDocument;

  //Save if haven't already
  try {
    $.writeln(myDoc.fullName);
  } catch (e) {
    alert('Please save your document first.');
  }
  myDoc.save();
  var myDocFullName = myDoc.fullName;
  var myOutputFolderName = myTrimName(myDoc.fullName) + '/store_signs';

  // Create the output folder
  var myOutputFolder = new Folder(myOutputFolderName);
  myOutputFolder.create();
  // Create the PDF folder

  var myObjectsArray = myDoc.allPageItems; // allPageItems returns an array of all objects in the document, even those in groups
  for (var i = myObjectsArray.length - 1; i >= 0; i--) {
    if (myObjectsArray[i].constructor.name == 'Group') {
      var items = myObjectsArray[i].allPageItems;
      var isProduct = false;
      for (var g = items.length - 1; g >= 0; g--) {
        if (items[g].constructor.name == 'TextFrame') {
          var text = items[g].texts[0].contents;
          if (text.toLowerCase().match('theirs')) {
            isProduct = true;
          }
        }
      }

      if (isProduct) {
        var myProduct = myObjectsArray[i];
        myBreakObjectStyleLinks(myProduct);
        exportGroup(myDoc, myProduct, myOutputFolderName);
      }
    }
  }
  // Close the modified document without saving and reopen the original
  myDoc.close(SaveOptions.no);
  app.open(myDocFullName);
  alert('Export Complete\n' + myOutputFolderName);
}
function exportGroup(myDoc, myProduct, myOutputFolderName) {
  // Create a new doc for the sign
  var mySignDoc = app.documents.add();
  mySignDoc.viewPreferences.horizontalMeasurementUnits =
    MeasurementUnits.points;
  mySignDoc.viewPreferences.verticalMeasurementUnits = MeasurementUnits.points;
  mySignDoc.viewPreferences.rulerOrigin = RulerOrigin.PAGE_ORIGIN;
  mySignDoc.zeroPoint = [0, 0];
  with (mySignDoc.documentPreferences) {
    pageHeight = 612;
    pageWidth = 792;
    pageOrientation = PageOrientation.landscape;
    pagesPerDocument = 1;
    facingPages = false;
    intent = DocumentIntentOptions.PRINT_INTENT;
  }
  with (mySignDoc.pages[0].marginPreferences) {
    columnCount = 1;
    columnGutter = 12;
    bottom = 18;
    left = 18;
    right = 18;
    top = 18;
  }
  // Duplicate, scale, and position the items on the sign
  myRedefineScaling(myProduct);
  myProduct.duplicate(mySignDoc.pages[0]);
  var myProduct = mySignDoc.groups[0];

  try {
    myMoveObject(myProduct, 'center', 396, 306);
  } catch (e) {}

  var myProductWidth = myGetWidth(myProduct);
  var myProductHeight = myGetHeight(myProduct);
  if (myProductWidth / myProductHeight > 1.3125) {
    var myScaleFactor = (756 / myProductWidth) * 100;
  } else {
    var myScaleFactor = (576 / myProductHeight) * 100;
  }

  myScaleFrame(myProduct, AnchorPoint.CENTER_ANCHOR, myScaleFactor);

  // Ungroup everything in the document
  while (mySignDoc.groups.length > 0) {
    mySignDoc.groups.everyItem().ungroup();
  }
  // Extract the first 12 chars of text in the largest point size that isn't a price
  var mySize = 0;
  var myFileNameText = '';
  var myObjectsArray = mySignDoc.allPageItems; // allPageItems returns an array of all objects in the document, even those in groups
  for (var i = myObjectsArray.length - 1; i >= 0; i--) {
    var myTextFrame = myObjectsArray[i];

    if (myObjectsArray[i].constructor.name == 'TextFrame') {
      for (var p = 0; p < myTextFrame.paragraphs.length; ++p) {
        if (myTextFrame.paragraphs[p].appliedFont.name.match('ChocolateMilk')) {
          myFileNameText = myTextFrame.contents;
        }
      }

      myRedefineScaling(myTextFrame);
      if (myTextFrame.characters.length > 0) {
        var myTextSize = myFindLargestChar(myTextFrame);
        if (myTextSize > mySize) {
          if (myTextFrame.contents.toString().match(/\$/g) === null) {
            if (myTextFrame.characters.length > 5) {
              mySize = myTextSize;
            }
          }
        }
      }
    }
  }
  myFileNameText = myCleanFileName(myFileNameText);

  while (myFileNameText.match('__')) {
    myFileNameText = myFileNameText.replace('__', '_');
  }

  myFileNameText = myFileNameText.slice(0, 24);
  if (myFileNameText[0] == '_') {
    myFileNameText = myFileNameText.slice(1, myFileNameText.length - 1);
  }

  var f = File(myOutputFolderName + '/' + myFileNameText + '.indd');
  if (f.exists) {
    myFileNameText += existingFileInc;
    ++existingFileInc;
  }

  var myFileName = new File(myOutputFolderName + '/' + myFileNameText + '.pdf');
  var n = 1;
  while (myFileName.exists) {
    myFileName = new File(
      myOutputFolderName + '/' + myFileNameText + '_' + String(n) + '.pdf'
    );
    n++;
  }
  // Output to PDF
  app.pdfExportPreferences.pageRange = '1';
  app.pdfExportPreferences.optimizePDF = false;
  mySignDoc.exportFile(
    ExportFormat.pdfType,
    myFileName,
    false,
    app.pdfExportPresets.itemByName('[Press Quality]')
  );

  mySignDoc.save(File(myOutputFolderName + '/' + myFileNameText + '.indd'));
  mySignDoc.close();
}
// Move object to the specified XY coordinate relative to the specified anchor point
function myMoveObject(myObject, myAnchorPoint, myX, myY) {
  switch (myAnchorPoint) {
    case 'bottomLeft':
      var myObjectHeight =
        myObject.geometricBounds[2] - myObject.geometricBounds[0];
      myObject.move([myX, myY - myObjectHeight]);
      break;
    case 'bottomRight':
      var myObjectHeight =
        myObject.geometricBounds[2] - myObject.geometricBounds[0];
      var myObjectWidth =
        myObject.geometricBounds[3] - myObject.geometricBounds[1];
      myObject.move([myX + myObjectWidth, myY - myObjectHeight]);
      break;
    case 'topLeft':
      myObject.move([myX, myY]);
      break;
    case 'topRight':
      var myObjectWidth =
        myObject.geometricBounds[3] - myObject.geometricBounds[1];
      myObject.move([myX - myObjectWidth, myY]);
      break;
    case 'bottomCenter':
      break;
    case 'topCenter':
      var myObjectWidth =
        myObject.geometricBounds[3] - myObject.geometricBounds[1];
      myObject.move([myX - myObjectWidth / 2, myY]);
      break;
    case 'center':
      var myObjectHeight =
        myObject.geometricBounds[2] - myObject.geometricBounds[0];
      var myObjectWidth =
        myObject.geometricBounds[3] - myObject.geometricBounds[1];
      myObject.move([myX - myObjectWidth / 2, myY - myObjectHeight / 2]);
      break;
    default:
      break;
  }
}
// Get the width of an object
function myGetWidth(myObject) {
  return myObject.visibleBounds[3] - myObject.visibleBounds[1];
}
// Get the height of an object
function myGetHeight(myObject) {
  return myObject.visibleBounds[2] - myObject.visibleBounds[0];
}
// Scale a frame relative to the specified anchor point
function myScaleFrame(myFrame, myAnchor, myScale) {
  var scales = [];

  //save original scaling
  for (i = 0; i < myFrame.allPageItems.length; ++i) {
    var f = myFrame.allPageItems[i];
    scales.push([f.horizontalScale, f.verticalScale]);
  }

  //scale group
  for (i = 0; i < app.layoutWindows.length; i++) {
    app.layoutWindows.item(i).transformReferencePoint = myAnchor;
  }
  myFrame.horizontalScale = myFrame.verticalScale = myScale;

  //apply scaling only to images
  newScale = myScale / 100;
  for (i = 0; i < myFrame.allPageItems.length; ++i) {
    var f = myFrame.allPageItems[i];
    if (f.constructor.name == 'Image' || f.constructor.name == 'PDF') {
      var h = scales[i][0];
      var v = scales[i][1];
      f.horizontalScale = h * newScale;
      f.verticalScale = v * newScale;
    }
  }
}
// Trim the characters from a file path, starting from the right, through the first "." character
function myTrimName(myFileName) {
  var myString = myFileName.toString();
  var myLastSlash = myString.lastIndexOf('/');
  var myPathName = myString.slice(0, myLastSlash);
  return myPathName;
}
// Redefine object scaling to 100%, keeping the negative/positive relationship to preserve flipping
function myRedefineScaling(myObject) {
  if (myObject.horizontalScale > 0 && myObject.verticalScale > 0) {
    myObject.redefineScaling([1, 1]);
  } else {
    if (myObject.horizontalScale < 0 && myObject.verticalScale > 0) {
      myObject.redefineScaling([-1, 1]);
    } else {
      if (myObject.horizontalScale > 0 && myObject.verticalScale < 0) {
        myObject.redefineScaling([1, -1]);
      } else {
        if (myObject.horizontalScale < 0 && myObject.verticalScale < 0) {
          myObject.redefineScaling([-1, -1]);
        }
      }
    }
  }
}
// Clean the text so it can be used as a valid filename
function myCleanFileName(myText) {
  // Remove anything other than a-z, A-Z, 0-9, space, hyphens, and underscores
  myText = myText.replace(/[^a-z]/gi, '_').toLowerCase();
  // Collapse multiple spaces to a single space
  myText = myText.replace(/ +/g, ' ');
  return myText;
}
// Return the point size of the largest character in a text frame
function myFindLargestChar(myTF) {
  var myMaxSize = 0;
  for (var i = 0; i < myTF.characters.length; i++) {
    if (myTF.characters[i].pointSize > myMaxSize) {
      myMaxSize = myTF.characters[i].pointSize;
    }
  }
  return myMaxSize;
}
// Break links to object styles
function myBreakObjectStyleLinks(myObject) {
  app.select(myObject);
  var BreakObjectStyle = app.menuActions.itemByID(113166);
  try {
    BreakObjectStyle.invoke();
  } catch (err) {}
  app.selection = null;
}
