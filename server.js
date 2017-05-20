/*
Mark Kaganovsky
100963694
*/




// Modules
const HTTP = require("http");
const FS = require("fs");
const URL = require("url");
const PATH = require("path");

const MIME_TYPES = require("mime-types");

const MAKE_BOARD = require("./serverResources/makeBoard");




// Constants
const PORT = 2406;
const ROOT = "public_html";

const MIN_DIFFICULTY = 4; // Minimum difficulty when adding a new user.

// Constants for content types.
const CONTENT_TYPE_TEXT_HTML = {'Content-Type' : 'text/html'};
const CONTENT_TYPE_APP_JSON = {'Content-Type' : 'application/json'};




// Globals
var users = {}; // Key-value map containing users.




// Start server
console.log("Starting up server...");
HTTP.createServer(handleClient).listen(PORT, function(err){
	if(err){
		console.log("ERROR: Server could not start!");
		console.log("REASON:");
		console.log(error);
		return;
	}
	// Server succesfully started.
	console.log("Server listening on port", PORT);
});




// Handles an incoming request.
function handleClient(req, res){
	console.log("==================================================================================");

	// Parse url
	let urlObject = URL.parse(req.url, true);

	// Print out info about this request
	console.log(urlObject);
	console.log();

	// Determine type of request.
	if(req.method === "GET"){
		switch(urlObject.pathname){
			case "/memory/card": // Client wants a card
				handleClickedCard(urlObject, res);
				break;

			default: // Client wants a file
				serveStaticFile(urlObject.pathname, res);
		}
	}
	else if(req.method === "POST"){
		switch(urlObject.pathname){
			case "/memory/intro": // User introduction (either new user or new game)
				handleIntro(req, res);
				break;

			default:
				console.log("ERROR: Invalid POST request.");
		}
	}
	else{ // Method not supported.
		res.writeHead(501, CONTENT_TYPE_TEXT_HTML);
		res.end("ERROR, method not supported.");
	}
}




/*
Builds the data string from the request object
asynchronously and calls the callback when done.

Callback must take a string as an argument.
*/
function buildDataString(req, callback){
	let dataString = "";

	// Append data.
	req.on("data", function(chunk){
		dataString += chunk;
	});

	// All data read, work with it now.
	req.on("end", function(){
		callback(dataString);
	});
}




/*
Responds with the card at the row and column element
for the user specified by the url object query.
*/
function handleClickedCard(urlObject, res){
	// Extract data from url
	let username = urlObject.query.username;
	let row = urlObject.query.row;
	let column = urlObject.query.column;

	// Check if query is valid.
	if(validateUsernameRowColumn(username, row, column)){
		// Build response object containing the card number
		let responseObj = {
			cardNumber : users[username].gameBoard[row][column]
		};

		// Respond.
		res.writeHead(200, CONTENT_TYPE_APP_JSON);
		res.end(JSON.stringify(responseObj));
	}
	else{ // Not valid query, respond with error.
		res.writeHead(400, CONTENT_TYPE_TEXT_HTML);
		res.end("ERROR: Invalid username or row/column index.");
	}
}




/*
Validate a username, row, and column index.

More specifically, checks first if the user exists, then if they do exist,
checks if the row and column indexes are within the valid range for that
users current difficulty.
*/
function validateUsernameRowColumn(username, row, column){
	let user = users[username];

	if(user){ // Check if user exists.
		if(row >= 0 && row < user.difficulty){ // Validate row
			if(column >= 0 && column < user.difficulty){ // Validate column
				return true; // Valid arguments
			}
		}
	}
	return false; // Invalid arguments
}




/*
Parses the JSON in the req object then creates a new user if not already exists.
If the user exists then a check is made for whether the difficulty needs to be increased.
Constructs a new game board and sends it to the response stream.
*/
function handleIntro(req, res){
	// First need to buffer the data string.
	buildDataString(req, function(dataString){
		// Parse JSON
		const dataJSON = JSON.parse(dataString);
		const username = dataJSON.username;
		const needIncreaseDifficulty = dataJSON.increaseDifficulty;

		let user = users[username];
		if(user){ // If user exists check if we need to update difficulty.
			if(needIncreaseDifficulty){ // Check if difficulty needs to be increased.
				user.difficulty += 2;
			}
		}
		else{ // Otherwise create new user with minimum difficulty.
			user = { difficulty : MIN_DIFFICULTY }; // Create user
			users[username] = user;
		}

		// Create new game board.
		user.gameBoard = MAKE_BOARD.makeBoard(user.difficulty);

		// Respond with an object indicating difficulty.
		res.writeHead(200, CONTENT_TYPE_APP_JSON);
		res.end(JSON.stringify({difficulty : user.difficulty}));
	});
}




/*
Serves static files. File path is the path to the file not
including the ROOT, res is the response object.
*/
function serveStaticFile(filePath, res){
	if(filePath === "/"){ // Handle initial "/" request.
		filePath = `${ROOT}/index.html`;
	}
	else{ // Prefix root to file path
		filePath = `${ROOT}/${filePath}`;
	}

	// Check if directory async
	FS.stat(filePath, function(error, stats){
		if(error){ // Error occured, serve 404
			serve404(res);
		}
		else if(stats.isDirectory()){ // Directory requested, serve index file
			filePath = `${ROOT}/index.html`;
		}

		// Read file async and serve when ready.
		FS.readFile(filePath, function(error, data){
			if(error){ // Error occured
				console.log(error);
				serve404(res);
			}
			else{ // Success, serve file.
				res.writeHead(200, getContentType(filePath));
				res.end(data);
			}
		});
	});
}




// Uses the mime types module and returns an object
// specifying the content type for the given file path
function getContentType(filePath){
	return {'Content-Type' : MIME_TYPES.lookup(filePath) || 'text/html'};
}




// Serves the 404 page to a response object
function serve404(res){
	let filePath = `${ROOT}/404.html`;

	// Read file async.
	FS.readFile(filePath, "utf8", function(error, data){
		if(error){ // Couldnt read 404 file, respond with something at least.
			console.log(error);
			res.writeHead(404, CONTENT_TYPE_TEXT_HTML);
			res.end("404 ERROR.");
		}
		else{
			res.writeHead(404, getContentType(filePath));
			res.end(data);
		}
	});
}
