/* TODO list:
	Support marking messages that are scrolled out of view as unread
	This will also require an active+unread tab stats (maybe black fg red bg)
	Joinining on the fly
	Friends list
	Profiles
	Make it not mess up when resized
	OS X terminal scrolling
		Apparently, it sends ^[OA and ^[OB for mousewheel up/down
*/



var steam = require('steam');
var util = require('util');
var fs = require('fs');

var Dota2 = require('dota2');
var steamcreds = require('./steamcreds.js');
var sc = new steam.SteamClient();
var dota = new Dota2.Dota2Client(sc, true);
global.steamcreds = require('./steamcreds');
var config = require('./config');

var chatChannels = config.channels;
var defaultTab = config.defaultChan;
var ownName = steamcreds.steam_name;
var cmdLeader = '/';

var dotaIsReady = false;
var joinedChannels = false;

var classes = require('./classes');
var chatTab = classes.chatTab;
var tabMan = classes.tabMan;
			
sc.debug = false;
dota.debug = false;

var onSteamLogOn = function onSteamLogOn(){
	sc.setPersonaName(steamcreds.steam_name);
	writeSystemMsg('Logged on to Steam');
	// Start node-dota2
	dota.launch();
	dota.on('ready', onDotaReady);
	dota.on('unready', onDotaUnready);
	dota.on('chatMessage', onDotaChatMessage);
};

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

var joinDefaultChannels = function joinDefaultChannels() {

	for (var i = 0; i < chatChannels.length; i++) {
		joinChannel(chatChannels[i]);
	};
	mainTabBar.switchToNum(defaultTab);
	joinedChannels = true;
};

// Join the named channel and do all the necessary stuff
var joinChannel = function joinChannel(chanName) {
	dota.joinChat(chanName);
	writeSystemMsg('Joining channel ' + chanName);
	var newChatTab = new chatTab(screen, chanName, chanName);
	mainTabBar.addTab(newChatTab);
};

var sendTestMessage = function sendTestMessage(){
	//dota.sendMessage('ue7-test', 'test message');
};

var onDotaChatMessage = function onDotaChatMessage(channel, personaName, message){
	//util.log([channel, personaName, message].join(': '));
	//var messageText = '<' + channel + '> ' + personaName + ': ' + message + '\n';
	var chatBox = mainTabBar.getChanTab(channel);
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

//screen.append(box);
screen.append(debugBox);
screen.append(textEntryBox);
screen.append(chanLabel);
screen.append(tabBar);
debugBox.content = 'Press Ctrl-X for help';
//textEntryBox.setValue('Enter chat message here');
textEntryBox.focus();
screen.render();

// What happens when you press enter
textEntryBox.on('submit', function(data) {
	var channel = mainTabBar.activeTab.channel;
	var l = cmdLeader.length;
	if (data.slice(0, l) == cmdLeader) {
		var cmd = data.slice(l);
		processCmd(cmd);
	} else {
		if (channel == '<system>') {
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
screen.enableMouse();
screen.on('wheeldown', function(){ mainTabBar.activeTab.scrollBy(1); });
screen.on('wheelup', function(){ mainTabBar.activeTab.scrollBy(-1); });

// Legacy alias	
var chatBoxAppend = function chatBoxAppend(text) {
	sysTab.append(text);
}

var writeCurrentTab = function writeCurrentTab(text) {
	mainTabBar.activeTab.append(text + '\n');
};
//chatBoxAppend('a\n\n\n\n\n\n\n\n\nb\n\n\n\n\n\n\n\nc\nd\ne\n');

// Always-available function for putting stuff in that line below the text
// entry space
var setDebugInfo = function setDebugInfo(text) {
	debugBox.content = 'Debug info: ' + text;
	screen.render();
}
global.setDebugInfo = setDebugInfo;

var writeSystemMsg = function writeServerMsg(text) {
	sysTab.append('<system> ' + text + '\n');
};

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


var echoCmd = function echoCmd(fullCmd, argv) {
	writeCurrentTab(fullCmd);
};
	
// Mapping for commands. 
// Commands here MUST be defined before being put in here. 
var cmdMap = {
	echo: echoCmd
};

// Controls
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
sc.logOn(logOnDetails);
sc.on('loggedOn', onSteamLogOn);
sc.on('sentry', onSteamSentry);
sc.on('servers', onSteamServers);
