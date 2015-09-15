/* TODO list:
	Support marking messages that are scrolled out of view as unread
	This will also require an active+unread tab stats (maybe black fg red bg)
	Joinining on the fly
	Friends list
	Profiles
	Make it not mess up when resized
	OS X terminal scrolling
		Apparently, it sends ^[OA and ^[OB for mousewheel up/down
	Emotes
		Might be hard, while an emote is just a U+E0xx glyph, simply
		sending that doesn't seem to work. 
*/


// Steam/dota stuff
var steam = require('steam');
var util = require('util');
var fs = require('fs');

var Dota2 = require('dota2');
var steamcreds = require('./steamcreds.js');
var sc = new steam.SteamClient();
var dota = new Dota2.Dota2Client(sc, true);
global.steamcreds = require('./steamcreds');
var config = require('./config');

// Pull stuff from config files
var chatChannels = config.channels;
var defaultTab = config.defaultChan;
var ownName = steamcreds.steam_name;
var cmdLeader = config.cmdLeader;

// These can be used by whatever to see if 
// the process of logging on and joining channels is done. 
var dotaIsReady = false;
var joinedChannels = false;

// Load our own classes from classes.js
var classes = require('./classes');
var chatTab = classes.chatTab;
var tabMan = classes.tabMan;
			
// Disable debugging output from these modules
sc.debug = false;
dota.debug = false;

// Callback when the steam connection is ready
var onSteamLogOn = function onSteamLogOn(){
	// Set display name
	sc.setPersonaName(steamcreds.steam_name);
	writeSystemMsg('Logged on to Steam');
	// Start node-dota2
	dota.launch();
	dota.on('ready', onDotaReady);
	dota.on('unready', onDotaUnready);
	dota.on('chatMessage', onDotaChatMessage);
};

// Boilerplate stuff
onSteamSentry = function onSteamSentry(sentry) {
	//util.log("Received sentry.");
	writeSystemMsg('Got Steam sentry');
	require('fs').writeFileSync('sentry', sentry);
};
onSteamServers = function onSteamServers(servers) {
	writeSystemMsg('Got Steam servers');
	//util.log("Received servers.");
	fs.writeFile('servers', JSON.stringify(servers));
};

// Dota connection is ready
var onDotaReady = function onDotaReady() {
	dotaIsReady = true;
	writeSystemMsg('Dota ready');
	if (!joinedChannels) 
		joinDefaultChannels();
};

var onDotaUnready = function onDotaUnready() {
	dotaIsReady = false;
	writeSystemMsg('Lost connection to Dota 2');
};

// Join default channels as defined in the config
var joinDefaultChannels = function joinDefaultChannels() {
	for (var i = 0; i < chatChannels.length; i++) {
		joinChannel(chatChannels[i]);
	};
	mainTabBar.switchToNum(defaultTab);
	joinedChannels = true;
};

// Join the named channel and do all the necessary stuff
// to allow the user to chat. 
var joinChannel = function joinChannel(chanName) {
	dota.joinChat(chanName);
	writeSystemMsg('Joining channel ' + chanName);
	var newChatTab = new chatTab(screen, chanName, chanName);
	mainTabBar.addTab(newChatTab);
};

var onDotaChatMessage = function onDotaChatMessage(channel, personaName, message){
	// Get the tab object that corresponds to the channel of the message
	// we just received. 
	var chatBox = mainTabBar.getChanTab(channel);
	// Channels seem to be "sticky" -- the GC seems to remember what channels you were in
	// if you didn't explicitly leave them. This is a problem because we don't actually know
	// what channel it's from, and we also wouldn't have a chatBox for it.  
	// We don't need handle these two issues separately, we can just do this instead. 
	if (typeof(chatBox) == undefined || chatBox == null) {
		writeSystemMsg('Received message from undefined channel ' + channel);
	} else { 
		chatBox.addMsg(personaName, message);
	}
	mainTabBar.updateBar();
};

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
	keys: true,
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

// Little 'Press Ctrl-X for help' label
// TODO

// This text should never actually appear. 
// If it does, it's a bug. 
chanLabel.content = 'default chanLabel content';

// sysTab is the <system> tab
// mainTabBar is the tab manager, not the tab bar itself
var sysTab = new chatTab(screen, '<system>', 'System');
var mainTabBar = new tabMan(sysTab, chanLabel, tabBar, screen);

// Put stuff on the screen
screen.append(debugBox);
screen.append(textEntryBox);
screen.append(chanLabel);
screen.append(tabBar);
// textEntryBox needs to pretty much always have focus. 
// It gets refocused automatically after sending a message. 
textEntryBox.focus();
debugBox.content = 'Press Ctrl-X for help';
screen.render();

