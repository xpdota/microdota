// BIG TODO:
// Turn entries (whether chat messages, list objects, whatever) into
// objects that stringify themselves and keep track of their own 
// selected/deselected state. 


// TODO: add trimming support for when a chat log gets absolutely huge
// (cut off the beginning of it). No need to handle scroll positions since 
// it would be better to not trim any windows where the user is scrolled up
// since they might be reading the stuff we want to trim. 

// Really, the chat tab should be a list of entries like how the friends list
// is. 

var blessed = require('blessed');

// Formatting tags for channel names, 
// other peoples' names, and your own name. 
var chanTag = '{red-fg}{bold}';
var chanTagEnd = '{/red-fg}{/bold}';

var nameTag = '{cyan-fg}';
var nameTagEnd = '{/cyan-fg}';

var youTag = '{blue-fg}';
var youTagEnd = '{/blue-fg}';

// Class for a chat tab
// Doesn't have anything to do with the visual tab, that's 
// handled entirely in tabMan
var chatTab = function chatTab(screen, channel, title, sendFunc) {
	this.screen = screen;
	this.channel = channel;
	this.title = title;
	this.tab = blessed.text({
		top: 2, 
		left: 0, 
		width: '100%',
		height: '100%-6',
		tags: true,
		//style: { fg: 'white', bg: 'black' },
		scrollable: true,
		alwaysScroll: true,
		visible: false,
	});
	// bottomScroll means that the chat is scrolled down as far as it can go, 
	// so when new lines are put in the chat, it should keep it scrolled down. 
	// If you manually scroll up, this becomes false, so the chat won't scroll down
	// while you're reading something up above. 
	this.bottomScroll = true;
	this.screen.append(this.tab);
	this.tab.hide();
	this.active = false;
	this.screen.render();
	this.chatBoxContent = 'Joined channel ' + channel + '\n';
	this.tab.content = this.chatBoxContent;
	this.numUnread = 0;
	this.msgBelow = false;
	// Probably want a better way of doing this
	this.isSteamMsg = (channel.slice(0, 6) == 'Steam:');
	this.acceptsInput = true;
	this.sendFunc = sendFunc;
	this.commands = [];
	this.closable = true;
};
chatTab.prototype.sendInput = function(entryObj) {
	if (entryObj.isMsg) {
		this.sendFunc(entryObj.msg);
	};
};
// Activate the tab. 
// Only tabMan should call this. 
chatTab.prototype.makeActive = function() {
	this.isActive = true;
	this.tab.show();
	if (this.bottomScroll) {
		this.tab.setScrollPerc(100);
	};
	this.screen.render();
	this.numUnread = 0;
};
// Deactivate the tab. 
// Only tabMan should call this. 
chatTab.prototype.makeInactive = function() {
	this.isActive = false;
	this.tab.hide();
	this.screen.render();
};
// Scroll up/down by n lines. 
chatTab.prototype.scrollBy = function(n) {
	this.tab.scroll(n);
	// unshownLines = the number of lines not seen because they're below
	// our visible area. 
	// getScroll() is kind of buggy but this doesn't matter for our purposes
	var unshownLines = this.tab.getScrollHeight() - this.tab.getScroll() - 1;
	if (unshownLines > 0) {
		this.bottomScroll = false;
	} else {
		this.bottomScroll = true;
		this.msgBelow = false;
	};
	//setDebugInfo(' ' + this.tab.getScrollHeight() + ' ' + this.tab.getScroll() + ' ' + this.msgBelow);
	this.screen.render();
};
// Update the actual text displayed in this box
chatTab.prototype.updateContent = function() {
	this.tab.content = this.chatBoxContent;
};
// Scroll back to the bottom if necessary
chatTab.prototype.checkScroll = function() {
	if (this.bottomScroll) {
		this.tab.setScrollPerc(100);
	};
};
// Add a line
chatTab.prototype.append = function(text) {
	this.chatBoxContent = this.chatBoxContent + text;
	this.updateContent();
	this.checkScroll();
	if (this.isActive) {
		if (!this.bottomScroll) {
			this.msgBelow = true;
		}
	} else {
		this.numUnread++;
	};
	this.screen.render();
};
// Format and add a message
chatTab.prototype.addMsg = function(name, message, own) {
	own = own || false;
	var namePart;
	if (own) {
		name = name + ' (You)'
		namePart = youTag + name + youTagEnd + ': ';
	} else {
		namePart = nameTag + name + nameTagEnd + ': ';
	};
	var chanPart;
	if (this.isSteamMsg) {
		chanPart = '';	
	} else {
		chanPart = '<' + chanTag + this.channel + chanTagEnd + '> ';
	};
	var msgPart = message;
	fullText = chanPart + namePart + msgPart + '\n';
	this.append(fullText);
};

