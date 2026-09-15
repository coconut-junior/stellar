var gSettings = new Object();
var currentSettingsFile = File(File($.fileName).path + '/export_layers.ini');
currentSettingsFile.hidden = true;

function exportLayersIndividually() {
  var doc = app.activeDocument;
  var myPDFExportPreset = app.pdfExportPresets.item('[High Quality Print]');

  // Create dialog window
  // Increase the height (last value) from 250 to, for example, 300
  var win = new Window('dialog', 'Export Layers');
  win.alignChildren = 'left';

  var g1 = win.add('group');

  // Format selection dropdown
  g1.add('statictext', undefined, 'Export Format:');
  var formatDropdown = g1.add('dropdownlist', undefined);
  formatDropdown.add('item', 'PDF');
  formatDropdown.add('item', 'JPG');
  formatDropdown.selection = 0;

  var dimensionsCheckbox = win.add(
    'checkbox',
    undefined,
    'Include dimensions in filename',
  );

  // Locked layers option
  var lockedCheckbox = win.add(
    'checkbox',
    undefined,
    'Change visibility of locked layers',
  );

  if (currentSettingsFile.exists) {
    currentSettingsFile.open('r');
    gSettings = eval(currentSettingsFile.read());
    currentSettingsFile.close();
  }
  if (gSettings.includeDimensions) {
    dimensionsCheckbox.value = gSettings.includeDimensions;
  }
  if (gSettings.lockedLayers) {
    lockedCheckbox.value = gSettings.lockedLayers;
  }

  var g2 = win.add('group');

  // Folder selection
  g2.add('statictext', undefined, 'Export Folder:');
  try {
    var pathText = g2.add(
      'edittext',
      [150, 50, 350, 75],
      doc.filePath ? doc.filePath.absoluteURI : Folder.desktop.absoluteURI,
    );
  } catch (e) {
    alert('Please save your document first, then run the script again');
    exit();
  }

  pathText.enabled = false;
  var browseButton = g2.add('button', undefined, 'Browse...');

  var buttonGroup = win.add('group');
  buttonGroup.orientation = 'row';
  buttonGroup.alignChildren = 'center';

  // Dialog buttons
  var okButton = buttonGroup.add('button', [150, 140, 250, 170], 'OK');
  var cancelButton = buttonGroup.add('button', [260, 140, 360, 170], 'Cancel');

  // Handle folder selection
  browseButton.onClick = function () {
    var folder = Folder.selectDialog('Select Export Folder');
    if (folder) pathText.text = folder.absoluteURI;
  };

  // Show dialog and wait for user input
  win.center();
  if (win.show() === 1) {
    win.close();

    //write config
    gSettings.lockedLayers = lockedCheckbox.value;
    gSettings.includeDimensions = dimensionsCheckbox.value;
    currentSettingsFile.open('w');
    currentSettingsFile.write(gSettings.toSource());
    currentSettingsFile.close();

    var progressDlg = new Window('palette', 'Progress', undefined, {
      closeButton: false,
    });
    var status = progressDlg.add('statictext');
    status.preferredSize = [400, -1];
    var pb = progressDlg.add('progressbar', undefined, 0, 100);
    pb.preferredSize = [400, -1];
    pb.maxvalue = doc.layers.length;
    progressDlg.show();

    var exportFormat = formatDropdown.selection.text.toUpperCase();
    var folderPath = new Folder(
      decodeURI(pathText.text.replace('file://', '')),
    );
    var changeLockedVisibility = lockedCheckbox.value;

    // Save original layer states
    var originalVisibility = [];
    var originalLocked = [];
    for (var i = 0; i < doc.layers.length; i++) {
      originalVisibility[i] = doc.layers[i].visible;
      originalLocked[i] = doc.layers[i].locked;
    }

    // Create export folder if needed
    if (!folderPath.exists) folderPath.create();

    //Format text to append
    var appendText = '';
    if (dimensionsCheckbox.value) {
      var bounds = doc.pages[0].bounds;
      var pageWidth = bounds[3] - bounds[1];
      var pageHeight = bounds[2] - bounds[0];
      appendText = '_' + pageWidth + 'x' + pageHeight;
    }

    // Process each layer
    for (var i = 0; i < doc.layers.length; i++) {
      ++pb.value;
      var layer = doc.layers[i];
      status.text = 'Exporting ' + layer.name + '...';

      // Skip locked layers if not allowed to change
      if (layer.locked && !changeLockedVisibility) continue;

      // Set layer visibility
      for (var j = 0; j < doc.layers.length; j++) {
        var currentLayer = doc.layers[j];
        if (j === i) {
          currentLayer.visible = true;
        } else {
          if (!currentLayer.locked || changeLockedVisibility) {
            currentLayer.visible = false;
          }
        }
      }

      // Export file
      var fileName =
        layer.name.replace(/[^a-z0-9-]/gi, '_') +
        appendText +
        '.' +
        (exportFormat === 'PDF' ? 'pdf' : 'jpg');

      var saveFile = new File(folderPath.fsName + '/' + fileName);

      if (exportFormat === 'PDF') {
        doc.exportFile(
          ExportFormat.PDF_TYPE,
          saveFile,
          false,
          myPDFExportPreset,
        );
      } else {
        doc.exportFile(ExportFormat.JPG, saveFile);
      }
    }

    // Restore original states
    for (var i = 0; i < doc.layers.length; i++) {
      doc.layers[i].visible = originalVisibility[i];
      doc.layers[i].locked = originalLocked[i];
    }

    alert('Exported layers to:\n' + folderPath.fsName);
  }
}

// Run the script
exportLayersIndividually();
