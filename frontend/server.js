//simple express server to run frontend production build;
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();

// Debug logs
console.log("__dirname:", __dirname);
console.log("Build path:", path.join(__dirname, "build"));
console.log("Index.html path:", path.join(__dirname, "build", "index.html"));
console.log("Index.html exists:", fs.existsSync(path.join(__dirname, "build", "index.html")));

app.use(express.static(path.join(__dirname, "build")));
app.get("/*", function (req, res) {
	const indexPath = path.join(__dirname, "build", "index.html");
	console.log("Serving:", indexPath);
	res.sendFile(indexPath);
});
app.listen(3000, () => {
	console.log("Frontend server running on port 3000");
});

