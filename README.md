# microdota
Micro Dota 2 client using node-dota2

## Configuration 

To get it up and running, follow these steps:

1. Rename config.js.example to config.js. 
2. Configure your chat channels and other options in config.js. 
3. Rename steamcreds.js.example to steamcreds.js. 
4. Put your username and password in steamcreds.js. If you want it to automatically set your display name, you can uncomment that line. 

If you use steam guard, you will need to follow these steps:

1. Run the program, wait for the steam guard email, then put the steam guard code in steamcreds.js (uncomment the line).  
2. Run the program normally, it should work. If it doesn't, comment out the steam guard line and delete sentry. 

## Use 

Run 'node chat.js' to run the program.

^P/^N go to the prev/next tab, ^C quits, and ^X displays a help message. Mousewheel up/down and ^E/^Y scrolls the current chat window up/down.

The two default tabs are the system log tab and the friends list. You can select a friend from the friends list and press enter to start steam messaging them. 

## Requirements 

Currently, you'll need node .12. 
Use npm install to automatically install most of the requirements. 
You'll need to manually replace the node-dota2 that gets installed (`node_modules/dota2`) with the node-steam-1.1.0 branch. 

## Common problems 

* Login failures: Keep trying the instructions above. Also keep in mind you can't have real dota open at the same time on that account.  
* I can't scroll with the mouse: OS X's terminal doesn't send the right codes for scrolling. For any other terminals, make sure mouse scrolling works in vim. If it works there but not here, file a bug. 
* Other stuff: File a bug. 
