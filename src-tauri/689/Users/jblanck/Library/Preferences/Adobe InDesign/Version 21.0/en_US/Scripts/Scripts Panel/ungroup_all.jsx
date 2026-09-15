function unGroupAll() {
  if (app.documents.length == 0) {
    alert('Please have an InDesign document open before running this script.');
    return;
  }

  var docRef = app.activeDocument;

  while (docRef.groups.length != 0) {
    docRef.groups.everyItem().ungroup();
  }

  alert('All groups have been ungrouped.');
}

unGroupAll();
