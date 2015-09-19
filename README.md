# microdota
Micro Dota 2 client using node-dota2

## Configuration 

To get it up and running, follow these steps:

1. Rename `config.js.example` to `config.js`. 
2. Configure your chat channels and other options in `config.js`. 
3. Rename `steamcreds.js.example` to `steamcreds.js`. 
4. Put your username and password in `steamcreds.js`. If you want it to automatically set your display name, you can uncomment that line. 

Steam Guard support has been improved immensely. You simply run the program as normal, then when it asks for your SG code, type `/sg <code>`. 

## Use 

Run `node chat.js` to run the program.

^P/^N go to the prev/next tab, ^C quits, and ^X displays a help message. Mousewheel up/down and ^E/^Y scrolls the current chat window up/down. Generally, Enter performs some context-specific action, like sending a message/command or selecting a person in the friends list. 

The two default tabs are the system log tab and the friends list. You can select a friend from the friends list and press enter to start steam messaging them. Steam messaging tabs will also be automatically opened when you receive a message. 

Tabs display their number of unread messages in parenthesis and turn red if they have unread messages. Tabs will generally stay scrolled to the bottom when receiving new messages if that's how you left them. If you scroll up, they'll stay at their current scroll position. 

## Requirements 

Currently, you'll need node 0.12. 
Use `npm install` to automatically install the requirements. 

## Common problems 

* Login failures: Try the instructions a few times and verify that your username, password, and steam guard code are entered correctly. If it still doesn't work, file a bug. Note the error code you get on logon failures, and also try running the `logintest.js` (you'll need to specify your steam guard code in `steamcreds.js` for this one). 
* I can't scroll with the mouse: OS X's terminal doesn't send the right codes for scrolling. For any other terminals, make sure mouse scrolling works in vim. If it works there but not here, file a bug. 
* Other stuff: File a bug. 

## Features

* Logging into Steam, including Steam Guard support. 
* View friends list. 
* Send and receive Steam messages. 
* Join and send messages to Dota 2 chat channels. 
