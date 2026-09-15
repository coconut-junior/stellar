//DESCRIPTION:Build catalog pages from spreadsheet data

// Created 2022-05-16
// Keith Gilbert, Gilbert Consulting
// www.gilbertconsulting.com
// Updated and maintained by Jimmy Blanck www.jbx.design

//2-7-2023 updated to include multiple flyer specs (broad or tab)
//7-22-2024 added new dc to list
//11-24-2024 rewrote functions to automatically add logos

//@include "helpers/xlsx.extendscript.js"
//@include "helpers/formatting.js"
//@include 'json_es3.jsx';

var pathArg, key;
var singleTextFrame = true;
var dcList = ['5050', '5100', '5150', '5200'];
var isTest = false;
var logoDict = undefined;

try {
  pathArg = arguments[0];
  key = arguments[1];
} catch (e) {
  pathArg = undefined;
  key = undefined;
}

//backport startsWith
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function (searchString, position) {
    position = position || 0;
    return this.substr(position, searchString.length) === searchString;
  };
}

//backport replaceall function to es3
String.prototype.replaceAll = function (str1, str2, ignore) {
  return this.replace(
    new RegExp(
      str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g, '\\$&'),
      ignore ? 'gi' : 'g',
    ),
    typeof str2 == 'string' ? str2.replace(/\$/g, '$$$$') : str2,
  );
};

//backport trim() to es3
String.prototype.trim = function () {
  return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
};

var filePrefixLookupTable = {};
var FILENAME_MATCH_PATTERN = /([^\:]+)\.(ai|psd|jpg|png|tif)/i;
var flyerSpecs = '';

var ProgressBar = function (
  /*str*/ title, // by Marc Autret
) {
  var w = new Window('palette', ' ' + title, {
      x: 0,
      y: 0,
      width: 340,
      height: 60,
    }),
    pb = w.add('progressbar', { x: 20, y: 12, width: 300, height: 12 }, 0, 100),
    st = w.add('statictext', { x: 10, y: 36, width: 320, height: 20 }, '');
  st.justify = 'center';
  w.center();
  this.reset = function (msg, maxValue) {
    st.text = msg;
    pb.value = 0;
    pb.maxvalue = maxValue || 0;
    pb.visible = !!maxValue;
    w.show();
  };
  this.hit = function () {
    ++pb.value;
  };
  this.hide = function () {
    w.hide();
  };
  this.close = function () {
    w.close();
  };
};
var pBar = new ProgressBar('Build catalog pages.jsx');

setPreferences();

function setPreferences() {
  var _scriptRedraw = app.scriptPreferences.enableRedraw,
    _userInteraction = app.scriptPreferences.userInteractionLevel;
  _measurementUnit = app.scriptPreferences.measurementUnit;
  _fontChangeLocking = app.fontLockingPreferences.fontChangeLocking;
  app.scriptPreferences.enableRedraw = false;
  app.scriptPreferences.userInteractionLevel =
    UserInteractionLevels.interactWithAll;
  app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
  app.fontLockingPreferences.fontChangeLocking = false;
  // Force this setting permanently on the user's computer
  app.textPreferences.typographersQuotes = true;
  Main();
  app.scriptPreferences.enableRedraw = _scriptRedraw;
  app.scriptPreferences.userInteractionLevel = _userInteraction;
  app.scriptPreferences.measurementUnit = _measurementUnit;
  app.fontLockingPreferences.fontChangeLocking = _fontChangeLocking;
}

function Main() {
  //LOAD TEST FILE IF PRESENT
  var testFile = File('/Users/jblanck/Desktop/testfile.xls');
  if (testFile.exists) {
    alert('Test file detected on desktop, loading items');
    isTest = true;
    key = 1;
    pathArg = '/Users/jblanck/Desktop/testfile.xls';
  }

  if (key == undefined) {
    alert(
      'This automation only works with Stellar. Please open Stellar and launch it from there.',
    );
    return;
  }

  var myResultsArray = myInput();
  if (myResultsArray) {
    var myMonth = Number(myResultsArray[0]);
    var myDay = Number(myResultsArray[1]);
    var myYear = Number(myResultsArray[2]);
    flyerSpecs = myResultsArray[3];
  } else {
    alert('No options were selected.');
    return;
  }
  // Prompt the user to select an xlsx file
  // var myXLSXFile = myGetFile();
  var myXLSXFile = pathArg;

  if (myXLSXFile == '') {
    return;
  }
  var myPath = pathArg.replace(
    pathArg.split('/')[pathArg.split('/').length - 1],
    '',
  );

  var jsonFile = File(myPath + 'logos/assets.json');
  if (jsonFile.exists) {
    jsonFile.open('r');
    jsonFile.encoding = 'UTF-8';
    var text = jsonFile.read();
    logoDict = JSON.parse(text);
    jsonFile.close();
  }

  var workbook = XLSX.readFile(myXLSXFile);

  // Convert the first worksheet (project info) to JSON array of arrays
  var first_sheet_name = workbook.SheetNames[0],
    first_worksheet = workbook.Sheets[first_sheet_name];

  var myData = XLSX.utils.sheet_to_json(first_worksheet, { header: 1 });
  myData.shift(); // Remove the first array element since it is the header
  var myResult = new Array();

  var firstPageName = myData[0][0];

  if (
    firstPageName != '1' &&
    !firstPageName.toLowerCase().startsWith('page 1')
  ) {
    alert(
      "Page names are incorrect.\n\n Please check that page 1 is named '1' or has a name starting with 'Page 1' in Badger",
    );
    exit();
  }

  // Parse and test each record for integrity
  for (var i = 0; i < myData.length; i++) {
    // For each record...
    try {
      myResult[i] = myTestRecord(myData[i]);

      //fix page names that include the word "page"
      if (myResult[i].pageNumber.toString().toLowerCase().startsWith('page ')) {
        myResult[i].pageNumber = myResult[i].pageNumber[5];
      }
    } catch (e) {
      alert('error on entry ' + myData[i]);
      alert(e);
    }
  }

  // Process each record and build pages
  myBuildPages(myPath, myResult, myMonth, myDay, myYear);
  beep();
  alert('Kachow!');
}

