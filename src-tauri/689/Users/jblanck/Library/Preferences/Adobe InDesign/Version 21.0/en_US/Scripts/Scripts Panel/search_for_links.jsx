var doc = app.activeDocument;
var imgs = doc.links;
var username = $.getenv('USERNAME') || $.getenv('USER');
var homeFolder = Folder('~');
var os = '';
var w = new Window('palette', 'Progress', undefined, { closeButton: false });
var status = w.add('statictext');
var pb = w.add('progressbar', undefined, 0, 100);
var missingPre = 0;
var missingPost = 0;

pb.preferredSize = [400, -1];
status.preferredSize = [400, -1];
pb.maxvalue = imgs.length;
w.show();

if ($.os.toLowerCase().indexOf('mac') >= 0) {
  os = 'mac';
} else if ($.os.toLowerCase().indexOf('windows') >= 0) {
  os = 'windows';
}

// Polyfill for String.prototype.replaceAll in ExtendScript
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (search, replacement) {
    var searchPattern =
      search instanceof RegExp ? search : new RegExp(escapeRegExp(search), 'g');
    return this.replace(searchPattern, replacement);
  };
}

function getCorrectSlash(s) {
  if (os == 'mac') {
    return '/';
  } else {
    return '\\';
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSharePointFolders() {
  var cloudStorage;
  if (os == 'mac') {
    cloudStorage = homeFolder + '/Library/CloudStorage'; //if mac, start in CloudStorage folder
  } else {
    //if windows, start in home folder
    cloudStorage = homeFolder;
    return [homeFolder];
  }

  return Folder(cloudStorage).getFiles(function (item) {
    return (
      item instanceof Folder &&
      item.absoluteURI.replaceAll(' ', '').match('OlliesBargainOutlet')
    );
  });
}

function getDesignFolder(oneDrive) {
  return Folder(oneDrive).getFiles(function (item) {
    return item instanceof Folder && item.absoluteURI.match('Designs');
  });
}

function getCorpFolder(oneDrive) {
  return Folder(oneDrive).getFiles(function (item) {
    return (
      item instanceof Folder &&
      item.absoluteURI.replaceAll('%20', ' ').match('Corporate Assets')
    );
  });
}

function detectPathOS(linkPath) {
  if (/^[a-zA-Z]:\\/.test(linkPath)) {
    return 'windows';
  } else if (
    linkPath.indexOf('/') === 0 ||
    (linkPath.indexOf(':') > 0 && linkPath.indexOf('\\') === -1)
  ) {
    return 'mac';
  } else {
    return 'unknown';
  }
}

function getRelPath(s) {
  s = s.replaceAll('%20', ' ');
  var sArr = s.split(/[\/\\]+/);
  for (var i = 0; i < sArr.length; ++i) {
    var f = sArr[i];
    if (
      f.match('Designs') ||
      f.replaceAll('%20', ' ').match('Corporate Assets')
    ) {
      //get everything following 'Ollies Bargain Outlet' or 'OlliesBargainOutlet'
      return s.split(f)[1];
    }
  }
}

//get all sharepoint folders
var spFolders = getSharePointFolders();
var correctSlash = getCorrectSlash();
var spFolder = spFolders[0].fsName;

//count missing before relink
for (i = 0; i < imgs.length; i++) {
  if (imgs[i].status == LinkStatus.LINK_MISSING) {
    ++missingPre;
  }
}

//begin relinking
for (i = 0; i < imgs.length; i++) {
  var img = imgs[i];
  var pathType = detectPathOS(img.linkResourceURI);
  ++pb.value;

  if (img.status == LinkStatus.LINK_MISSING) {
    var relBrokenPath = getRelPath(img.linkResourceURI);
    var designFolder = Folder(getDesignFolder(Folder(spFolder))).fsName;
    var corpFolder = Folder(getCorpFolder(Folder(spFolder))).fsName;
    var combinedPath;

    status.text = 'Searching for ' + relBrokenPath + '...';

    if (img.linkResourceURI.match('Designs')) {
      combinedPath = designFolder + relBrokenPath;
    } else if (
      img.linkResourceURI.replaceAll('%20', ' ').match('Corporate Assets')
    ) {
      combinedPath = corpFolder + relBrokenPath;
    }
    //replace slashes with correct one for mac or windows

    //attempt to relink
    try {
      combinedPath = combinedPath.replace(/[\/\\]/g, correctSlash);
      imgs[i].relink('file:' + combinedPath);
    } catch (e) {}
  }
}

for (i = 0; i < imgs.length; i++) {
  if (imgs[i].status == LinkStatus.LINK_MISSING) {
    ++missingPost;
  }
}

w.close();
alert('Found & relinked ' + (missingPre - missingPost) + ' files.');

// /Users/polder/Library/CloudStorage/OneDrive-OlliesBargainOutlet/Designs
// /Users/polder/Library/CloudStorage/OneDrive-OlliesBargainOutlet/Corporate Assets
// /Users/jblanck/Library/CloudStorage/OneDrive-SharedLibraries-OlliesBargainOutlet/Creative Services - Designs
// C:\Users\lstrickland\Ollies Bargain Outlet
// C:\Users\CArthur\OneDrive - Ollies Bargain Outlet\Creative Services - Designs
