# microdota
Micro Dota 2 client using node-dota2

## Configuration 

To get it up and running, follow these steps:

1. touch sentry (create a blank file called sentry)
2. Rename config.js.example to config.js. 
3. Configure your chat channels and other options in config.js. 
4. Rename steamcreds.js.example to steamcreds.js. 
5. Put your username, password, and desired display name in steamcreds.js. 

If you use steam guard, you will need to follow these steps:

1. rm sentry ; touch sentry
2. Run the program, wait for the steam guard email, then put the steam guard code in steamcreds.js. 
3. Run the program normally, it should work. 

## Use 

Run 'node chat.js' to run the program. 
^P/^N go to the prev/next tab, ^C quits, and ^X displays a help message. Mousewheel up/down scrolls the current chat window up/down. 

## Requirements 

npm install should take care of the requirements, but you need to have node .10 (Doesn't work with .12). node-dota2 isn't updated for node .12 yet. 

## Common problems 

* Something about a module not self-registering: you have node >=0.12. See the requirements section. 
* Some crypto function not found: you have node-steam > 0.6.7. 
* Login failures: Keep trying the instructions above. Also keep in mind you can't have real dota open at the same time. 
* I can't scroll with the mouse: Your terminal program might not have mouse support. If the scroll wheel works in vim but not here, then file a bug. 
* No such file or directory 'sentry': touch sentry
* Other stuff: File a bug. 