// Parse and test a data record for integrity
function myTestRecord(myRecord) {
  var myResult = new Object();
  myResult.pageNumber = '';
  myResult.version = '';
  myResult.headline = '';
  myResult.itemName = '';
  myResult.logo = '';
  myResult.burst = '';
  myResult.percent = '';
  myResult.imageSource = '';
  myResult.itemDesc = '';
  myResult.story = '';
  myResult.price = '';
  myResult.specialNotes = '';
  myResult.ourPriceDollars = '';
  myResult.ourPriceCents = '';
  myResult.theirPriceDollars = '';
  myResult.theirPriceCents = '';
  myResult.myError = '';
  myResult.logoArray = [];
  myResult.pageNumber = myRecord[0]; // Column A
  // Column B
  if (myRecord[1] == 'ALL') {
    myResult.version = dcList;
  } else {
    myResult.version = myRecord[1].split(',');
  }
  myResult.headline = myRecord[2]; // Column C
  myResult.itemName = myRecord[3]; // Column D
  myResult.logo = myRecord[4]; // Column E
  myResult.burst = myRecord[5]; // Column F
  myResult.percent = myResult.burst.match(/\d+\%/);
  if (myResult.percent) {
    myResult.percent = myResult.percent[0].slice(0, -1);
  }
  myResult.imageSource = myRecord[6]; // Column G
  myResult.itemDesc = myRecord[7]; // Column H
  myResult.story = myRecord[8]; // Column I
  myResult.price = myRecord[10]; // Column K
  myResult.specialNotes = myRecord[11]; // Column L
  myResult.sku = myRecord[14]; // Column O
  var myPriceArray = myParsePrice(myResult.price);
  myResult.ourPriceDollars = myPriceArray[0];
  myResult.ourPriceCents = myPriceArray[1];
  myResult.theirPriceDollars = myPriceArray[2];
  myResult.theirPriceCents = myPriceArray[3];
  if (myResult.logo.length > 0) {
    myResult.logoArray = myResult.logo.split(',');
  }
  return myResult;
}
// Instruct the user to choose a file.
function getFile() {
  if (File.fs == 'Macintosh') {
    myFileName = File.openDialog('Select an XLS file', limitFileType, false);
    function limitFileType(currentFile) {
      var strExt = currentFile.fullName
        .toLowerCase()
        .substr(currentFile.fullName.lastIndexOf('.'));
      if (strExt == '.xls' || currentFile instanceof Folder) {
        return true;
      }
    }
  } else {
    myFileName = File.openDialog(
      'Select an XLS file',
      'XLS files:*.xls',
      false,
    );
  }
  return myFileName;
}

// Build pages
function myBuildPages(myPath, myResult, myMonth, myDay, myYear) {
  var templatePath = '/';

  if (flyerSpecs == '2-Page Broad (9x21)') {
    templatePath = '/2pg_broad_9x21/';
  } else if (flyerSpecs == '2-Page Broad (11x21)') {
    templatePath = '/2pg_broad_11x21/';
  } else if (flyerSpecs == '4-Page Broad (9x21)') {
    templatePath = '/4pg_broad_9x21/';
  } else if (flyerSpecs == '4-Page Broad (8.375x21)') {
    templatePath = '/4pg_broad_quad_8.375x21/';
  } else if (flyerSpecs == '8-Page Tab') {
    templatePath = '/tab/';
  }

  // Open the master template and copy the page elements to the clipboard
  var myMainTemplate = File(
    myTrimPath($.fileName) + '/helpers/catalog_template_master.indt',
  );
  var myDoc = app.open(myMainTemplate);
  app.select(SelectAll.ALL);
  app.copy();
  myDoc.close(SaveOptions.no);
  pBar.reset('Building pages...', myResult.length);
  var myPageNum = 1;
  // Create a new doc for page 1

  var myDoc = app.open(
    File(
      myTrimPath($.fileName) +
        '/helpers' +
        templatePath +
        'catalog_template_01.indt',
    ),
  );
  // Do some document setup
  myDocPrep(myDoc);
  var myWednesday = new Date(myYear, myMonth - 1, myDay);
  var myThursday = new Date(myWednesday.setDate(myWednesday.getDate() + 1));

  //wednesday
  myDoc.layers.itemByName('page_1_base_X_X').name =
    'page_1_base_' + myMonth + '_' + myDay;
  var wedItems = myDoc.layers.itemByName(
    'page_1_base_' + myMonth + '_' + myDay,
  ).textFrames;
  for (var i = 0; i < wedItems.length; ++i) {
    if (wedItems[i].paragraphs[0].contents.match('Pg.1')) {
      wedItems[i].paragraphs[0].contents =
        'Pg.1_' + myMonth + '/' + myDay + '_Base';
    }
  }

  //thursday
  thursMonth = myThursday.getMonth() + 1;
  thursDay = myThursday.getDate();
  myDoc.layers.itemByName('page_1_base_XX_XX').name =
    'page_1_base_' + thursMonth + '_' + thursDay;

  var thursItems = myDoc.layers.itemByName(
    'page_1_base_' + thursMonth + '_' + thursDay,
  ).textFrames;
  for (var i = 0; i < thursItems.length; ++i) {
    if (thursItems[i].paragraphs[0].contents.match('Pg.1')) {
      thursItems[i].paragraphs[0].contents =
        'Pg.1_' + thursMonth + '/' + thursDay + '_Base';
    }
  }

  for (var i = 0; i < myResult.length; i++, pBar.hit()) {
    // Iterate through each record
    var myRecord = myResult[i];
    if (Number(myRecord.pageNumber) != myPageNum) {
      // Create a new page
      // Position page items and clean up the previous page
      myCleanUp(myDoc, myPageNum, myMonth, myDay, myYear);
      // Save and close the previous page
      myDoc.save(
        File(
          myPath +
            '/page_' +
            (Number(myRecord.pageNumber) - 1).toString() +
            '.indd',
        ),
      );
      myDoc.close();
      // Create a new doc based on the correct page template based on the page nuymber
      var myDoc = app.open(
        File(
          myTrimPath($.fileName) +
            '/helpers' +
            templatePath +
            'catalog_template_' +
            myPadString(myRecord.pageNumber.toString()) +
            '.indt',
        ),
      );
      // Do some document setup
      myDocPrep(myDoc);
      myPageNum++;
    }
    // Build 1 ad unit
    var myAd = myBuildAdUnit(myDoc, myRecord, myPath);

    // Put the ad on the correct layer
    if (myRecord.version.toString() == dcList) {
      var version = 'cmyk_base';
      myCreateLayer(myDoc, version);
      myAd.move(myDoc.layers.item(version));
    } else {
      for (v = 0; v < myRecord.version.length; ++v) {
        var version = myRecord.version[v];
        myCreateLayer(myDoc, version);
        myAd.duplicate(myDoc.layers.item(version));
      }
      myAd.remove();
    }

    //rewrite this... logic does not work for 4 DCs
    // switch (myRecord.version.length) {
    //   case 1:
    //     var myVersionName = myRecord.version.toString();
    //     myCreateLayer(myDoc, myVersionName);
    //     myAd.move(myDoc.layers.item(myVersionName));
    //     break;
    //   case 2:
    //     //if 5050 5100, copy to both
    //     var myVersionName = myRecord.version[0].toString();
    //     myCreateLayer(myDoc, myVersionName);
    //     myAd.move(myDoc.layers.item(myVersionName));
    //     var myVersionName = myRecord.version[1].toString();
    //     myCreateLayer(myDoc, myVersionName);
    //     myAd.duplicate(myDoc.layers.item(myVersionName));
    //     break;
    //   case 3:
    //     try {
    //       myAd.move(myDoc.layers.item('cmyk_base'));
    //     } catch (error) {
    //       var layerName = 'cmyk_base';
    //       myAd.move(myDoc.layers.item(layerName));
    //     }
    //     break;
    //   default:
    //     break;
    // }
  }
  // Position page items and clean up the last page
  myCleanUp(myDoc, myPageNum, myMonth, myDay, myYear);
  myDoc.save(File(myPath + '/page_' + myRecord.pageNumber + '.indd'));
  myDoc.close();
  pBar.close();
}