// What happens when you press enter
textEntryBox.on('submit', function(data) {
	// Figure out if the message begins with cmdLeader
	// If so, try to process it as a command
	var channel = mainTabBar.activeTab.channel;
	var l = cmdLeader.length;
	if (data.slice(0, l) == cmdLeader) {
		// Take off the cmdLeader
		var cmd = data.slice(l);
		processCmd(cmd);
	} else {
		if (channel == '<system>') {
			// Putting a non-command message in the system window is nonsensical
			writeSystemMsg('You can\'t send messages here. Switch to a channel.');
		} else {
			var message = data;
			// Tag own messages with a You
			var messageText = '<' + channel + '> ' + ownName + ' (You): ' + message + '\n';
			var chatBox = mainTabBar.getChanTab(channel);
			//chatBox.append(messageText);
			chatBox.addMsg(ownName, message, true);
			dota.sendMessage(channel, data);
		}
	};
	// Clear the box, redraw the screen to reflect that. 
	// Also refocus it. 
	textEntryBox.clearValue();
	textEntryBox.focus();
	screen.render();
});

/* TODO: 
	^U, ^K
	^E, ^Y
	Nav cluster keys
	Text editing and navigation in general


*/

// Mouse wheel stuff
// OS X's default terminal apparently uses ^[OA and ^[OB instead, need
// to implemeent those. 
screen.enableMouse();
screen.on('wheeldown', function(){ mainTabBar.activeTab.scrollBy(1); });
screen.on('wheelup', function(){ mainTabBar.activeTab.scrollBy(-1); });

// Write stuff specifically to the current tab
// Useful for commands to write responses using this so the user
// doesn't have to switch to the system tab to see the response
var writeCurrentTab = function writeCurrentTab(text) {
	mainTabBar.activeTab.append(text + '\n');
};

// Always-available function for putting stuff in that line below the text
// entry space
// Globally available
var setDebugInfo = function setDebugInfo(text) {
	debugBox.content = 'Debug info: ' + text;
	screen.render();
}
global.setDebugInfo = setDebugInfo;

// Put a message on the system tab, tab it with <system>
var writeSystemMsg = function writeServerMsg(text) {
	sysTab.append('<system> ' + text + '\n');
};

// Ctrl-X help message
var printHelpMessage = function printHelpMessage() {
	helpText = 'Controls: Ctrl-P/N: Previous/Next tab; Enter: Send message; Ctrl-C: Quit\n';
	helpText+= 'Unicode names may show up as question marks. In-game emotes are PUA Unicode characters in the E0xx range\n';
	mainTabBar.activeTab.append(helpText);
};

// Process a command. 
// Command leader is already stripped
var processCmd = function processCmd(fullCmd) {
	var argv = fullCmd.split(' ');
	var cmd = argv[0];
	var cmdFunc;
	if (cmd in cmdMap) {
		cmdFunc = cmdMap[cmd];
		cmdFunc(fullCmd, argv);
	} else {
		writeCurrentTab('Command not found');	
	}
};

// Very basic command
// Echos back the exact string you call it with, including the echo
var echoCmd = function echoCmd(fullCmd, argv) {
	writeCurrentTab(fullCmd);
};
	
// Mapping for commands. 
// Commands here MUST be defined before being put in here. 
// Or, you can just append to this after defining your command. 
// The keys are what the user would type to call the command, 
// the values are the function that gets called to service the command. 
var cmdMap = {
	echo: echoCmd
};

// Controls
// It's the textEntryBox that gets to actually process controls
// since it's always focused. 
// Quit
screen.key(['C-c'], function(ch, key) { return process.exit(0); });
textEntryBox.key(['C-c'], function(ch, key) { return process.exit(0); });

// Prev/next tab
textEntryBox.key(['C-n'], function(ch, key) { mainTabBar.next() });
textEntryBox.key(['C-p'], function(ch, key) { mainTabBar.prev() });

// Help
textEntryBox.key(['C-x'], function(ch, key) { printHelpMessage() });

// Steam login stuff
// Login, only passing authCode if it exists
var logOnDetails = {
	'accountName': steamcreds.steam_user,
	'password': steamcreds.steam_pass,
};
if (steamcreds.steam_guard_code) logOnDetails.authCode = steamcreds.steam_guard_code;
var sentry = fs.readFileSync('sentry');
if (sentry.length) logOnDetails.shaSentryfile = sentry;
writeSystemMsg('Logging on to Steam...');
// TODO: Catch errors from this and alert the user in a more
// friendly way than an error number and traceback.  
sc.logOn(logOnDetails);
sc.on('loggedOn', onSteamLogOn);
sc.on('sentry', onSteamSentry);
sc.on('servers', onSteamServers);