const fs = require("fs");
const customers = new Map();

class Customers {
  constructor(name, id1, id2, darkstore) {
    this.name = name;
    this.id1 = id1;
    this.id2 = id2;
    this.darkstore = darkstore;
  }
}

// map is setup using data from first file
try {
  const data = fs.readFileSync("test.csv", "utf8");
  const arr = CSVToArray(data);
  arr.forEach((element) => {
    customers.set(element[0], new Customers(element[0], element[1]));
  });
} catch (err) {
  console.error(err);
}

// map is filled with values from second file for the keys found
try {
  const data = fs.readFileSync("test3.csv", "utf8");
  const arr = CSVToArray(data);
  arr.forEach((element) => {
    let customer = customers.get(element[0]);
    if (customer != null) {
      customer.id2 = element[1];
      customer.darkstore = element[2];
    }
  });
} catch (err) {
  console.error(err);
}

// Generate SQL using the map
let id = 60; // previous values in target table were in 50s
customers.forEach((element) => {
  if (element.darkstore)
    console.log(
      `INSERT INTO table_uds ( id, user, dark) VALUES (${id++}, ${
        element.id1
      }, ${DarkStoreMapper(element.darkstore)});`
    );
});

function DarkStoreMapper(id) {
  if (id == 11001) return 5;
  if (id == 11000) return 4;
}

// https://stackoverflow.com/a/1293163/256689
function CSVToArray(strData, strDelimiter) {
  strDelimiter = strDelimiter || ",";
  var objPattern = new RegExp(
    "(\\" +
      strDelimiter +
      "|\\r?\\n|\\r|^)" +
      '(?:"([^"]*(?:""[^"]*)*)"|' +
      '([^"\\' +
      strDelimiter +
      "\\r\\n]*))",
    "gi"
  );

  var arrData = [[]];
  var arrMatches = null;
  while ((arrMatches = objPattern.exec(strData))) {
    var strMatchedDelimiter = arrMatches[1];
    if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
      arrData.push([]);
    }

    var strMatchedValue;
    if (arrMatches[2]) {
      strMatchedValue = arrMatches[2].replace(new RegExp('""', "g"), '"');
    } else {
      strMatchedValue = arrMatches[3];
    }
    arrData[arrData.length - 1].push(strMatchedValue);
  }
  return arrData;
}
