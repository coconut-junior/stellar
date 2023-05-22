document.addEventListener('mousemove', mouseMove);

function mouseMove(e) {
    var x = e.clientX;
    var y = e.clientY;
    $(`.cursor`).css(`left`,`${x}px`);
    $(`.cursor`).css(`top`,`${y}px`);
}

var xlsFile = null;

function dropHandler(ev) {
    console.log('File(s) dropped');

    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();

    if (ev.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        for (var i = 0; i < ev.dataTransfer.items.length; i++) {
            // If dropped items aren't files, reject them
            if (ev.dataTransfer.items[i].kind === 'file') {
                var file = ev.dataTransfer.items[i].getAsFile();
                console.log('... file[' + i + '].name = ' + file.name);
                var files = ev.dataTransfer.files;

                if (file.name.includes(".xls")) {
                    xlsFile = file;
                    ev.target.style.color = "white";
                    ev.target.style.backgroundColor = "#6B9EFF";
                    ev.target.style.border = "2px solid #6B9EFF";
                }
                else {
                    alert("Doesn't look like an Excel spreadsheet (XLS). Please try a different file. :)");
                }

            }
        }
    } else {
        // Use DataTransfer interface to access the file(s)
            for (var i = 0; i < ev.dataTransfer.files.length; i++) {

            }
        }
    }

function dragOverHandler(ev) {
    console.log('File(s) in drop zone');

    // Prevent default behavior (Prevent file from being opened)
    ev.target.style = "background: #ECF9FF;border: 2px dashed #CDCDCD;border-radius: 20px;";
    ev.preventDefault();
}

var file_text = "";
var html_text = "";
var alt_tags = [];
var item_names = [];
var matched_items = [];
var prices = []; //maybe pull prices and other info from item lists xls?
var workbook;
var sheetName;
var sheet;
var new_code = "";
var percent_off = 0;

function openSheet(file) {

    const reader = new FileReader();
    var data = "";

    reader.addEventListener("load", () => {
    // this will then display a text file
    data = reader.result;
        var options = { type: 'array' };
    workbook = XLSX.read(data, options);
        sheetName = workbook.SheetNames;
    sheet = workbook.Sheets[workbook.SheetNames[0]];
    percent_off = parseInt(document.getElementById("percentBox").value);

    if (sheetName[0] == "featureViewTable") {
        var range = XLSX.utils.decode_range(sheet['!ref']);
        matched_items = [];

        //search excel sheet for matches
        for (let rowNum = range.s.r + 1; rowNum <= range.e.r; rowNum++) {

            var iname = sheet[XLSX.utils.encode_cell({r: rowNum, c: 3})]["v"];
            var logo = sheet[XLSX.utils.encode_cell({r: rowNum, c: 4})]["v"];
            var prices = sheet[XLSX.utils.encode_cell({r:rowNum,c:10})]["v"];
            var special_notes = sheet[XLSX.utils.encode_cell({r:rowNum,c:11})]["v"];
            var theirs = "";

            //normalize abbreviations
            iname = normalizeAbbreviations(iname);
            
            prices = prices.replaceAll("Our Price","OurPrice");
            prices = prices.replaceAll("Their Price","TheirPrice");					

            var priceList = prices.split(" ");//ours, theirs array

            for(var i =0;i<priceList.length;++i) { 
                var pricePoint = priceList[i];
                var number = Number(priceList[i].replace(/[^0-9\.]+/g,""));
                var discount = number * (1-(0.01*percent_off));
                discount = discount.toFixed(2);
                if(pricePoint.match("OurPrice")){
                    console.log("matched");
                    priceList[i] = "OurPrice:" + discount;
                    if(percent_off > 0) {
                        priceList[i] = "OurPrice:" + discount + " After Discount";
                    }
                }
            }

            prices = priceList.toString();

            console.log(prices);

            if(!iname.toLowerCase().match(logo.toLowerCase())) {
                iname = logo + " " + iname;
            }

            prices = prices.replaceAll("rice:","rice: $");
            prices = prices.replaceAll("OurPrice:","Our Price:");
            prices = prices.replaceAll("TheirPrice:"," theirs:");
            prices = prices.replaceAll(",,",", ");
            iname = iname.replaceAll('"','');
            iname = iname.replaceAll("&","and");
            iname = iname.replaceAll("  "," ");
            var tag = iname.replaceAll(" (logo)","") + ": " + prices;
            matched_items.push(tag);
        }

        var tagList = document.getElementById("tagList");
        tagList.value = "";
        for(var i = 0;i<matched_items.length;++i) {
            tagList.value += matched_items[i] + "\n";
        }
                
    }
    }, false);

    if (file) {
    reader.readAsArrayBuffer(file);
        document.getElementById("tagButton").disabled = false;
        document.getElementById("downloadButton").disabled = false;
    }

    
}

function autotag() {
    openSheet(xlsFile);
}

function download() {
    var blob = new Blob([tagList.value], { type: "text/plain;charset=utf-8" });
    saveAs(blob, "tags.txt");
}