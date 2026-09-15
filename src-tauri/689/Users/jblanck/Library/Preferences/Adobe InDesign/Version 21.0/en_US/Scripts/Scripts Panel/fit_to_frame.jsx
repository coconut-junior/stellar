var key;
var interval = 0.5;

try{
    var key = arguments[0];
}catch(e){}

function main() {

    fill(app.selection[0]);

    
    // var canceled = false;

    // if(key == 'stellar') {
    //     fill(app.selection[0]);
    // }
    // else {
    //     alert('This automation only works through Stellar. Please launch it again from the app.');
    //     canceled = true;
    // }
}

function fill(frame) {
    if(frame == undefined) {
        alert('Please select a text or image frame.');
    }
    else if (frame.constructor.name == "TextFrame") {
        while (frame.overflows == false) {
            for(var i = 0;i<frame.paragraphs.length;++i) {
                frame.paragraphs[i].pointSize = frame.paragraphs[i].pointSize + interval;
                frame.paragraphs[i].leading = frame.paragraphs[i].pointSize * 1;
            }
        }
    
        shrink(frame);
    }
    else if (frame.constructor.name == "Rectangle") {
        frame.fit(FitOptions.PROPORTIONALLY);
    }
}

function shrink(frame) {
	while (frame.overflows == true) {
		// for(var i = 0;i<frame.paragraphs.length;++i) {
        //     frame.paragraphs[i].pointSize = frame.paragraphs[i].pointSize - interval;
        //     frame.paragraphs[i].leading = frame.paragraphs[i].pointSize * 1;
        // }

        // frame.paragraphs.everyItem().convertBulletsAndNumberingToText();

        frame.paragraphs.everyItem().pointSize = frame.paragraphs[0].pointSize - interval;
        frame.paragraphs.everyItem().leading = frame.paragraphs[0].pointSize * 1;    
	}

    frame.paragraphs.lastItem().pointSize = frame.paragraphs[0].pointSize;
    frame.paragraphs.lastItem().leading = frame.paragraphs[0].pointSize * 1;
}

// main();


if (parseFloat(app.version) < 6)
    main();
else
    app.doScript(
        main,
        ScriptLanguage.JAVASCRIPT,
        undefined,
        UndoModes.ENTIRE_SCRIPT,
        "Make Images Proportional"
    );