function addProductInfoDeprecated(myDoc, myRecord, myPath) {
  var myGroup = myDoc.groups.itemByName('unit_2.3x2.7');
  var myAd = myGroup.duplicate();
  myAd.name = myRecord.itemName;
  myLocateFrame(myAd, 'script_item_head').contents = myRecord.itemName;
  var myDescFrame = myLocateFrame(myAd, 'script_desc');
  var myTheirs = 'theirs';

  // Massage the item description
  if (
    myRecord.itemDesc.match(/certified refurbished/gi) ||
    myRecord.itemDesc.match(/certified remanufactured/gi)
  ) {
    myTheirs = 'theirs new';
  }

  //format copy points
  myRecord.itemDesc = normalizeAbbreviations(myRecord.itemDesc);
  myRecord.itemDesc = myRecord.itemDesc.replaceAll('-', '');
  myRecord.itemDesc = myRecord.itemDesc.replaceAll('*', '');
  //remove leading space
  if (myRecord.itemDesc[0] == ' ') {
    myRecord.itemDesc = myRecord.itemDesc.slice(
      1,
      myRecord.itemDesc.length - 1,
    );
  }
  //remove trailing characters
  myRecord.itemDesc = myRecord.itemDesc.replaceAll('  ', ' ');
  myRecord.itemDesc = myRecord.itemDesc.replaceAll(' \r', '\r');
  myRecord.itemDesc = myRecord.itemDesc.replaceAll('.\r', '\r');
  //remove double return
  myRecord.itemDesc = myRecord.itemDesc.replaceAll('\r\r', '\r');
  if (myRecord.itemDesc[-1] == '.' || myRecord.itemDesc[-1] == ' ') {
    myRecord.itemDesc = myRecord.itemDesc.slice(0, -1);
  }

  //add bullets
  var bullet = new String('\u2022');
  var centSymbol = new String('\u00a2');
  myRecord.itemDesc = myRecord.itemDesc.replaceAll('\n\n', '\n');
  myRecord.itemDesc = bullet + myRecord.itemDesc;
  myRecord.itemDesc = myRecord.itemDesc.replaceAll('\n', '\n' + bullet);

  myDescFrame.contents = myRecord.itemDesc;
  var ourPriceFrame = myLocateFrame(myAd, 'script_our_price');

  if (myRecord.ourPriceDollars != '') {
    // Dollars present
    ourPriceFrame.contents =
      '$' + myRecord.ourPriceDollars + myRecord.ourPriceCents;
  } else {
    ourPriceFrame.contents = myRecord.ourPriceCents + centSymbol;
  }

  var theirPriceFrame = myLocateFrame(myAd, 'script_their_price');
  if (myRecord.theirPriceDollars != '' && myRecord.theirPriceCents != '') {
    // Dollars and cents present
    theirPriceFrame.contents =
      myTheirs +
      ' $' +
      myRecord.theirPriceDollars +
      '.' +
      myRecord.theirPriceCents;
  } else {
    if (myRecord.theirPriceDollars == '' && myRecord.theirPriceCents != '') {
      // Only cents present
      theirPriceFrame.contents =
        myTheirs + ' ' + myRecord.theirPriceCents + centSymbol;
    }
  }

  var versions = myRecord.version;
  if (versions == dcList) {
    versions = 'All';
  }

  var myLabel = '';
  myLabel =
    '<<Versions>>' +
    versions +
    '\n\n' +
    '<<Price>> ' +
    myRecord.price +
    '\n\n' +
    '<<Logo>> ' +
    myRecord.logo +
    '\n\n' +
    '<<Burst>> ' +
    myRecord.burst +
    '\n\n' +
    '<<Image>> ' +
    myRecord.imageSource +
    '\n\n' +
    '<<Notes>> ' +
    myRecord.specialNotes +
    '\n\n';
  myLocateFrame(myAd, 'script_item_head').label = myLabel;

  return myAd;
}