// Initial code for closing a tab
chatTab.prototype.close = function() {
	this.makeInactive();
	this.screen.detach(this.tab);
};

// Tab manager class
// Handles keeping track of tabs, switching between them, 
// and the tab bar. 
var tabMan = function tabMan(initTab, chanLabel, tabBar, screen, dividerBar) {
	this.tabs = [initTab];
	this.activeIndex = 0;
	this.numTabs = 1;
	this.tabs[this.activeIndex].makeActive();
	this.activeTab = this.tabs[this.activeIndex];
	this.chanLabel = chanLabel;
	this.tabBar = tabBar;
	this.dividerBar = dividerBar;
	this.screen = screen;
	this.updateChanLabel();
	this.updateBar();
};

// TODO: needs fixing for system tab
tabMan.prototype.updateDividerBar = function() {
	var msgBelow = this.activeTab.msgBelow;
	if (msgBelow) {
		this.dividerBar.content = '   ↓ Scroll down to see new messages ↓';
	} else {
		this.dividerBar.content = '';
	};
	this.screen.render();
};

// Switch to the numbered tab
// TODO: actually validate the number
tabMan.prototype.switchToNum = function(n) {
	this.tabs[this.activeIndex].makeInactive();
	this.activeIndex = n;
	this.activeTab = this.tabs[this.activeIndex];
	this.updateChanLabel();
	this.tabs[this.activeIndex].makeActive();
	this.updateBar();
};

tabMan.prototype.closeCurrentTab = function() {
	this.closeTabNum(this.activeIndex);
};
	
// Close tab n
// Returns true/false based on whether the tab
// was actually closable or not. 
tabMan.prototype.closeTabNum = function(n) {
	var tab = this.tabs[n];
	if (tab.closable) {
		var oldActiveIndex = this.activeIndex;
		var newActiveIndex;
		tab.close();
		this.tabs.splice(n, 1);
		this.numTabs = this.tabs.length;
		// Case where we're removing the active tab
		if (n == oldActiveIndex) {
			if (oldActiveIndex >= this.numTabs) {
				newActiveIndex = this.numTabs - 1;
			} else {
				newActiveIndex = oldActiveIndex;
			};
		} else if (n < oldActiveIndex) {
			// case where the tab we're removing is before the active tab
			newActiveIndex = oldActiveIndex - 1;
		} else if (n > oldActiveIndex) {
			// Case where the tab we're removing is after the active tab
			// Nothing to do here
		};
		this.tabs[newActiveIndex].makeActive();
		this.activeTab = this.tabs[newActiveIndex];
		this.activeIndex = newActiveIndex;
		this.updateChanLabel();
		this.updateBar();
		return true;
	} else {
		return false;
	};
};

// Update the 'send a message to <channel>' label
tabMan.prototype.updateChanLabel = function() {
	this.chanLabel.content = 'Send a message to ' + this.activeTab.title + ':';
	this.screen.render();
}
	
// Switch to next tab
tabMan.prototype.next = function() {
	var n = this.activeIndex + 1;
	if (n == this.numTabs) {
		n = 0;
	}
	this.switchToNum(n);
}
//Switch to prev tab
tabMan.prototype.prev = function() {
	var n = this.activeIndex - 1;
	if (n == -1) {
		n = this.numTabs - 1;
	};
	this.switchToNum(n);
};

// Push a new tab to the end of the list
tabMan.prototype.addTab = function(tab) {
	this.tabs.push(tab);
	this.numTabs += 1;
	this.updateBar();
};

// Get the tab for a named channel
tabMan.prototype.getChanTab = function(chan) {
	for (i = 0; i < this.numTabs; i++) {
		if (this.tabs[i].channel == chan) {
			return this.tabs[i];
		};
	};
	return null;
};

// Update the tab bar. 
// This should be called whenever something that would 
// change the tab bar happens. 
tabMan.prototype.updateBar = function() {
	// Make a visual tab for each logical tab
	var barText = '';
	for (i = 0; i < this.numTabs; i++) {
		var tab = this.tabs[i];
		// We're using the title rather than the channel name
		// which is going to be the same except for System
		var chan = tab.title;
		var isActive = tab.isActive;
		// As a temporary hack, tabs that do not support unread
		// message count can simply report -1 unread messages
		var supportsUnread = (tab.numUnread >= 0);
		var unread;
		var hasUnread;
		if (supportsUnread) {
			unread = tab.numUnread;
			hasUnread = (unread > 0); 
		} else {
			unread = 0;
			hasUnread = false;
		};
		// There are three ways a tab can be formatted:
		// Inactive, no unread (white on black)
		// Inactive, unread (red on black)
		// Active, no unread (black on white)
		// Active, unread (undecided). Only happens when you scroll up and
		//		more message arrive in the meantime, but this is not implemented yet. 

		var openTag = '';
		var closeTag = '';
		var showUnread = supportsUnread;
		
		if (isActive) {
			openTag = '{black-fg}{white-bg}';
			closeTag = '{/black-fg}{/white-bg}';
		} else {
			if (supportsUnread && hasUnread) {
				openTag = '{red-fg}{black-bg}';
				closeTag = '{/red-fg}{/black-bg}';
			} else {
				openTag = '';
				closeTag = '';
			};
		};	

		var thisTabText = '';
		// Add opening style tag
		thisTabText += openTag;
		// Space before the text
		thisTabText += ' ';
		thisTabText += chan;

		if (showUnread) {
			thisTabText += ' (' + unread + ')';
		};
		thisTabText += ' ';
		thisTabText += closeTag;
		barText += thisTabText;
	};

	// Push our new tab bar content
	this.tabBar.setContent(barText);
	this.screen.render();
};

