var blessed = require('blessed');

var chanTag = '{red-fg}{bold}';
var chanTagEnd = '{/red-fg}{/bold}';

var nameTag = '{cyan-fg}';
var nameTagEnd = '{/cyan-fg}';

var youTag = '{blue-fg}';
var youTagEnd = '{/blue-fg}';

// Class for a chat tab
// Doesn't have anything to do with the visual tab, that's 
// handled entirely in tabMan
var chatTab = function chatTab(screen, channel, title) {
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
	
};
// Activate the tab. 
// Only tabMan should call this. 
chatTab.prototype.makeActive = function(){
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
	this.screen.render();
	// unshownLines = the number of lines not seen because they're below
	// our visible area. 
	// getScroll() is kind of buggy but this doesn't matter for our purposes
	var unshownLines = this.tab.getScrollHeight() - this.tab.getScroll() - 1;
	setDebugInfo(' ' + this.tab.getScrollHeight() + ' ' + this.tab.getScroll());
	if (unshownLines > 0) {
		this.bottomScroll = false;
	} else {
		this.bottomScroll = true;
	}
};
// Update the actual text displayed in this box
chatTab.prototype.updateContent = function() {
	this.tab.content = this.chatBoxContent;
};
// Add a line
chatTab.prototype.append = function(text) {
	this.chatBoxContent = this.chatBoxContent + text;
	this.updateContent();
	if (this.bottomScroll) {
		this.tab.setScrollPerc(100);
	}
	if (!this.isActive) {
		this.numUnread++;
	};
	this.screen.render();
};
// Format and add a message
chatTab.prototype.addMsg = function(name, message, own) {
	own = own | false;
	var namePart;
	if (own) {
		name = name + ' (You)'
		namePart = youTag + name + youTagEnd + ': ';
	} else {
		namePart = nameTag + name + nameTagEnd + ': ';

	};
	var chanPart = '<' + chanTag + this.channel + chanTagEnd + '> ';
	var msgPart = message;
	fullText = chanPart + namePart + msgPart + '\n';
	this.append(fullText);
};
		

// Tab manager class
// Handles keeping track of tabs, switching between them, 
// and the tab bar. 
var tabMan = function tabMan(initTab, chanLabel, tabBar, screen) {
	this.tabs = [initTab];
	this.activeIndex = 0;
	this.numTabs = 1;
	this.tabs[this.activeIndex].makeActive();
	this.activeTab = this.tabs[this.activeIndex];
	this.chanLabel = chanLabel;
	this.tabBar = tabBar;
	this.screen = screen;
	this.updateChanLabel();
	this.updateBar();
};

tabMan.prototype.switchToNum = function(n) {
	this.tabs[this.activeIndex].makeInactive();
	this.activeIndex = n;
	this.activeTab = this.tabs[this.activeIndex];
	this.updateChanLabel();
	this.tabs[this.activeIndex].makeActive();
	this.updateBar();
};

tabMan.prototype.updateChanLabel = function() {
	this.chanLabel.content = 'Send a message to ' + this.activeTab.channel + ':';
	this.screen.render();
}
	

tabMan.prototype.next = function() {
	var n = this.activeIndex + 1;
	if (n == this.numTabs) {
		n = 0;
	}
	this.switchToNum(n);
}
tabMan.prototype.prev = function() {
	var n = this.activeIndex - 1;
	if (n == -1) {
		n = this.numTabs - 1;
	};
	this.switchToNum(n);
};
tabMan.prototype.addTab = function(tab) {
	this.tabs.push(tab);
	this.numTabs += 1;
	this.updateBar();
};
tabMan.prototype.getChanTab = function(chan) {
	for (i = 0; i < this.numTabs; i++) {
		if (this.tabs[i].channel == chan) {
			return this.tabs[i];
		};
	};
	return null;
};

tabMan.prototype.updateBar = function() {
	barText = ' ';
	for (i = 0; i < this.numTabs; i++) {
		var tab = this.tabs[i];
		var chan = tab.title;
		var isActive = tab.isActive;
		var unread = tab.numUnread;
		var hasUnread = (unread > 0); 
		//barText += ' ';
		if (isActive) {
			barText += '{black-fg}{white-bg} ' + chan +  ' (' + unread + ') {/black-fg}{/white-bg}';
		} else {
			if (hasUnread){
				barText += '{red-fg}{black-bg} ' + chan + ' (' + unread + ') {/red-fg}{/black-fg}';
			} else {
				//barText += '{white-fg}{black-bg} ' + chan +  ' (' + unread + ') ';
				barText += ' ' + chan +  ' (' + unread + ') ';
			};
		};
		//barText += '{white-fg}{black-bg}';
	};

	this.tabBar.setContent(barText);
	//setDebugInfo(barText);
	this.screen.render();
};

module.exports = {
	chatTab: chatTab,
	tabMan: tabMan,
};