function addProductInfo(myDoc, myRecord, myPath) {
  var myGroup = myDoc.groups.itemByName('script_product_block');
  var overline = 'overline';
  var mainline = myRecord.itemName;
  var copy = myRecord.itemDesc;
  var ourPrice;
  var theirPrice;
  var centSymbol = new String('\u00a2');

  var myAd = myGroup.duplicate();
  myAd.name = myRecord.itemName;
  var price_group = myAd.groups.itemByName('price_group');
  var myProductText = price_group.textFrames.itemByName('script_product_info');
  var buyoutHeader = myDoc.textFrames.itemByName('script_buyout');

  //reformat prices
  if (myRecord.ourPriceDollars != '') {
    // Dollars present
    ourPrice = '$' + myRecord.ourPriceDollars + myRecord.ourPriceCents;
  } else {
    ourPrice = myRecord.ourPriceCents + centSymbol;
  }

  var myTheirs = 'theirs';

  if (
    myRecord.itemDesc.match(/certified refurbished/gi) ||
    myRecord.itemDesc.match(/certified remanufactured/gi)
  ) {
    myTheirs = 'theirs new';
  }

  if (myRecord.theirPriceDollars != '' && myRecord.theirPriceCents != '') {
    // Dollars and cents present
    theirPrice =
      myTheirs +
      ' $' +
      myRecord.theirPriceDollars +
      '.' +
      myRecord.theirPriceCents;
  } else {
    if (myRecord.theirPriceDollars == '' && myRecord.theirPriceCents != '') {
      // Only cents present
      theirPrice = myTheirs + ' ' + myRecord.theirPriceCents + centSymbol;
    }
  }

  var tags = ['<overline>', '<mainline>', '<copy>', '0000', '<tp>'];
  var productInfo = [overline, mainline, copy, ourPrice, theirPrice];

  for (var i = 0; i < productInfo.length; ++i) {
    app.findGrepPreferences = app.changeGrepPreferences = null;
    app.findChangeGrepOptions = NothingEnum.nothing;
    app.findGrepPreferences.findWhat = tags[i];

    try {
      app.changeGrepPreferences.changeTo = productInfo[i];
    } catch (e) {
      app.changeGrepPreferences.changeTo = '?';
    }

    try {
      myProductText.changeGrep();
    } catch (e) {
      try {
        alert(
          "Failed to fill additional product info for '" +
            productInfo[i - 1] +
            "'. The text in this box is overflowing. Please add the info manually afterwards.",
        );
        break;
      } catch (e) {}
    }
  }

  var versions = myRecord.version;
  if (versions == dcList) {
    versions = 'All';
  }

  var myLabel = '';
  myLabel =
    '<<Versions>>' +
    versions +
    '\n\n' +
    '<<Price>> ' +
    myRecord.price +
    '\n\n' +
    '<<Logo>> ' +
    myRecord.logo +
    '\n\n' +
    '<<Burst>> ' +
    myRecord.burst +
    '\n\n' +
    '<<Image>> ' +
    myRecord.imageSource +
    '\n\n' +
    '<<Notes>> ' +
    myRecord.specialNotes +
    '\n\n';
  myAd.label = myLabel;

  return myAd;
}

function cleanString(str) {
  var result = '';
  var i;
  var c;
  var code;

  for (i = 0; i < str.length; i++) {
    c = str.charAt(i);
    code = str.charCodeAt(i);

    // Check if character is a letter (A-Z or a-z)
    if (
      (code >= 65 && code <= 90) || // Uppercase A-Z
      (code >= 97 && code <= 122) || // Lowercase a-z
      // Include international characters
      (code >= 192 && code <= 687) || // Latin, Greek, Cyrillic
      (code >= 880 && code <= 1279) || // Extended characters
      (code >= 7680 && code <= 7935)
    ) {
      // Extended Latin
      result += c;
    }
  }
  return result;
}

