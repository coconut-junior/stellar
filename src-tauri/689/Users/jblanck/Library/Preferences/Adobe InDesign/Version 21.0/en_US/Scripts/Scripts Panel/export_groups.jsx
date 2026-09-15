//backport replaceall function to es3
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    if (search instanceof RegExp) {
      if (!search.global) {
        throw new TypeError('replaceAll() must be called with a global RegExp');
      }
      return target.replace(search, replacement);
    } else {
      if (search === '') {
        // Handle empty string case
        return (
          replacement + target.split(search).join(replacement) + replacement
        );
      } else {
        if (typeof replacement === 'function') {
          var match;
          var result = '';
          var index = 0;
          while ((match = target.indexOf(search, index)) !== -1) {
            result +=
              target.slice(index, match) +
              replacement.call(undefined, search, match, target);
            index = match + search.length;
          }
          result += target.slice(index);
          return result;
        } else {
          return target.split(search).join(replacement);
        }
      }
    }
  };
}

app.jpegExportPreferences.exportResolution = 72;
app.jpegExportPreferences.jpegQuality = JPEGOptionsQuality.LOW;

var doc = app.activeDocument;
var groups = doc.groups;
var path = doc.fullName.fsName.replace(
  doc.fullName.fsName.split('/')[doc.fullName.fsName.split('/').length - 1],
  ''
);
var imgPath = Folder(path + '/images');

if (doc.saved) {
  if (!imgPath.exists) {
    imgPath.create();
  }
  exportAll();
} else {
  alert('Please save your document first!');
}

function exportAll() {
  for (var i = 0; i < groups.length; ++i) {
    var g = groups[i];
    var fileName = undefined;
    var items = g.allPageItems; //get all items and items inside subgroups

    for (var j = 0; j < items.length; ++j) {
      var item = items[j];

      if (item.constructor.name == 'TextFrame') {
        var t = item;
        for (var k = 0; k < t.paragraphs.length; ++k) {
          var para = t.paragraphs[k];
          if (para.appliedParagraphStyle.name.match('mainline')) {
            fileName = para.contents
              .toLowerCase()
              .replace(/([^0-9a-z])/gi, '_');
            fileName = fileName.replaceAll('__', '_').replaceAll('__', '_');
          }
        }
      }
    }

    if (fileName == undefined) {
      fileName = 'group_' + i;
    }

    if (fileName.length > 24) {
      fileName = fileName.slice(0, 24);
    }
    if (fileName.slice(-1) == '_') {
      fileName = fileName.slice(0, -1);
    }
    g.exportFile(
      (format = ExportFormat.JPG),
      (to = path + '/images/' + fileName + '.jpg')
    );
  }
  alert('Complete! \nYour images can be found in ' + path + '/images');
}
