var discount = 0;

const ourPriceStyle = 'our price';
var yellow = app.activeDocument.colors[-1].duplicate();
yellow.properties = { colorValue: [0, 0, 100, 0], space: ColorSpace.CMYK };
var red = app.activeDocument.colors[-1].duplicate();
red.properties = { colorValue: [0, 99, 97, 0], space: ColorSpace.CMYK };
var white = 'Paper';

var window = new Window('dialog', 'Discount');
var dropdown = window.add(
  'dropdownlist',
  [0, 0, 100, 10],
  [
    '0',
    '5',
    '10',
    '15',
    '20',
    '25',
    '30',
    '35',
    '40',
    '45',
    '50',
    '55',
    '60',
    '65',
    '70',
    '75',
  ],
  undefined
);
var text = window.add('statictext');
text.text = '% off';
var button = window.add('button');
var button2 = window.add('button');
button.text = 'Calculate';
button2.text = 'Cancel';
var centSymbol = new String('\u00a2');

function main() {
  var canceled = false;

  button.onClick = function () {
    discount = parseInt(dropdown.selection.text) * 0.01;
    window.close();
  };

  button2.onClick = function () {
    window.close();
    canceled = true;
  };

  window.show();
  if (!canceled) {
    calculate();
  }
}

function round(num, precision) {
  var base = Math.pow(10, precision);
  return (Math.round(num * base) / base).toFixed(precision);
}

function calculate() {
  var doc = app.activeDocument;
  var items = doc.allPageItems;

  for (var i = 0; i < items.length; ++i) {
    var item = items[i];

    //our price
    if (item != undefined && item == '[object TextFrame]') {
      for (var p = 0; p < item.paragraphs.length; ++p) {
        var para = item.paragraphs[p];
        if (
          para.appliedFont.name.match('ChocolateMilk') &&
          (para.contents.match(/^\$/) || para.contents.match(centSymbol))
        ) {
          var contents = para.contents;
          var priceString = contents.replace(/\D/g, '');
          var price = parseInt(priceString) * 0.01;
          var newPrice = '';

          if (contents.match(/^\$/)) {
            newPrice = '$' + round(price * (1 - discount), 2) * 100;
          } else if (contents.match(centSymbol)) {
            newPrice = round(price * (1 - discount), 2) * 100;
            newPrice = newPrice.toString() + centSymbol;
          }

          newPrice = newPrice.replace('.', '');
          para.contents = para.contents
            .replace('$', '')
            .replace(centSymbol, '')
            .replace(priceString, newPrice);
        }
        //discount line lists
        // else if (para.appliedParagraphStyle.name.match('line list')) {
        //   var contents = para.contents;
        //   var priceString = contents
        //     .replace(/[^\$¢.\/0-9]/g, '')
        //     .split(' /')[0];

        //   //account for numbers appearing in front of price (measurements)
        //   var lineListArr = priceString.split('$');
        //   alert(lineListArr);

        //   if (lineListArr.length > 1) {
        //     priceString = '$' + lineListArr[1];
        //     alert(priceString);
        //   }

        //   var price = parseFloat(priceString.replace('$', ''));
        //   if (priceString.match(centSymbol)) {
        //     priceString = priceString.slice(-3);
        //     price = parseFloat(priceString.slice(0, 2));
        //   }

        //   var newPrice = '';
        //   var newPriceFloat;

        //   //calculate discount
        //   if (priceString.match(/^\$/)) {
        //     newPriceFloat = round(price * (1 - discount), 2);
        //   } else if (priceString.match(centSymbol)) {
        //     newPriceFloat = price * 0.01 * (1 - discount);
        //     newPriceFloat = round(newPriceFloat, 2);
        //   }

        //   //format price as string
        //   if (newPriceFloat < 1) {
        //     newPrice = (newPriceFloat * 100).toString() + centSymbol;
        //   } else {
        //     newPrice = '$' + newPriceFloat.toString();
        //   }

        //   para.contents = para.contents.replace(priceString, newPrice);
        // }
      }
    }
  }
}

if (parseFloat(app.version) < 6) main();
else
  app.doScript(
    main,
    ScriptLanguage.JAVASCRIPT,
    undefined,
    UndoModes.ENTIRE_SCRIPT,
    'Apply Discounts'
  );
