function main() {
	var objs = app.documents[0].pageItems.everyItem().getElements();

	while(obj=objs.pop()){
	
		 if(obj.parentPage == null){obj.remove()}
	
	}
}

app.doScript(main, ScriptLanguage.javascript, undefined, UndoModes.entireScript, "Clean Pasteboard");