// Build a single ad unit
function myBuildAdUnit(myDoc, myRecord, myPath) {
  var myAd;

  if (singleTextFrame) {
    myAd = addProductInfo(myDoc, myRecord, myPath);
  } else {
    myAd = addProductInfoDeprecated(myDoc, myRecord, myPath);
  }

  // Add the logo(s)
  var myOffset = 10;

  if (logoDict) {
    for (var i = 0; i < myRecord.logoArray.length; i++) {
      var brand = myRecord.logoArray[i];
      var logoKeyText = cleanString(brand);
      brandFileName = undefined;
      try {
        brandFileName = logoDict[logoKeyText]['logo'];
      } catch (e) {}

      if (brand && brandFileName) {
        // Locate the corresponding logo file
        var myFile = myPath + '/logos/' + brandFileName;
        var myLogoFrameMaster = myLocateFrame(myAd, 'script_logo');
        var myLogoFrame = myLogoFrameMaster.duplicate();
        addItemsToGroup(/*Group*/ myAd, /*PageItem|PageItem[]*/ myLogoFrame);
        myLogoFrame.name = 'script_logo_' + (i + 1);
        myLogoFrame.geometricBounds = [
          myLogoFrameMaster.geometricBounds[0] + myOffset * i,
          myLogoFrameMaster.geometricBounds[1] + myOffset * i,
          myLogoFrameMaster.geometricBounds[2] + myOffset * i,
          myLogoFrameMaster.geometricBounds[3] + myOffset * i,
        ];
        if (!myFile || myFile.length == 0) {
          // The image file could not be located
          var myTextFrame = myAd.textFrames.add();
          myTextFrame.name = 'script_logo_required';
          myTextFrame.geometricBounds = myLogoFrame.geometricBounds;
          myLogoFrame.remove();
          myTextFrame.contents =
            'Logo required:\n' +
            myRemoveStartEndSpaces(myRecord.logoArray[i]).toLowerCase();
          myTextFrame.paragraphs[0].justification = Justification.centerAlign;
          var myUnnamedColor = app.activeDocument.colors[-1].duplicate();
          myUnnamedColor.properties = { colorValue: [0, 0, 100, 0] };
          myTextFrame.fillColor = myUnnamedColor;
          myTextFrame.fillTint = 100;
          myTextFrame.textFramePreferences.verticalJustification =
            VerticalJustification.CENTER_ALIGN;
          myTextFrame.textFramePreferences.insetSpacing = 5;
        } else {
          try {
            myLogoFrame.place(File(myFile));
            myLogoFrame.fit(FitOptions.PROPORTIONALLY);
          } catch (e) {
            alert(e);
          }
        }
      }
    }
  }

  var myLogoFrameMaster = myLocateFrame(myAd, 'script_logo');
  if (myLogoFrameMaster) {
    myLogoFrameMaster.remove();
  }
  // Build and populate the headline frame
  if (myRecord.headline != '') {
    var myHeadlineFrameTemp = myDoc.textFrames.itemByName(
      'script_buyout_template',
    );
    var myHeadlineFrame = myHeadlineFrameTemp.duplicate();
    myHeadlineFrame.contents = myRecord.headline;
    myHeadlineFrame.name = 'script_headline';
    myHeadlineFrame.geometricBounds = [
      myHeadlineFrame.geometricBounds[0],
      myHeadlineFrame.geometricBounds[1],
      36,
      1800,
    ];
    myHeadlineFrame.paragraphs.everyItem().justification =
      Justification.leftAlign;
    var myRightEdge = myHeadlineFrame.insertionPoints[-1].endHorizontalOffset;
    myHeadlineFrame.geometricBounds = [
      myHeadlineFrame.geometricBounds[0],
      myHeadlineFrame.geometricBounds[1],
      myHeadlineFrame.geometricBounds[2],
      myRightEdge + 35,
    ];
    myHeadlineFrame.paragraphs.everyItem().justification =
      Justification.centerAlign;
    // Add metadata to the headline frame
    myHeadlineFrame.label = myRecord.itemName;
    try {
      myHeadlineFrame.move(myDoc.layers.item('cmyk_base'));
    } catch (error) {
      var layerName =
        'page_' + Number(myRecord.pageNumber).toString() + '_cmyk_base';
      myHeadlineFrame.move(myDoc.layers.item(layerName));
    }
  }
  // Build and populate Whats the Story
  if (myRecord.story != '') {
    var myStoryTemplateFrame = myDoc.groups.itemByName('script_story_template');
    var myStoryFrame = myStoryTemplateFrame.duplicate();
    myStoryFrame.name = 'script_story';

    //text inside story group
    var storyText = myStoryFrame.textFrames.itemByName('script_story_text');
    storyText.paragraphs[0].contents = myRecord.story;

    // Add metadata to the Whats the story frame
    myStoryFrame.label = myRecord.itemName;
    try {
      myStoryFrame.move(myDoc.layers.item('cmyk_base'));
    } catch (error) {
      var layerName =
        'page_' + Number(myRecord.pageNumber).toString() + '_cmyk_base';
      myStoryFrame.move(myDoc.layers.item(layerName));
    }
  }
  // Build and populate the Burst and Flag
  if (myRecord.burst != '') {
    if (myRecord.percent) {
      // Burst is a percent off
      var myPercentBurstTemplateGroup = myDoc.groups.itemByName(
        'script_burst_flag_template',
      );
      var myPercentBurstGroup = myPercentBurstTemplateGroup.duplicate();
      myPercentBurstGroup.name = 'script_burst_flag_template';
      var myPercentTF = myPercentBurstGroup.textFrames.itemByName(
        'script_burst_text_frame',
      );
      myPercentTF.paragraphs[0].contents = myRecord.percent;
      myPercentBurstGroup.label = myRecord.itemName;
      try {
        myPercentBurstGroup.move(myDoc.layers.item('cmyk_base'));
      } catch (error) {
        var layerName =
          'page_' + Number(myRecord.pageNumber).toString() + '_cmyk_base';
        myPercentBurstGroup.move(myDoc.layers.item(layerName));
      }
    } else {
      var myBurstFlagTemplateGroup = myDoc.groups.itemByName(
        'script_burst_flag_template',
      );
      var myBurstFlagGroup = myBurstFlagTemplateGroup.duplicate();
      myBurstFlagGroup.name = 'script_burst_flag';
      var myBurstTF = myBurstFlagGroup.textFrames.itemByName(
        'script_burst_text_frame',
      );
      myBurstTF.contents = myRecord.burst;
      myShrinkTextToFitFrame(myBurstTF, 0.9286);
      // Add metadata to the Burst frame
      myBurstFlagGroup.label = myRecord.itemName;
      try {
        myBurstFlagGroup.move(myDoc.layers.item('cmyk_base'));
      } catch (error) {
        var layerName =
          'page_' + Number(myRecord.pageNumber).toString() + '_cmyk_base';
        myBurstFlagGroup.move(myDoc.layers.item(layerName));
      }
    }
  }

  return myAd;
}
// Locate the frame in the group with the specified name
function myLocateFrame(myGroup, myName) {
  var myObjectsArray = myGroup.pageItems;
  for (var i = 0; i < myObjectsArray.length; i++) {
    var myObject = myObjectsArray[i];
    if (myObject.name == myName) {
      return myObject;
    }
  }
  return false;
}
// Position page items and clean up the document
function myCleanUp(myDoc, myPageNum, myMonth, myDay, myYear) {
  // Line break characters
  myGrepFC(
    myDoc,
    '\n',
    '\r',
    NothingEnum.NOTHING,
    NothingEnum.NOTHING,
    NothingEnum.NOTHING,
    NothingEnum.NOTHING,
  );
  // Remove manual bullets
  //myGrepFC(myDoc,"^~8\\s*","",NothingEnum.NOTHING,NothingEnum.NOTHING,NothingEnum.NOTHING,NothingEnum.NOTHING);
  // Two or more returns
  myGrepFC(
    myDoc,
    '~b~b+',
    '\r',
    NothingEnum.NOTHING,
    NothingEnum.NOTHING,
    NothingEnum.NOTHING,
    NothingEnum.NOTHING,
  );
  // Single left quote to Single right quote (assume there are never paired single quotes)
  myGrepFC(
    myDoc,
    '~[',
    '~]',
    NothingEnum.NOTHING,
    NothingEnum.NOTHING,
    NothingEnum.NOTHING,
    NothingEnum.NOTHING,
  );
  // Return at end of story
  myGrepFC(
    myDoc,
    '\\Z~b',
    '',
    NothingEnum.NOTHING,
    NothingEnum.NOTHING,
    NothingEnum.NOTHING,
    NothingEnum.NOTHING,
  );
  // Remove duplicate headline frames and copy the metadata from each duplicate into the remaining frame
  var myPage = myDoc.pages[0];
  var myTFs = myPage.textFrames;
  for (var i = myTFs.length - 1; i >= 0; i--) {
    if (myTFs[i].name == 'script_headline') {
      var myHeadlineText = myTFs[i].contents;
      for (var j = myTFs.length - 1; j > i; j--) {
        if (myTFs[j].contents == myHeadlineText) {
          myTFs[i].label = myTFs[j].label + '\r' + myTFs[i].label;
          myTFs[j].remove();
        }
      }
    }
  }
  // Position the headline frames on the right edge of the page
  var myBottomEdge = 13;
  var myTFs = myPage.textFrames;
  var myItemCount = 0;
  for (var i = myTFs.length - 1; i >= 0; i--) {
    if (myTFs[i].name == 'script_headline') {
      myTFs[i].move([739, 18 + myItemCount * 36]);
      myItemCount++;
      try {
        myBottomEdge = myTFs[i].geometricBounds[2];
      } catch (e) {}
    } else if (myTFs[i].name == 'script_story') {
      var myStoryText = myTFs[i].contents;
      for (var j = myTFs.length - 1; j > i; j--) {
        if (myTFs[j].contents == myStoryText) {
          myTFs[i].label = myTFs[i].label + '\r' + myTFs[j].label;
          myTFs[j].remove();
        }
      }
      myTFs[i].move([739, myBottomEdge + 5]);
      try {
        myBottomEdge = myTFs[i].geometricBounds[2];
      } catch (e) {}
    }
  }

  // Position the bursts and flags on the right edge of the page
  var myGroups = myDoc.groups;
  for (var i = 0; i < myGroups.length; i++) {
    if (myGroups[i].name == 'script_burst_flag') {
      myGroups[i].move([739, myBottomEdge + 5]);
      myBottomEdge = myGroups[i].geometricBounds[2];
    }
  }
  // Position the percent off bursts on the right edge of the page
  var myGroups = myDoc.groups;
  for (var i = 0; i < myGroups.length; i++) {
    if (myGroups[i].name == 'script_percent_burst') {
      myGroups[i].move([739, myBottomEdge + 5]);
      myBottomEdge = myGroups[i].geometricBounds[2];
    }
  }
  // Remove the template frames
  myDoc.groups.item('unit_2.3x2.7').remove();
  myDoc.groups.item('script_product_block').remove();

  myDoc.groups.item('script_story_template').remove();
  myDoc.groups.item('script_burst_flag_template').remove();
  myDoc.textFrames.item('script_buyout_template').remove();
  myDoc.groups.item('script_percent_burst_template').remove();

  //Product block offset (in pixels)
  var myVOffset = 120;
  var myHOffset = 214;
  var myStartX = 0;
  var myStartY = 0;
  var myNumColumns = 5;

  switch (myPageNum) {
    case 1:
      // Do something

      // Add the dates
      app.findTextPreferences = app.changeTextPreferences = null;
      app.findChangeTextOptions.includeLockedLayersForFind = false;
      app.findChangeTextOptions.includeLockedStoriesForFind = false;
      app.findChangeTextOptions.includeHiddenLayers = true;
      app.findChangeTextOptions.includeMasterPages = false;
      app.findChangeTextOptions.includeFootnotes = false;
      app.findChangeTextOptions.caseSensitive = false;
      app.findChangeTextOptions.wholeWord = false;
      app.findTextPreferences.findWhat = 'WEDNESDAY, MONTH D';
      app.changeTextPreferences.changeTo =
        'WEDNESDAY, ' + myConvertMonths(myMonth) + ' ' + myDay;
      var myFound = myDoc.changeText();
      app.findTextPreferences.findWhat = 'WEDNESDAY M/D';
      app.changeTextPreferences.changeTo = myMonth + '/' + myDay;
      var myFound = myDoc.changeText();
      // Increment the date by one day
      var myWednesday = new Date(myYear, myMonth - 1, myDay);
      var myThursday = new Date(myWednesday.setDate(myWednesday.getDate() + 1));
      myMonth = myThursday.getMonth() + 1;
      myDay = myThursday.getDate();
      app.findTextPreferences.findWhat = 'THURSDAY, MONTH D';
      app.changeTextPreferences.changeTo =
        'THURSDAY, ' + myConvertMonths(myMonth) + ' ' + myDay;
      var myFound = myDoc.changeText();
      app.findTextPreferences.findWhat = 'THURSDAY M/D';
      app.changeTextPreferences.changeTo = myMonth + '/' + myDay;
      var myFound = myDoc.changeText();
      app.findTextPreferences = app.changeTextPreferences = null;
      break;
    case 2: // Pages 2, 4, 5, and 7 use the same template
    case 4:
    case 5:
    case 7:
      break;
    case 3: // Pages 3 and 6 use the same template
    case 6:
      break;
    case 8:
      // Add the copyright
      app.findTextPreferences = app.changeTextPreferences = null;
      app.findChangeTextOptions.includeLockedLayersForFind = false;
      app.findChangeTextOptions.includeLockedStoriesForFind = false;
      app.findChangeTextOptions.includeHiddenLayers = true;
      app.findChangeTextOptions.includeMasterPages = false;
      app.findChangeTextOptions.includeFootnotes = false;
      app.findChangeTextOptions.caseSensitive = false;
      app.findChangeTextOptions.wholeWord = false;
      app.findTextPreferences.findWhat = '<<copyright>>';
      app.changeTextPreferences.changeTo = myYear.toString();
      var myFound = myDoc.changeText();
      break;
    default:
      break;
  }
  // Position the ads on the page
  var myAdCount = 0;
  for (var i = myDoc.layers.length - 1; i >= 0; i--) {
    var myLayer = myDoc.layers[i];
    for (var j = 0; j < myLayer.groups.length; j++) {
      if (
        myLayer.groups[j].name != 'script_burst_flag' &&
        !myLayer.groups[j].locked &&
        myLayer.groups[j].name != 'script_percent_burst'
      ) {
        var myAd = myLayer.groups[j];
        try {
          myAd.move([
            myStartX + (myAdCount % myNumColumns) * myHOffset,
            myStartY + Math.floor(myAdCount / myNumColumns) * myVOffset,
          ]);
        } catch (error) {}
        myAdCount++;
      }
    }
  }

  // Change all the description paragraphs to sentence case
  for (var i = 0; i < myTFs.length; i++) {
    if (myTFs[i].name == 'script_desc') {
      for (var j = 0; j < myTFs[i].paragraphs.length; j++) {
        var myParagraph = myTFs[i].paragraphs[j];
        myParagraph.contents = myParagraph.contents.toLowerCase();
        myParagraph.characters[0].contents =
          myParagraph.characters[0].contents.toUpperCase();
      }
    }
  }
  // Set view preferences
  app.activeWindow.screenMode = ScreenModeOptions.PREVIEW_OFF;
  app.activeWindow.overprintPreview = false;
  myDoc.viewPreferences.showFrameEdges = false;
  myDoc.textPreferences.showInvisibles = false;
  app.activeWindow.zoom(ZoomOptions.FIT_PAGE);
}
// A grep find and change function (document)
function myGrepFC(
  myDoc,
  find,
  change,
  findCharStyle,
  findParaStyle,
  changeCharStyle,
  changeParaStyle,
) {
  app.findGrepPreferences = app.changeGrepPreferences = null;
  app.findChangeGrepOptions.includeFootnotes = false;
  app.findChangeGrepOptions.includeHiddenLayers = false;
  app.findChangeGrepOptions.includeLockedLayersForFind = false;
  app.findChangeGrepOptions.includeLockedStoriesForFind = false;
  app.findChangeGrepOptions.includeMasterPages = false;
  app.findChangeGrepOptions.searchBackwards = false;
  app.findGrepPreferences.appliedCharacterStyle = findCharStyle;
  app.findGrepPreferences.appliedParagraphStyle = findParaStyle;
  app.changeGrepPreferences.appliedCharacterStyle = changeCharStyle;
  app.changeGrepPreferences.appliedParagraphStyle = changeParaStyle;
  app.findGrepPreferences.findWhat = find;
  app.changeGrepPreferences.changeTo = change;
  myDoc.changeGrep(true);
}
// Parse out the information in the Price spreadsheet column
function myParsePrice(myPrice) {
  var ourPriceDollars =
    (OurPriceCents =
    theirPriceDollars =
    theirPriceCents =
      '');
  var ourPrice = myPrice.match(/our price:\s*\d*\.{0,1}\d*/i);
  if (ourPrice) {
    ourPrice = ourPrice[0].replace(/our price:\s*/i, ''); // Remove "our price"
    var ourPriceDollars = ourPrice.replace(/\.\d*/i, '');
    if (ourPriceDollars == '0' || ourPriceDollars == '00') {
      ourPriceDollars = '';
    }
    var ourPriceCents = ourPrice.replace(/\d*\./i, '');
    if (ourPriceCents == '0') {
      ourPriceCents = '00';
    }
  } else {
    // No our price information exists
    var ourPriceDollars = (ourPriceCents = '');
  }
  var theirPrice = myPrice.match(/their price:\s*\d*\.{0,1}\d*/i);
  if (theirPrice) {
    theirPrice = theirPrice[0].replace(/their price:\s*/i, ''); // Remove "their price"
    var theirPriceDollars = theirPrice.replace(/\.\d*/i, '');
    if (theirPriceDollars == '0' || theirPriceDollars == '00') {
      theirPriceDollars = '';
    }
    var theirPriceCents = theirPrice.replace(/\d*\./i, '');
    if (theirPriceCents == '0') {
      theirPriceCents = '00';
    }
  } else {
    // No their price information exists
    var theirPriceDollars = (theirPriceCents = '');
  }

  return [ourPriceDollars, ourPriceCents, theirPriceDollars, theirPriceCents];
}
// Trim the characters from a file path, starting from the right, through the first "/" character
function myTrimPath(myLongPath) {
  var myString = myLongPath.toString();
  var myLastSlash = myString.lastIndexOf('/');
  var myPathName = myString.slice(0, myLastSlash);
  return myPathName;
}
// Repeatedly shrink text paragraphs by .1 points until the text is no longer overset
function myShrinkTextToFitFrame(myTextFrame, myLeading) {
  do {
    myTextFrame.paragraphs[0].pointSize =
      myTextFrame.paragraphs[0].pointSize - 0.1;
    myTextFrame.paragraphs[0].leading =
      myTextFrame.paragraphs[0].pointSize * myLeading;
  } while (myTextFrame.overflows == true);
}
// Create a layer if it doesn't already exist
function myCreateLayer(myDoc, myLayerName) {
  var myInDesignUIColorArray = [
    'red',
    'lightBlue',
    'green',
    'orange',
    'gray',
    'blue',
    'yellow',
    'magenta',
    'cyan',
    'black',
    'darkGreen',
    'teal',
    'tan',
    'brown',
    'violet',
    'gold',
    'darkBlue',
    'pink',
    'lavender',
    'brickRed',
    'oliveGreen',
    'peach',
    'burgundy',
    'grassGreen',
    'ochre',
    'purple',
    'lightGray',
    'charcoal',
    'gridBlue',
    'gridOrange',
    'fiesta',
    'lightOlive',
    'lipstick',
    'cuteTeal',
    'sulphur',
    'gridGreen',
    'white',
  ];
  var myNumLayers = myDoc.layers.length;
  try {
    myDoc.layers.add({
      name: myLayerName,
      layerColor: eval('UIColors.' + myInDesignUIColorArray[myNumLayers]),
    });
  } catch (myError) {
    // The layer already exists
    myDoc.activeLayer = myDoc.layers.item(myLayerName);
    myDoc.activeLayer.layerColor = eval(
      'UIColors.' + myInDesignUIColorArray[myNumLayers],
    );
  }
}

