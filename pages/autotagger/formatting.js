String.prototype.insert = function(index, string) {
    if (index > 0) {
        return this.substring(0, index) + string + this.substr(index);
    }

    return string + this;
};

function titleCase(str) {
    str = str.toLowerCase();
    str = str.split(' ');
    for (var i = 0; i < str.length; i++) {
      str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1); 
    }
    return str.join(' ');
  }

function isAlphaNumeric(str) {
    var code, i, len;
  
    for (i = 0, len = str.length; i < len; i++) {
      code = str.charCodeAt(i);
      if (!(code > 47 && code < 58) && // numeric (0-9)
          !(code > 64 && code < 91) && // upper alpha (A-Z)
          !(code > 96 && code < 123)) { // lower alpha (a-z)
        return false;
      }
    }
    return true;
  };

function capitalizeFirstLetter(string) {

    if(!isAlphaNumeric(string[0])){
        return string[0] + string.charAt(1).toUpperCase() + string.slice(2);
    }
    else {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

function removeSpaces(string){
    return string.trim().replaceAll("  "," ");
}

function fixCapitalization(iname) {
    iname = iname.toLowerCase();
    iname = capitalizeFirstLetter(iname);
    iname = iname.replaceAll("*","•");
    
    return iname;
}

function normalizeAbbreviations(iname){
    //correct abbreviations
    var abbreviations = ["ct","pk","oz","lb","ft","in","yd","sqft","sq","lbs","gsm"];
    for (var abbr = 0;abbr<abbreviations.length;++abbr){
        var a = abbreviations[abbr];

        if(iname.match(a + " ") && !isNaN(iname[iname.indexOf(a)-1])){
            console.log("abbreviation found");
            iname = iname.replaceAll(a + " ",a + ". ");
            var i = iname.indexOf(a + ". ");
            var c = iname[i];
            if(!iname[i-1]==" "){//missing space before abbreviation?
                iname = iname.insert(i," ");
            }
        }
        else if(iname.match(" " + a + " ")){
            iname.replaceAll(" "+a+" "," "+a+" ");
        }
    }

    //fix inches being confused with in
    iname = iname.replaceAll("  in. "," in ");

    //iname = fixCapitalization(iname);
    
    return iname;
}

function fixCopy(copy){
    copy = removeSpaces(copy);
    copy = fixCapitalization(copy);
    copy = normalizeAbbreviations(copy);
    copy = removeSpaces(copy);

    return copy;
}

console.log("formatting script loaded");
console.log(fixCopy("20-24oz In shell peanuts look for unsalted, salted and Hot flavors"));
console.log(fixCopy("*NO TILLAGE *FOOD PLOT SEED"));
console.log(fixCopy("HOLDS UP TO 300LBS FOLDS IN HALF FOR EASY STORAGE CARRY HANDLE"))
console.log(fixCopy("Huge selection of styles, colors, & sizes to choose from"));
console.log(fixCopy("8-12 oz. Scents vary by store"));
console.log(fixCopy("	- Look for Hot and Pizza flavors 	"));