// This file is for steam-related things that
// don't need to be in the main program. 
var fs = require('fs');
var crypto = require('crypto');
var steamcreds = require('./steamcreds');
var enteredSteamGuardCode = '';

var sha1sum = function sha1sum(data) {
	var shasum = crypto.createHash('sha1');
	shasum.update(data);
	return shasum.digest();
};

var onUpdateMachineAuth = function onUpdateMachineAuth(machineAuth, callback) {
	
	writeSystemMsg('Got sentry');
	fs.writeFileSync('sentry', machineAuth.bytes);
	var sha = sha1sum(machineAuth.bytes);
	callback({sha_file: sha});
};

var onSteamServers = function onSteamServers(servers) {
	writeSystemMsg('Got Steam servers');
	fs.writeFile('servers', JSON.stringify(servers));
};
	

// Assemble the log on details, including steam guard code if supplied and
// sentry data. 
var getLogOnDetails = function getLogOnDetails() {
	var logOnDetails = {
		account_name: steamcreds.steam_user,
		password: steamcreds.steam_pass,
	};
	if (enteredSteamGuardCode)
		logOnDetails.auth_code = enteredSteamGuardCode;
	var sentry;
	try {
		writeSystemMsg('Attempting to read sentry file');
		sentry = fs.readFileSync('sentry');
		if (sentry.length)
			writeSystemMsg('Reading from sentry file');
			logOnDetails.sha_sentryfile = sha1sum(sentry);
	} catch (e) {
	};
	return logOnDetails;
};

var setSteamGuardCode = function setSteamGuardCode(code) {
	enteredSteamGuardCode = code;
};

module.exports = {
	onUpdateMachineAuth: onUpdateMachineAuth,
	onSteamServers: onSteamServers,
	getLogOnDetails: getLogOnDetails,
	setSteamGuardCode: setSteamGuardCode,
};

