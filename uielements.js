var blessed = require('blessed');


var screen = blessed.screen({
	smartCSR: true
});

// Terminal title
screen.title = 'dChat';

// Where you type messages
var textEntryBox = blessed.Textbox({
	inputOnFocus: true,
	top: '100%-2',
	left: 2,
	width: '100%',
	height: 1,
	//keys: true,
	/*border: {
		fg: 'blue',
	},*/
});

// Line below the text entry box
// setDebugInfo is a global that allows you to put stuff here
// for easy use. 
var debugBox = new blessed.text({
	top: '100%-1',
	left: 2,
	width: '100%',
	height: 1,
});

// Line above the text entry box which shows the channel you're about to send to
var chanLabel = new blessed.text({
	top: '100%-3',
	left: 2,
	width: '100%',
	height: 1,
});

// Tab bar, handled by tabMan
// TODO: figure out what to do with the line below it (or remove that)
var tabBar = new blessed.box({
	top: 'top',
	left: 1,
	width: '100%-2',
	height: 1,
	tags: true,
});

var dividerBar = new blessed.box({
	top: '100%-4',
	left:0,
	width: '100%',
	height: 1,
	style: {
		fg: 'black',
		bg: 'blue',
	},
});

// Little 'Press Ctrl-X for help' label
// TODO

// This text should never actually appear. 
// If it does, it's a bug. 
chanLabel.content = 'default chanLabel content';

// Put stuff on the screen
screen.append(debugBox);
screen.append(textEntryBox);
screen.append(chanLabel);
screen.append(tabBar);
screen.append(dividerBar);

// Exports
module.exports = {
	textEntryBox: textEntryBox,
	debugBox: debugBox,
	chanLabel: chanLabel,
	tabBar: tabBar,
	dividerBar: dividerBar,
	screen: screen,
};

