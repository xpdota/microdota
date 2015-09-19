/* Todo list:
	Support marking messages that are scrolled out of view as unread
	This will also require an active+unread tab stats (maybe black fg red bg)
	Temp hack:
		Added a "scroll down for more messages" banner across the divier
		This has a bug in that it doesn't seem to work on the system tab. 
	Profiles
		In progress
	Make it not mess up when resized
	OS X terminal scrolling
		Apparently, it sends ^[OA and ^[OB for mousewheel up/down
	Emotes
		Might be hard, while an emote is just a U+E0xx glyph, simply
		sending that doesn't seem to work, but that's probably because I 
		don't have any emotes on the test account. 
*/


// Steam/dota stuff
var Steam = require('steam');
var util = require('util');
var fs = require('fs');

var Dota2 = require('dota2');
var steamcreds = require('./steamcreds.js');
var sc = new Steam.SteamClient();
var dota = new Dota2.Dota2Client(sc, true);
var config = require('./config');
var richPresence = require('./richPresence');
var rpToText = richPresence.rpToText;
var steamFuncs = require('./steamFuncs');

// Pull stuff from config files
var chatChannels = config.channels;
var defaultTab = config.defaultChan;
// Trying to support not changing your name
var ownName = '';
var ownSteamId = '';
var cmdLeader = config.cmdLeader;

// These can be used by whatever to see if 
// the process of logging on and joining channels is done. 
var dotaIsReady = false;
var joinedChannels = false;

// Steam friends and players stuff
var steamFriends = {};
var steamUsers = {};
var flData = {};

// Load our own classes from classes.js
var classes = require('./classes');
var chatTab = classes.chatTab;
var tabMan = classes.tabMan;
var friendsTabClass = classes.friendsTab;
			
// Disable debugging output from these modules
sc.debug = false;
dota.debug = false;


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
	var sendFunc = function sendFunc(msg) {
		this.addMsg(ownName, msg, true);
		sendDotaMessage(chanName, msg);
	};
	var newChatTab = new chatTab(screen, chanName, chanName, sendFunc);
	mainTabBar.addTab(newChatTab);
};

var onDotaChatMessage = function onDotaChatMessage(channel, personaName, message, chatObj){
	// extra stuff we can get from chatObj
	var id = chatObj.accountId;
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
		updateDividerBar(chatBox.msgBelow);
	};
	mainTabBar.updateBar();

};

// Moved ui elements to a new file
var uielements = require('./uielements');
textEntryBox = uielements.textEntryBox;
debugBox = uielements.debugBox;
chanLabel = uielements.chanLabel;
tabBar = uielements.tabBar;
dividerBar = uielements.dividerBar;
screen = uielements.screen;

// sysTab is the <system> tab
// mainTabBar is the tab manager, not the tab bar itself
var sysTab = new chatTab(screen, '<system>', 'System');
sysTab.sendInput = function sendInput(entryObj) {
	if (!entryObj.isCmd) {
		writeSystemMsg('You can\'t write messages here');
	};
};
sysTab.closable = false;
var mainTabBar = new tabMan(sysTab, chanLabel, tabBar, screen, dividerBar);

// textEntryBox needs to pretty much always have focus. 
// It gets refocused automatically after sending a message. 
textEntryBox.focus();
debugBox.content = 'Press Ctrl-X for help';
screen.render();

// What happens when you press enter
textEntryBox.on('submit', function(data) {
	// This is how the lgoic works for this:
	// 1. Parse it (see if it's a command, if so, which?)
	// 2. If the chat box accepts input, send it there
	//		At this point, the chat box itself can modify 
	// 	the object as it wishes. For example, if the chat box can process
	//		the command, it can set isCmd to false to make it not be
	//		processed later as a system command. 
	// 3. If it is (still) a command, see if we have a system command
	//		that matches. 
	// 4. Do the generic stuff (clear the box, update screen, etc). 
	var chatBox = mainTabBar.activeTab;
	var acceptsInput = chatBox.acceptsInput || false;
	var l = cmdLeader.length;
	var isCmd = false;
	if (data.slice(0, l) == cmdLeader) {
		isCmd = true;
		var cmd = data.slice(l);
	};
	var message = '';
	if (!isCmd) {
		var message = data;
	};
	var entryObj = {
		raw: data,
		isCmd: isCmd,
		isMsg: !isCmd,
		msg: message,
		cmd: cmd,
	};
	//var channel = chatBox.channel;
	if (acceptsInput) {
		chatBox.sendInput(entryObj);
	};
	// If the sendInput function from the chat window did not take care of
	// the command, process it normally. 
	if (entryObj.isCmd) {
		processCmd(entryObj.cmd);
	};
	// Clear the box, redraw the screen to reflect that. 
	// Also refocus it. 
	textEntryBox.clearValue();
	textEntryBox.focus();
	screen.render();
});

