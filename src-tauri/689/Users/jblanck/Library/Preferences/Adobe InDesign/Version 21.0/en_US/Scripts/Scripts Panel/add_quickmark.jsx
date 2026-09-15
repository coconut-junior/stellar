//@include 'json_es3.jsx';

function getFolderPath(filePath) {
  var file = new File(filePath);
  return file.parent.fsName;
}

var quickmarkID = arguments[0];
var scriptDir = new File($.fileName).parent;
var doc = app.activeDocument;

function main() {
  if (doc.selection[0] == undefined) {
    alert('Please select something before adding a quickmark!');
    return;
  }

  var sel = doc.selection[0];
  var id = sel.id;

  //read and parse the json
  var jsonFile = File(scriptDir + '/quickmarks/' + quickmarkID + '.json');
  jsonFile.open('r');
  jsonFile.encoding = 'UTF-8';
  var json = jsonFile.read();
  jsonFile.close();

  var quickmark = JSON.parse(json);
  quickmark.id = id;
  quickmark.path = doc.fullName.fsName;

  //convert json back to string and save
  json = JSON.stringify(quickmark);
  jsonFile.open('w');
  jsonFile.write(json);
  jsonFile.close();
}

main();