// Class for the friends list tab. 
var friendsTab = function friendsTab(screen, flData, sendMessageFunc) {
	this.screen = screen;
	this.channel = '<friends>';
	this.title = 'Friends';
	this.tab = blessed.text({
		top: 2,
		left: 0,
		width: '100%',
		height: '100%-6',
		tags: true,
		scrollable: true,
		alwaysScroll: true,
		visible: false,
	});
	this.flData = flData;
	this.entries = [];
	this.activeLine = 0;
	// numUnread = -1 means "hide the unread count"
	this.numUnread = -1;
	this.msgBelow = false;
	this.tab.hide();
	this.isActive = false;
	this.numLines = 0;
	this.acceptsInput = true;
	this.screen.append(this.tab);
	this.screen.render();
	this.sendFunc = sendMessageFunc;
	this.closable = false;

};
friendsTab.prototype.makeActive = function() {
	this.isActive = true;
	this.tab.show();
	this.screen.render();
};
friendsTab.prototype.makeInactive = function() {
	this.isActive = false;
	this.tab.hide();
	this.screen.render();
};
friendsTab.prototype.getActiveEntry = function() {
	var activeEntry = this.entries[this.activeLine];
	return activeEntry;
};
friendsTab.prototype.sendInput = function(entryObj) {
	var activeEntry = this.getActiveEntry();
	var idToMsg = this.getActiveEntry().id;
	if (idToMsg) {
		this.sendFunc(idToMsg);
	};
};

// Currently, we're using scrolling here to mean "inc/dec selection", 
// not actually scroll the viewport. I'll have to figure out what we're doing
// here. I'll probably adapt a scrolloff-like approach, where the viewport 
// follows the selection, with a buffer of a few lines above and below it 
// if possible. 
friendsTab.prototype.scrollBy = function(n) {
	this.entries[this.activeLine].makeInactive();
	this.activeLine += n;
	if (this.activeLine < 0) this.activeLine = 0;
	if (this.activeLine >= this.numLines) this.activeLine = this.numLines - 1;
	this.entries[this.activeLine].makeActive();
	this.updateContent();
};

// This is what will get called when the friend data itself changes
friendsTab.prototype.updateFriendsList = function() {
	// Need to get the the old active ID
	var findActive = false;
	var newActiveLine = 0;
	if (this.activeLine > 0) {
		findActive = true;
		var oldActiveId = this.entries[this.activeLine].id;
	};
	var foundActiveId = false;
	var header = {
		id: false,
		toMenuString: function() { return 'Friends list: '; },
		makeActive: function() { this.isActive = true; },
		makeInactive: function() { this.isActive = false; },
		getSortPos: function() { return -1; }
	};
	if (this.activeLine == 0) {
		header.makeActive();
	};
	unsorted = [header];
	this.entries = [];
	for (id in this.flData) {
		var flObj = new friendEntry(id, this.flData[id]);
		unsorted.push(flObj);
	};
	var numPasses = 7;
	for (pass = -1; pass < numPasses; pass++){
		for (i = 0; i < unsorted.length; i++) {
			var flObj = unsorted[i];
			var sortPos = flObj.getSortPos();
			if (pass == sortPos) {
				this.entries.push(flObj);
			};
		};
	};
	for (i = 0; i < this.entries.length; i++) {
		var flObj = this.entries[i];
		if (flObj.id == oldActiveId) {
			foundActiveId = true;
			newActiveLine = i;
			flObj.makeActive();
		};
	};
	this.activeLine = newActiveLine;
	this.numLines = this.entries.length;
	this.updateContent();
};
// This is the screen refreshing function when you scroll or do some other option
friendsTab.prototype.updateContent = function() {
	// actually do stuff with the selection. 
	// Function to add a line, highlight it if it's the active line, and 
	// incremenet lineNum. 
	// The final value of lineNum is used to set this.numLines which
	// is used to restrict selection to valid lines. 
	var content = '';
	var numLines = this.entries.length;

	var addLine = function(flObj) {
		var line = flObj.toMenuString();
		if (flObj.isActive) {
			content += '{inverse}' + line + '{/inverse}\n';
		} else {
			content += line + '\n';
		};
	};
	// Get the hacky sort order for friend list entries
	var numPasses = 7;
	for (pass = -1; pass < numPasses; pass++){
		for (i = 0; i < numLines; i++) {
			var flObj = this.entries[i];
			var sortPos = flObj.getSortPos();
			if (pass == sortPos) {
				addLine(flObj)
			};
		};
	};
	// Update actual text box content and update the screen. 
	this.tab.content = content;
	this.screen.render();
	
};

