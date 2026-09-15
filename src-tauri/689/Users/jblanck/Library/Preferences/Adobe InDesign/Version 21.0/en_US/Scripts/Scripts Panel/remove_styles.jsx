var doc = app.activeDocument;

var allCellStyles=doc.allCellStyles;
var allUsedCellStyles=new Array();	

for(var i=allCellStyles.length-1;i>=0;i--) {
    try {
        allCellStyles[i].remove();
    }
    catch(e){}
}

var allObjectStyles=doc.allObjectStyles;
for(var i=allObjectStyles.length-1;i>=0;i--) {
    try {
        allObjectStyles[i].remove();
    }
    catch(e){}
}

var allParaStyles=doc.allParagraphStyles;
for(var i=allParaStyles.length-1;i>=0;i--) {
    try {
        allParaStyles[i].remove();
    }
    catch(e){}
}

alert("All styles have been removed.");