function myDocPrep(myDoc) {
  // Set some defaults in case they have been changed accidentally
  myDoc.zeroPoint = [0, 0];
  myDoc.viewPreferences.rulerOrigin = RulerOrigin.PAGE_ORIGIN;
  myDoc.viewPreferences.horizontalMeasurementUnits = MeasurementUnits.inches;
  myDoc.viewPreferences.verticalMeasurementUnits = MeasurementUnits.inches;
  myDoc.pasteboardPreferences.pasteboardMargins = [1000, 1000];
  // Import paragraph, character, and object styles from the master template
  myDoc.importStyles(
    ImportFormat.textStylesFormat,
    File(myTrimPath($.fileName) + '/helpers/catalog_template_master.indt'),
    GlobalClashResolutionStrategy.loadAllWithOverwrite,
  );
  myDoc.importStyles(
    ImportFormat.objectStylesFormat,
    File(myTrimPath($.fileName) + '/helpers/catalog_template_master.indt'),
    GlobalClashResolutionStrategy.loadAllWithOverwrite,
  );
  // Paste template items from the master template
  app.selection = null;
  app.selection = myDoc.pageItems[0];
  app.activate();
  app.paste();
}
// Pad a number to two digits with a leading zero if necessary
function myPadString(myString) {
  if (myString.length == 1) {
    myString = '0' + myString;
  }
  return myString;
}
// Display a dialog
function myInput() {
  // MYWINDOW
  // ========
  var myWindow = new Window('dialog');
  myWindow.text = 'Build Flyer';
  myWindow.orientation = 'column';
  myWindow.alignChildren = ['right', 'top'];
  myWindow.spacing = 10;
  myWindow.margins = 16;

  // GROUP1
  // ======
  var group1 = myWindow.add('group', undefined, { name: 'group1' });
  group1.orientation = 'column';
  group1.alignChildren = ['fill', 'center'];
  group1.spacing = 10;
  group1.margins = [0, 10, 0, 0];

  // PANEL1
  // ======
  var panel1 = group1.add('panel', undefined, undefined, { name: 'panel1' });
  panel1.text = 'Select a Wednesday date';
  panel1.orientation = 'column';
  panel1.alignChildren = ['left', 'center'];
  panel1.spacing = 10;
  panel1.margins = 10;

  // GROUP2
  // ======
  var group2 = panel1.add('group', undefined, { name: 'group2' });
  group2.orientation = 'row';
  group2.alignChildren = ['left', 'center'];
  group2.spacing = 10;
  group2.margins = 6;

  var statictext1 = group2.add('statictext', undefined, undefined, {
    name: 'statictext1',
  });
  statictext1.text = 'Month:';

  var myMonth_array = [
    '',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12',
  ];
  var myMonth = group2.add('dropdownlist', undefined, undefined, {
    name: 'myMonth',
    items: myMonth_array,
  });
  myMonth.selection = 0;

  var statictext2 = group2.add('statictext', undefined, undefined, {
    name: 'statictext2',
  });
  statictext2.text = 'Day:';

  var myDay_array = [
    '',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '22',
    '23',
    '24',
    '25',
    '26',
    '27',
    '28',
    '29',
    '30',
    '31',
  ];
  var myDay = group2.add('dropdownlist', undefined, undefined, {
    name: 'myDay',
    items: myDay_array,
  });
  myDay.selection = 0;

  var statictext3 = group2.add('statictext', undefined, undefined, {
    name: 'statictext3',
  });
  statictext3.text = 'Year:';

  var myYear_array = [
    '',
    '2021',
    '2022',
    '2023',
    '2024',
    '2025',
    '2026',
    '2027',
    '2028',
    '2029',
    '2030',
    '2031',
  ];
  var myYear = group2.add('dropdownlist', undefined, undefined, {
    name: 'myYear',
    items: myYear_array,
  });
  myYear.selection = 0;
  try {
    var d = new Date();
    var year = d.getFullYear();
    myYear.selection = myYear_array.indexOf(year.toString());
  } catch (e) {}

  // flyer specs
  // ======

  var panel2 = group1.add('panel', undefined, undefined, { name: 'panel2' });
  panel2.text = 'Flyer Specs';
  panel2.orientation = 'column';
  panel2.alignChildren = ['left', 'center'];
  panel2.spacing = 10;
  panel2.margins = 10;

  var group3 = panel2.add('group', undefined, { name: 'group3' });
  group3.orientation = 'row';
  group3.alignChildren = ['fill', 'center'];
  group3.spacing = 10;
  group3.margins = [0, 0, 0, 0];

  //action buttons
  var group4 = myWindow.add('group', undefined, { name: 'group4' });
  group4.orientation = 'row';
  group4.alignChildren = ['right', 'center'];
  group4.spacing = 10;
  group4.margins = 1;

  var staticText4 = group3.add('statictext', undefined, undefined, {
    name: 'statictext4',
  });
  staticText4.text = 'Size:';
  var flyerType = group3.add('dropdownlist', undefined, undefined, {
    name: 'flyerType',
    items: [
      '2-Page Broad (9x21)',
      '2-Page Broad (11x21)',
      '4-Page Broad (9x21)',
      '4-Page Broad (8.375x21)',
      '8-Page Tab',
    ],
  });
  flyerType.selection = 0;

  var singleTextFrameCheck = group3.add(
    'checkbox',
    undefined,
    'Single text frame product blocks',
  );
  singleTextFrameCheck.value = true;

  var cancel = group4.add('button', undefined, undefined, { name: 'cancel' });
  cancel.text = 'Cancel';
  cancel.preferredSize.width = 69;

  var ok = group4.add('button', undefined, undefined, { name: 'ok' });
  ok.text = 'OK';
  ok.preferredSize.width = 69;

  /*
		End ScriptUI Dialog Builder code
	*/

  if (myWindow.show() == 1) {
    singleTextFrame = singleTextFrameCheck.value;
    return [
      myMonth.selection.text,
      myDay.selection.text,
      myYear.selection.text,
      flyerType.selection.text,
    ];
  } else {
    return false;
  }
}
// Convert a numeric month to a full month name
function myConvertMonths(myMonthNumber) {
  switch (myMonthNumber) {
    case 1:
      return 'January';
      break;
    case 2:
      return 'February';
      break;
    case 3:
      return 'March';
      break;
    case 4:
      return 'April';
      break;
    case 5:
      return 'May';
      break;
    case 6:
      return 'June';
      break;
    case 7:
      return 'July';
      break;
    case 8:
      return 'August';
      break;
    case 9:
      return 'September';
      break;
    case 10:
      return 'October';
      break;
    case 11:
      return 'November';
      break;
    case 12:
      return 'December';
      break;
    default:
      break;
  }
}
// Build a lookup table of all the file and folder names
function buildFilePrefixLookupTable(theFolder, theLookupTable) {
  var foldersOrFiles = theFolder.getFiles('*');
  for (var idx = 0; idx < foldersOrFiles.length; idx++) {
    var folderOrFile = foldersOrFiles[idx];
    if (folderOrFile instanceof Folder) {
      buildFilePrefixLookupTable(folderOrFile, theLookupTable);
    } else {
      var fileName = decodeURI(folderOrFile.name);
      // Check if located file matches our file naming criteria
      var match = fileName.match(FILENAME_MATCH_PATTERN);
      if (match) {
        var fileNamePrefix = match[1].toLowerCase();
        var files = theLookupTable[fileNamePrefix];
        if (!files) {
          files = [];
          theLookupTable[fileNamePrefix] = files;
        }
        files.push(folderOrFile);
      }
    }
  }
}
// Add page items to an existing group
function addItemsToGroup(/*Group*/ grp, /*PageItem|PageItem[]*/ items) {
  // --------------------------------
  // by Marc Autret. Based on Uwe Laubender's brilliant trick at forums.adobe.com/message/11220608#11220608
  // Use `State.releaseAsObject()` instead, which preserves the original Group specifier.
  // Backup the name of the Group.
  var gName = grp.name;
  // Create a MSO and convert `grp` into a new state.
  var mso = grp.parent.multiStateObjects.add();
  mso.addItemsAsState([grp]);
  var sta = mso.states.lastItem();
  // Inject `item` in the state.
  sta.addItemsToState(items instanceof Array ? items : [items]);
  // Release the state "as object".
  // -> The `grp` specifier is fully restored (except for the name.)
  sta.releaseAsObject();
  mso.remove();
  grp.name = gName;
}
// Remove leading and trailing spaces from a string, if they exist
function myRemoveStartEndSpaces(myString) {
  myString = myString.replace(/\s+/g, '');
  return myString;
}
