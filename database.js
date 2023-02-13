var mysql = require('mysql');

var con = mysql.createConnection({
  host: "4c4.h.filess.io",
  user: "productdb_centdegree",
  port: "3307",
  password: "95d10fcb2836c5f34740906b4c76474ac270b0a5",
  database: "productdb_centdegree"
});

con.connect(function(err) {
  if (err) throw err;
  var sql = "SHOW TABLES";
  con.query(sql, function (err, result) {
    if (err) throw err;
        console.log(result);
  });
}); 