// Functions to send messages
// These should be used instead of sc/dota.sendMessage. 
var sendDotaMessage = function sendMessage(channel, data) {
	dota.sendMessage(channel, data);
};
var sendSteamMessage = function sendSteamMessage(id, data) {
	SteamFriends.sendMessage(id, data);
};

// ^U functionality
var clearTextBox = function clearTextBox() {
	textEntryBox.clearValue();
	textEntryBox.focus();
	screen.render();
};

// (Future) function for pressing ^W
var deleteWordTextBox = function deleteWordTextBox() {
	
};

/* TODO: 
	Nav cluster keys
	Text editing and navigation in general
	Command history
*/

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
var writeSystemMsg = function writeSystemMsg(text) {
	sysTab.append('<system> ' + text + '\n');
	mainTabBar.updateBar();
	updateDividerBar();
};
global.writeSystemMsg = writeSystemMsg;

// Ctrl-X help message
var printHelpMessage = function printHelpMessage() {
	helpText = 'Controls: Ctrl-P/N: Previous/Next tab; Enter: Send message; Ctrl-C: Quit\n';
	helpText+= 'Unicode names may show up as question marks. In-game emotes are PUA Unicode characters in the E0xx range\n';
	helpText+= 'Scrolling the chat may be done with the mousewheel if your terminal supports it, or ^Y/^E.\n';
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

// Join a channel on the fly
// Does not permanently join the channel
var joinCmd = function joinCmd(fullCmd, argv) {
	// Channel name might have spaces and stuff, so just
	// strip off the 'join ' part of the command to  get
	// the channel name. 
	var chanName = fullCmd.slice(5);
	joinChannel(chanName);
};

var profileCmd = function profileCmd(fullCmd, argv) {
	var playerId = parseInt(argv[1])
	dota.requestProfile(playerId);
	writeSystemMsg('Requesting profile for ' + playerId);
};

var steamGuardCmd = function steamGuardCmd(fullCmd, argv) {
	var sgCode = argv[1];
	steamFuncs.setSteamGuardCode(sgCode);
	writeSystemMsg('Your steam guard code has been entered. ');
	writeSystemMsg('Now use /connect to try connecting again. ');
};

var connectCmd = function connectCmd(fullCmd, argv) {
	writeSystemMsg('(Re)connecting Steam...');
	sc.connect();
};

// Close current tab, if possible. Note that this doesn't necessarily
// do anything other than close the tab. You'll still be in a chat channel if
// you close it, there isn't a /part equivalent yet. 
var closeCmd = function closeCmd(fullCmd, argv) {
	mainTabBar.closeCurrentTab();
};
	
// Mapping for commands. 
// Commands here MUST be defined before being put in here. 
// Or, you can just append to this after defining your command. 
// The keys are what the user would type to call the command, 
// the values are the function that gets called to service the command. 
var cmdMap = {
	echo: echoCmd,
	join: joinCmd,
	profile: profileCmd,
	sg: steamGuardCmd,
	connect: connectCmd,
	close: closeCmd,
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

// Dump info
textEntryBox.key(['C-q'], function(ch, key) { dumpData() });

// Some line editing
textEntryBox.key(['C-u'], function(ch, key) { clearTextBox() });

// Scrolling
// OS X's default terminal apparently uses ^[OA and ^[OB instead, need
// to implemeent those. 
screen.enableMouse();
screen.on('wheelup', function(){ scrollBy(-1); });
screen.on('wheeldown', function(){ scrollBy(1); });
// This *might* work for OS X Terminal.app, untested
textEntryBox.key(['^[OA'], function(ch, key) { scrollBy(-1); });
textEntryBox.key(['^[OB'], function(ch, key) { scrollBy(1); });

textEntryBox.key(['C-y'], function(ch, key) { scrollBy(-1); });
textEntryBox.key(['C-e'], function(ch, key) { scrollBy(1); });

screen.on('resize', onScreenResize);

// Scroll the current tab by n lines (positive = down, negative = up)
var scrollBy = function scrollBy(n) {
	mainTabBar.activeTab.scrollBy(n);
	mainTabBar.updateBar();
	updateDividerBar();
};

// Put 'new messages below' text in divider bar if the channel
// has received messages while scrolled up. 
var updateDividerBar = function updateDividerBar() {
	mainTabBar.updateDividerBar();
};

var onScreenResize = function onScreenResize() {
	// Update tab bar
	mainTabBar.updateBar();
	// Scroll tabs back to the bottom if they were 
	// previously bottomed out. 
	for (i = 0; i < mainTabBar.numTabs; i++) {
		mainTabBar.tabs[i].checkScroll();
	};
	screen.render();
};

// Steam friends handling stuff. These are strictly friend relationship. 
// Nothing related to online/offline status happens here. 
// When we get 'relationships', it means node-steam has filled in
// the 'friends' property. 
var onSteamRelationships = function onSteamRelationships() {
	steamFriends = SteamFriends.friends;
	var numFriends = Object.keys(steamFriends).length;
	steamUsers = SteamFriends.personaStates;
	var numUsers = Object.keys(steamFriends).length;
	// We need to combine these two data structures into one, and also
	// request status data on them. 

	var idsToRequest = [];
	for (id in steamFriends) {
		idsToRequest.push(id);
		makeFlDataEntry(id);
	};
	SteamFriends.requestFriendData(idsToRequest);
	updateFriendsTab();
};

// Copy all props so we have a more independent copy of the data
var makeFlDataEntry = function makeFlDataEntry(id) {
	var flObj = {};
	flData[id] = flObj;
	flObj['friendStatus'] = steamFriends[id];
	var userObj = steamUsers[id];
	for (prop in userObj) {
		flObj[prop] = userObj[prop];
	};
	if (id == ownSteamId) {
		flObj.isYou = true;
	};
};

var getUserData = function getUserData(id) {
	if (id in flData) {
		return flData[id];
	} else if (id in steamUsers) {
		return steamUsers[id];
	};
	// I wonder if there's a way to get data for an arbitrary person
	// for when we don't have it in steam.users. 
	return {};
};

// The 'friend' event is when the state of one friend has
// changed. 
var onSteamFriend = function onSteamFriend(friend, relation) {
	steamFriends[friend] = relation;
	writeSystemMsg('New relation for friend ' + friend + ': ' + relation);
	makeFlDataEntry(friend);
	updateFriendsTab();
	
};

// Called when we receive a 'user' event which tells us
// about new user data. 
var onSteamUser = function onSteamUser(newUserData) {
	//writeSystemMsg('Got user data: ' + JSON.stringify(newUserData));
	var id = newUserData.friendid;
	if (id == ownSteamId) {
		updateOwnName(newUserData.player_name);
	};
	steamUsers[id] = newUserData;
	makeFlDataEntry(id);
	updateFriendsTab();
};

// This updates what we think our own account's name is
var updateOwnName = function updateOwnName(newName) {
	ownName = newName;
};

var determineOwnName = function determineOwnName() {
	if (ownSteamId in steamUsers) {
		updateOwnName(steamUsers[ownSteamId].player_name);
	};
};

var dumpData = function dumpData() {
	writeSystemMsg('Friends: ' + JSON.stringify(steamFriends));
	writeSystemMsg('Users: ' + JSON.stringify(steamUsers));
	writeSystemMsg('Joined: ' + JSON.stringify(flData));
	//writeSystemMsg(JSON.stringify(
};

// Update friends list content
var updateFriendsTab = function updateFriendsTab() {
	friendsTab.updateFriendsList();
};

// Create a tab for steam messaging
var createSteamMsgTab = function createSteamMsgTab(id) {
	var sendFunc = function sendFunc(msg) {
		this.addMsg(ownName, msg, true);
		sendSteamMessage(id, msg);
	}
	var newTab = new chatTab(screen, 'Steam:' + id, steamUsers[id].player_name, sendFunc);
	mainTabBar.addTab(newTab);
	return newTab;
};

// Check if a tab for a particular steam ID exists
// If switchTo is true, then switch to it. 
var findMsgTab = function findMsgTab(id, switchTo) {
	var idString = 'Steam:' + id;
	switchTo = switchTo | false;
	for (i = 0; i < mainTabBar.numTabs; i++) {
		var tab = mainTabBar.tabs[i];
		if (tab.channel == idString) {
			if (switchTo)
				mainTabBar.switchToNum(i);
			return {found: true, tab: tab};
		};
	};
	return {found: false};
};

// Create a tab for messaging if it doesn't exist. 
// Switch to it. 
var createOrSwitchMsgTab = function createOrSwitchMsgTab(id) {
	var found = findMsgTab(id, true).found;
	if (!found) {
		createSteamMsgTab(id);
		findMsgTab(id, true);
	};
};
	
var onSteamMsg = function onSteamMsg(id, message, type) {
	// Only react if it's a chat message
	if (type != 1) return;
	var result = findMsgTab(id);
	var tab;
	if (result.found) {
		// Do stuff
		tab = result.tab;
	} else {
		tab = createSteamMsgTab(id);
	};
	var userEntry = steamUsers[id];
	var name = userEntry.player_name;
	tab.addMsg(name, message, false);
	mainTabBar.updateBar();
};
var friendsTab = new friendsTabClass(screen, flData, createOrSwitchMsgTab);
mainTabBar.addTab(friendsTab);

var onSteamRP = function onSteamRP(id, text, extra1, extra2) {
	extra1 = extra1 || '';
	extra2 = extra2 || '';
	rpObj = {};
	rpObj.text = text;
	rpObj.arg1 = extra1;
	rpObj.arg2 = extra2;
	writeSystemMsg('Got RP Data: ' + [id, text, extra1, extra2].join('; '));
	var userObj = getUserData(id);
	userObj.rpObj = rpObj;
	userObj.rpString = rpToText(rpObj);
	updateFriendsTab();
};

var onDotaProfile = function onDotaProfile(id, profileData) {
	var profileString = JSON.stringify(profileData);
	writeSystemMsg('Profile ' + id + ' written to file');
	var fileName = 'p' + id + '.json';
	fs.writeFile(fileName, profileString);
	//writeSystemMsg('Profile ' + id + ': ' + JSON.stringify(profileData));
};
//if (steamcreds.steam_guard_code) logOnDetails.authCode = steamcreds.steam_guard_code;
//var sentry = fs.readFileSync('sentry');
//if (sentry.length) logOnDetails.shaSentryfile = sentry;
writeSystemMsg('Logging on to Steam...');
var SteamUser = new Steam.SteamUser(sc);
var SteamFriends = new Steam.SteamFriends(sc);


// Callback when the steam connection is ready
var onSteamLogOn = function onSteamLogOn(logonResp){
	if (logonResp.eresult == Steam.EResult.OK) {
		// Set display name
		ownSteamId = sc.steamID;
		SteamFriends.setPersonaState(Steam.EPersonaState.Online);
		setTimeout(determineOwnName, 4000);
		writeSystemMsg('Your steam ID: ' + ownSteamId);
		if (steamcreds.steam_name) {
			SteamFriends.setPersonaName(steamcreds.steam_name);
		};
		writeSystemMsg('Logged on to Steam');
		SteamFriends.on('relationships', function() { setTimeout(onSteamRelationships, 4000)});
		SteamFriends.on('friend', onSteamFriend);
		SteamFriends.on('personaState', onSteamUser);
		SteamFriends.on('friendMsg', onSteamMsg);
		//sc.on('richPresence', onSteamRP);
		// Start node-dota2
		dota.launch();
		dota.on('ready', onDotaReady);
		dota.on('unready', onDotaUnready);
		dota.on('chatMessage', onDotaChatMessage);
		dota.on('profileData', onDotaProfile);
	} else if (logonResp.eresult == 63) {
		sc.disconnect();
		var emailDomain = logonResp.email_domain;
		writeSystemMsg('Check your email address at ' + emailDomain + ' for a steam guard code. ');
		writeSystemMsg('Then, enter it with /sg <code>');
	} else {
		sc.disconnect();
		writeSystemMsg('Logon failed with error ' + logonResp.eresult + '.' );
		writeSystemMsg('Raw logon response: ' + JSON.stringify(logonResp));
		writeSystemMsg('Please check your username and password. If everything appears to be correct, please file a bug and include the above response. ');
		writeSystemMsg('In addition, check your email for a Steam Guard code. If you got one, enter it with /sg <code>');
	};
};

SteamUser.on('updateMachineAuth', steamFuncs.onUpdateMachineAuth);
sc.on('servers', steamFuncs.onSteamServers);
sc.connect();
sc.on('connected', function() {
	SteamUser.logOn(steamFuncs.getLogOnDetails());
});
sc.on('logOnResponse', onSteamLogOn);
var onSteamError = function() {
	sc.disconnect();
	// TODO
};
sc.on('error', onSteamError);
