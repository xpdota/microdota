var rpStatuses = {
	'#DOTA_RP_INIT': 'Main Menu',
	'#DOTA_RP_FINDING_MATCH': 'Finding Match',
	'#DOTA_RP_PLAYING_AS': 'Playing as',
	'#DOTA_RP_IDLE': 'Idle',
};

var rpToText = function rpToText(rpObj) {
	// Parse object
	var text = rpObj.text;
	var arg1 = rpObj.arg1;
	var arg2 = rpObj.arg2;
	// Playing as is a special case since it gets arguments
	if (text == '#DOTA_RP_PLAYING_AS') {
		var out = 'Playing as ' + arg2 + ' (Level ' + arg1 + ')';
		return out;
	};
	// Use known values defined in rpStatuses
	if (text in rpStatuses) {
		return rpStatuses[text];
	};
	// If we still can't figure it out then use this as a fallback
	// rather than silently failing so we can see and identify the 
	// unknown RP status
	return [text, arg1, arg2].join('; ');
};

module.exports = {
	rpToText: rpToText
};
