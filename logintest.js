var Steam = require('steam');
var util = require('util');
var fs = require('fs');
var sc = new Steam.SteamClient();
var steamcreds = require('./steamcreds');

var steamUser = new Steam.SteamUser(sc);

var sentry = fs.readFileSync('sentry');

sc.on('sentry', function(sentry){
	util.log('Got Steam sentry');
	fs.writeFileSync('sentry', sentry);
});
sc.on('servers', function(servers) {
	util.log('Got Steam servers');
	fs.writeFile('servers', JSON.stringify(servers));
});
sc.connect();

var logOnDetails = {
	account_name: steamcreds.steam_user,
	password: steamcreds.steam_pass,
};
if (steamcreds.steam_guard_code)
	logOnDetails.auth_code = steamcreds.steam_guard_code;

var sha1 = function sha1(data) {
	var crypto = require('crypto');
	var shasum = crypto.createHash('sha1');
	shasum.update(data);
	return shasum.digest();
};
	
var sentry = fs.readFileSync('sentry');
if (sentry.length)
	logOnDetails.sha_sentryfile = sha1(sentry);

sc.on('connected', function() {
	steamUser.logOn(logOnDetails);
});

sc.on('logOnResponse', function(response) {
	util.log(JSON.stringify(response));
});


steamUser.on('updateMachineAuth', function(machineAuth, callback) {
	util.log('Got sentry');
	fs.writeFileSync('sentry', machineAuth.bytes);
	var sha = sha1(machineAuth.bytes);
	callback({sha_file: sha});
});