friendsTab.prototype.append = function() {
	// this needs to do nothing, not sure if there's a better
	// way of handling this. We don't want the user to lose
	// messages but this isn't a typical log-style tab. 
	// TODO: just have this (and below) redirect to the equivalent
	// functions on the system tab. 
};
friendsTab.prototype.addMsg = function() {
	// Same thing here
};

personaStateNames = {
	0: 'Offline',
	1: 'Online',
	2: 'Busy',
	3: 'Away',
	4: 'Snooze',
	5: 'Looking to Trade',
	6: 'Looking to Play',
	7: 'Max' // No idea what this is
};
friendStatusNames = {
	0: 'Not Friends',
	1: 'Blocked',
	2: 'Pending',
	3: 'Friends',
	4: 'Invited',
	5: 'Ignored',
	6: 'Ignored Friend',
	7: 'Suggested Friend',
	8: 'Friends List Full',
};

var friendEntry = function friendEntry(id, flEntry) {
	this.flEntry = flEntry;
	this.id = id;
	this.name = flEntry.player_name;
	this.gameName = flEntry.game_name;
	this.isActive = false;
	this.onlineStatus = flEntry.persona_state;
	this.statusText = personaStateNames[this.onlineStatus];
	this.friendStatus = flEntry.friendStatus || 0;
	this.friendStatusText = friendStatusNames[this.friendStatus];
	// RIP
	this.rpText = false;
	//this.rpText = flEntry.rpString || false;
};
friendEntry.prototype.makeActive = function() {
	this.isActive = true;
};
friendEntry.prototype.makeInactive = function() {
	this.isActive = false;
};
friendEntry.prototype.getSortPos = function() {
	// Blocked
	if (this.friendStatus == 1)
		return 6;
	// Outgoing friend request
	if (this.friendStatus == 4)
		return 5;
	// Incoming friend request
	if (this.friendStatus == 2)
		return 1;
	// Playing dota
	if (this.gameName == 'Dota 2')
		return 0;
	// Playing any game
	if (this.gameName)
		return 2;
	// Online
	if (this.onlineStatus > 1)
		return 3;
	// Offline
	if (this.onlineStatus == 0)
		return 4;
	// Anything we missed
	return 4;
};
friendEntry.prototype.toMenuString = function() {
	var out = '';
	out += this.name;
	var statusCode = this.onlineStatus;
	// Only display status if it's something other than "online"
	var needStatus = (statusCode != 1 && statusCode != undefined);
	var auxParts = [];
	if (this.gameName) {
		auxParts.push('Playing ' + this.gameName);
	};
	if (needStatus) {
		auxParts.push(this.statusText);
	};
	/*if (this.rpText) {
		auxParts.push(this.rpText);
	};*/
	if (this.friendStatus != 3) {
		auxParts.push(this.friendStatusText);
	};
		
	if (auxParts.length > 0) {
		var auxText = auxParts.join(', ');
		out += ' (' + auxText + ')';
	};
	// Do tags
	var openTag = '';
	var closeTag = '';
	if (this.friendStatus == 2) {
		openTag = '{yellow-fg}';
		closeTag = '{/yellow-fg}';
	} else if (this.friendStatus == 4) {
		openTag = '{magenta-fg}';
		closeTag = '{/magenta-fg}';
	} else if (this.friendStatus == 1 || this.friendStatus == 5) {
		openTag = '{red-fg}';
		closeTag = '{/red-fg}';
	} else if (this.gameName == 'Dota 2') {
		openTag = '{cyan-fg}';
		closeTag = '{/cyan-fg}';
	} else if (this.gameName) {
		openTag = '{green-fg}';
		closeTag = '{/green-fg}';
	} else if (statusCode > 0) {
		openTag = '{blue-fg}';
		closeTag = '{/blue-fg}';
	};
	return openTag + out + closeTag;
};
	

module.exports = {
	chatTab: chatTab,
	tabMan: tabMan,
	friendsTab: friendsTab,
};
