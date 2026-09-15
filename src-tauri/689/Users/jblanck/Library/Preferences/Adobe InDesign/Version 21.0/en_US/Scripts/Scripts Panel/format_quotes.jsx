var myDoc = app.activeDocument;
myDoc.textPreferences.typographersQuotes=false; //these are a bitch

var replacements = [
    {f:"”",r:"\""}, //inches
    {f:"'",r:"′"} //feet
];

for(var i = 0; i < replacements.length; i++){
    app.findGrepPreferences = app.changeGrepPreferences = null;
    app.findChangeGrepOptions = NothingEnum.nothing;
    app.findGrepPreferences.findWhat = replacements[i]['f'];
    app.changeGrepPreferences.changeTo = replacements[i]['r'];
    myDoc.changeGrep();
}