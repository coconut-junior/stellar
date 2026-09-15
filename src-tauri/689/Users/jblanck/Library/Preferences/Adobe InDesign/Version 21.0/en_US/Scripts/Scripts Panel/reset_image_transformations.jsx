var doc = app.activeDocument;
var sel = doc.selection;

if (sel.length == 0)
  alert('Please select at least one image before running this script.');

for (var i = 0; i < sel.length; ++i) {
  var obj = sel[i];
  if (obj.constructor.name == 'Rectangle') {
    try {
      var g = obj.allGraphics[0];
      g.clearTransformations();
      g.fit(FitOptions.PROPORTIONALLY);
      g.fit(FitOptions.FRAME_TO_CONTENT);
    } catch (e) {}
  }
}
