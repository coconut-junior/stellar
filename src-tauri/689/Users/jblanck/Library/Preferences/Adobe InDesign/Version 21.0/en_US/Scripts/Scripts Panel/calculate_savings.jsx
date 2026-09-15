var stylesToCheck = [
  '6.5 pt price',
  '6.5 pt theirs',
  '8 pt price',
  '8 pt theirs',
];

//backport includes function
if (!Array.prototype.includes) {
  Array.prototype.includes = function (element) {
    for (var i = 0; i < this.length; i++) {
      if (this[i] === element) {
        return true;
      }
    }
    return false;
  };
}

function largest(numbers) {
  var largest = numbers[0];

  for (var i = 1; i < numbers.length; i++) {
    if (numbers[i] > largest) {
      largest = numbers[i];
    }
  }
  return largest;
}

function average(arr) {
  if (arr.length === 0) return 0; // Handle empty array to avoid NaN
  var sum = 0;
  for (var i = 0; i < arr.length; ++i) {
    var num = arr[i];
    sum += num;
  }
  return parseFloat(sum / arr.length);
}

if (app.selection.length === 0) {
  alert('Please select text frames or groups.');
} else {
  var numbersArray = [];
  var savingsArray = [];

  for (var i = 0; i < app.selection.length; i++) {
    var item = app.selection[i];

    if (item instanceof TextFrame) {
      processTextFrame(item);
    } else if (item instanceof Group) {
      var groupItems = item.allPageItems;
      for (var j = 0; j < groupItems.length; j++) {
        if (groupItems[j] instanceof TextFrame) {
          processTextFrame(groupItems[j]);
        }
      }
    }
  }

  //convert sets of 2 integers to prices [our price, their price]
  for (var i = 0; i < numbersArray.length - 1; i += 2) {
    var prices = [numbersArray[i] / 100, numbersArray[i + 1]];
    var savings = parseFloat(((prices[1] - prices[0]) / prices[1]) * 100);
    savingsArray.push(savings);
  }

  //convert sets of 2 integers to prices [our price, their price]
  for (var i = 0; i < numbersArray.length - 1; i += 2) {
    var prices = [numbersArray[i] / 100, numbersArray[i + 1]];
    var savings = parseFloat(((prices[1] - prices[0]) / prices[1]) * 100);
    savingsArray.push(savings);
  }

  var s = largest(savingsArray);
  s = Math.round(s);
  alert('Largest savings is ' + s + '%');

  function processTextFrame(textFrame) {
    for (var p = 0; p < textFrame.paragraphs.length; p++) {
      var style = textFrame.paragraphs[p].appliedParagraphStyle;
      if (style.isValid && stylesToCheck.includes(style.name)) {
        extractNumbers(textFrame.paragraphs[p].contents);
      }
    }
  }

  function extractNumbers(content) {
    var matches = content.match(/\d*\.?\d+/g);
    if (matches) {
      for (var i = 0; i < matches.length; ++i) {
        var num = matches[i];
        numbersArray.push(Number(num));
      }
    }
  }
}
