var jsonFile = null;
var jsonData = null;

$(`body`).keyup(function(event) {
    if(event.which == 13) {
        search();
    }
});

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
                var files = ev.dataTransfer.files;

                if (file.name.includes(".json")) {
                    jsonFile = file;
                    $(`#drop_zone`).css('color','white');
                    $(`#drop_zone`).css('backgroundColor', "#6B9EFF");
                    $(`#drop_zone`).css('border', "2px solid #6B9EFF");
                }
                else {
                    alert("Doesn't look like a JSON file. Please try a different file. :)");
                }

            }
        }
    }
}

function dragOverHandler(ev) {
    console.log('File(s) in drop zone');
    // Prevent default behavior (Prevent file from being opened)
    $(`#drop_zone`).css('background', "#ECF9FF")
    $(`#drop_zone`).css('border', "2px dashed #CDCDCD")
    $(`#drop_zone`).css('border-radius', "20px");
    ev.preventDefault();
}

function search() {
    results = [];
    $(`.resultBox`).html('');
    var term = $(`#searchBox`).val();
    var reader = new FileReader();
    
    try {
        reader.readAsText(jsonFile);
    }
    catch(error) {
        console.log("couldn't read from database");
    }

    reader.onload = function() {
        var jsonText = reader.result;
        jsonData = JSON.parse(jsonText);
        var products = jsonData['products'];
        $(`#timestamp`).html(`Last Indexed: ${jsonData['timestamp']}`);

        console.log(`${products.length} products in database`);

        for (var i = 0;i<products.length;++i) {
            var product = products[i];
            if(product['title'].toLowerCase().includes(term.toLowerCase())) {
                results.push(products[i]);
                console.log(products[i]);

                $(`.resultBox`).append(`<div class = "result">
                    <p>${product.title}</p>
                    <p>${product.ours}</p>
                    <p>${product.theirs}</p>
                </div>
                `);
            }
        }

        console.log(`${results.length} matches found`);
    };
    
    return results;
}