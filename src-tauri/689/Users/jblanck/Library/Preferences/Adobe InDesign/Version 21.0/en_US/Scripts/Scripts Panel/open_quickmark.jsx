//@include 'json_es3.jsx';
var args = arguments[0];
var qmID = args;

function getFolderPath(filePath) {
  var file = new File(filePath);
  return file.parent.fsName;
}

var scriptDir = new File($.fileName).parent;

//read and parse the json
var jsonFile = File(scriptDir + '/quickmarks/' + qmID + '.json');
jsonFile.open('r');
jsonFile.encoding = 'UTF-8';
var text = jsonFile.read();
var quickmark = JSON.parse(text);
jsonFile.close();

var path = quickmark.path;
var id = quickmark.id;

try {
  app.activate();
  app.open(path);
  var doc = app.activeDocument;
  var bookmarkedItem = doc.pageItems.itemByID(id);
  bookmarkedItem.select();
  doc.layoutWindows[0].zoomPercentage = 100;
} catch (e) {
  alert(e);
  alert(
    'Could not locate quickmark. Check to see if the document was renamed.'
  );

  jsonFile.remove();
}
