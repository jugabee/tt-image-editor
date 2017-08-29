var express = require("express");
var app = express();
app.use(express.static(__dirname + "/../"));
app.use(express.static(__dirname + "/../dist"))
app.use(express.static(__dirname + "/../public"))
app.listen(process.env.PORT || 8080);
