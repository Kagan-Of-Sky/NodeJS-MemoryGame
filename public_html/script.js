/*
Mark Kaganovsky
100963794
*/


// Constants
const FACE_UP_CLASS = "faceUpCard";
const FACE_UP_PERMANENT_CLASS = "faceUpPermanent";
const ROW_KEY = "row";
const COLUMN_KEY = "column";
const CARD_NUMBER_KEY = "cardNum";

// Array of insults to player when they get a guess wrong.
const INSULTS = [
	"Wow, youve got the memory of a goldfish.",
	"What are you? My granpda?",
	"Cmon, my grandma has a better memory than you.",
	"Dude, seriously?",
	"Keep playing and maybe youll get better.",
];




// Globals
var username;

var activeCard1;
var activeCard2;

var numMatchesToWin;
var numMisses = 0;
var numMatches = 0;




// On load function
$(function(){
	username = getUserName();

	appendToGameStatusDiv("Hello, " + username);
	appendToGameStatusDiv("Connecting to server...");

	startNewGame();
});




// Sends the initial username JSON object.
function startNewGame(increaseDifficulty){
	appendToGameStatusDiv("<hr>", false);
	appendToGameStatusDiv("Starting new game...");

	var ajaxObj = {
		// Essential
		url : "/memory/intro",
		method : "POST",

		// Data
		data : JSON.stringify({
			username : username,
			increaseDifficulty : increaseDifficulty
		}),
		dataType : "json",

		// Callbacks
		success : initGame,
		error : startNewGameError,
	};

	$.ajax(ajaxObj);
}




// Resets all globals (except for username), initializes difficulty, and creates the board.
function initGame(data){
	const difficulty = data.difficulty;

	appendToGameStatusDiv("Game started, creating new board with difficulty " + difficulty);

	numMatches = 0;
	numMisses = 0;
	numMatchesToWin = (difficulty * difficulty) / 2;

	activeCard1 = null;
	activeCard2 = null;

	createBoard(difficulty);
}




// Creates a new board based on the dimension passed to it.
function createBoard(dimensions){
	// Get table and empty it.
	var gameBoardTableDOM = $("#gameBoardTable").empty();

	for(var i=0; i<dimensions; ++i){
		var row = $("<tr></tr>"); // Create new row.

		for(var j=0; j<dimensions; ++j){
			// Build div
			var tile = $("<div class='tile'></div>");
			tile.data(ROW_KEY, i).data(COLUMN_KEY, j);
			tile.click(tileClicked);

			// Build table cell to hold div, and insert div
			var td = $("<td></td>").html(tile);

			row.append(td); // Add cell to row.
		}
		gameBoardTableDOM.append(row); // Add row to table.
	}
}




// Fires when a tile is clicked on.
function tileClicked(event){
	// Get jQuery object for this element
	const clickedTile = $(this);

	// Card is already face up.
	if(clickedTile.hasClass(FACE_UP_CLASS)){
		appendToGameStatusDiv("This card is already face up.");
		return;
	}

	// Extract row and column indexes
	const row = clickedTile.data(ROW_KEY);
	const column = clickedTile.data(COLUMN_KEY);

	// Check if this is the first card selected in the pair.
	if(!activeCard1){
		activeCard1 = clickedTile;
		revealCard(row, column); // Load card.
		return;
	}

	// 1 card active but second card not active.-
	if(activeCard1 && !activeCard2){
		activeCard2 = clickedTile;

		// Reveal second card.
		revealCard(row, column, function(data){
			let cardNumber = data.cardNumber;

			// Show card.
			activeCard2.html(cardNumber);
			activeCard2.addClass(FACE_UP_CLASS);

			if(cardNumber === activeCard1.data(CARD_NUMBER_KEY)){ // Cards match
				++numMatches;

				// Style cards
				activeCard1.addClass(FACE_UP_PERMANENT_CLASS);
				activeCard2.addClass(FACE_UP_PERMANENT_CLASS);

				// Check if game won.
				if(numMatches === numMatchesToWin){
					appendToGameStatusDiv("Cards match! It looks like youve won the game!");
					appendToGameStatusDiv(`STATS: ${numMisses} incorrect guesses, ${numMatches} matching guesses.`);

					// Start new game after some time.
					setTimeout(function(){
						activeCard1 = null;
						activeCard2 = null;
						startNewGame(true);
					}, 2000);
				}
				else{
					activeCard1 = null;
					activeCard2 = null;

					let numMatchesLeft = numMatchesToWin-numMatches;
					appendToGameStatusDiv(`Cards match! Only ${numMatchesLeft} left to win!`);
				}
			}
			else{ // Cards do not match
				numMisses++;

				appendToGameStatusDiv(getRandomInsult()); // Insult player

				// Turn over the cards after a pause.
				setTimeout(function(){
					activeCard1.empty().removeClass(FACE_UP_CLASS);
					activeCard2.empty().removeClass(FACE_UP_CLASS);

					activeCard1 = null;
					activeCard2 = null;
				}, 2000);
			}
		});
	}
}




/*
Sends an async AJAX get request for the card with the specified row and column.

If no callback specified then calls the default revealCardSuccess function.
*/
function revealCard(row, column, callback){
	let ajaxObj = {
		// Essential
		url : "/memory/card",
		method : "GET",

		// Data
		data : {
			username : username,
			row : row,
			column : column
		},
		dataType : "json",

		// Callbacks
		success : callback ? callback : revealCardSuccess,
		error : revealCardError,
	};

	$.ajax(ajaxObj);
}




// The default success callback for revealCard. Sets activeCard1's data, text, and class.
function revealCardSuccess(data){
	activeCard1.data(CARD_NUMBER_KEY, data.cardNumber);

	activeCard1.html(data.cardNumber);
	activeCard1.addClass(FACE_UP_CLASS);
}




// Default error function for revealCard. Unbinds click listeners and displays an error message.
function revealCardError(error){
	errorClickListeners();

	let errorMessage = "ERROR: Could not fetch card from server.";
	appendToGameStatusDiv(errorMessage);
	alert(errorMessage);

	console.log(error);
}




// Error when sending user name to server.
function startNewGameError(jqxhr, status, error){
	errorClickListeners();

	let errorMessage = "ERROR: Could not send user name.";
	appendToGameStatusDiv(errorMessage);
	alert(errorMessage);

	console.log(error);
}




// Runs through all tiles, unbinds the click listeners and replaces them with a click listener that displays errors.
function errorClickListeners(){
	$(".tile").unbind("click"); // Get rid of old listeners.

	$(".tile").click(function(){ // Add error listeners.
		alert("Please refresh the page to reload a new game.");
	});
}




/*
Appends some text to the game status element and by default a line break.
If a line break is not needed then pass false as the second argument.
*/
function appendToGameStatusDiv(text, appendLineBreak){
	let gameStatusDiv = $("#gameStatus");

	// Append text to div.
	gameStatusDiv.append(appendLineBreak === false ? text : text+"<br>");

	// Scroll to bottom of div.
	gameStatusDiv.animate({scrollTop: gameStatusDiv.prop('scrollHeight')}, 1000);
}




// Continuously prompts the user until they enter a valid username.
function getUserName(){
	let username;
	while(!username){
		username = prompt("Please enter your username");
	}
	return username;
}




/*
Returns a random insult from the INSULTS array.
*/
function getRandomInsult(){
	return INSULTS[Math.floor(Math.random()*INSULTS.length)];
}
