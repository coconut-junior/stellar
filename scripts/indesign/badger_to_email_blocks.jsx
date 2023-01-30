#include "helpers/xlsx.extendscript.js"
#include "helpers/badger.js"
#include "helpers/email_block.js"
#include "helpers/product.js"
#include "helpers/formatting.js"

function myGetFile() {
	if (File.fs == "Macintosh") {
		myFileName = File.openDialog("Select an XLS file", limitFileType, false);
		function limitFileType(currentFile) {
			var strExt = currentFile.fullName.toLowerCase().substr(currentFile.fullName.lastIndexOf("."));
			if ((strExt == ".xls") || (currentFile instanceof Folder)) {
				return true;
			}
		}
	}
	else {
		myFileName = File.openDialog("Select an XLS file", "XLS files:*.xls", false);
	}
	return myFileName;
}

function myParsePrice(myPrice) {
	var ourPriceDollars = OurPriceCents = theirPriceDollars = theirPriceCents = "";
	var ourPrice = myPrice.match(/our price:\s*\d*\.{0,1}\d*/i);
	if (ourPrice) {
		ourPrice = ourPrice[0].replace(/our price:\s*/i,""); // Remove "our price"
		var ourPriceDollars = ourPrice.replace(/\.\d*/i,"");
		if ((ourPriceDollars == "0") || (ourPriceDollars == "00")) {
			ourPriceDollars = "";
		}
		var ourPriceCents = ourPrice.replace(/\d*\./i,"");
		if (ourPriceCents == "0") {
			ourPriceCents = "00";
		}
	}
	else { // No our price information exists
		var ourPriceDollars = ourPriceCents = "";
	}
	var theirPrice = myPrice.match(/their price:\s*\d*\.{0,1}\d*/i);
	if (theirPrice) {
		theirPrice = theirPrice[0].replace(/their price:\s*/i,""); // Remove "their price"
		var theirPriceDollars = theirPrice.replace(/\.\d*/i,"");
		if ((theirPriceDollars == "0") || (theirPriceDollars == "00")) {
			theirPriceDollars = "";
		}
		var theirPriceCents = theirPrice.replace(/\d*\./i,"");
		if (theirPriceCents == "0") {
			theirPriceCents = "00";
		}
	}
	else { // No their price information exists
		var theirPriceDollars = theirPriceCents = "";
	}
	return [ourPriceDollars, ourPriceCents, theirPriceDollars, theirPriceCents];
}

function convertBadgerRecords(records) {
	var products = new Array;
	for (var i = 0;i<records.length;++i){
		var p = new product();
		var r = records[i];

		p.title = fixCopy(r.itemName);
		p.version = r.version;
		
		if(r.burst != "") {p.bursts = [fixCopy(r.burst)];}
		
		p.copy = fixCopy(r.itemDesc);

		//remove this nonsense
		while(p.copy.match('undefined')){
			p.copy = p.copy.replace('undefined','')
		}

		p.ours = "$" + r.ourPriceDollars + "." + r.ourPriceCents;
		p.theirs = "$" + r.theirPriceDollars + "." + r.theirPriceCents;
		
		//omit buyout headers
		if(!p.title.toLowerCase().match("% off")) {
			products.push(p);
		}
	}

	return products;
}

function main(){
	// Prompt the user to select an xlsx file
	var myXLSXFile = myGetFile();
	if (!myXLSXFile) {
		return;
	}

	var myPath = myXLSXFile.path;
	// Read file from disk
	var workbook = XLSX.readFile(myXLSXFile);
	// Convert the first worksheet (project info) to JSON array of arrays
	var first_sheet_name = workbook.SheetNames[0], first_worksheet = workbook.Sheets[first_sheet_name];
	var myData = XLSX.utils.sheet_to_json(first_worksheet, {header:1});
	myData.shift(); // Remove the first array element since it is the header
	var records = new Array;
	// Parse and test each record for integrity
    for (var i=0; i<myData.length; i++) { // For each record...
        records[i] = badgerRecord(myData[i]);
	}

	var doc = app.activeDocument;
	prepDoc(doc);

	//convert badger entries to product objects
	var products = convertBadgerRecords(records);

	//create blocks
	createBlocks(products);

}

main();