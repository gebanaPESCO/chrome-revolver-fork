/* global chrome */
var	tabsManifest = {},
	settings = {},
	advSettings = {},
	windowStatus = {},
	moverTimeOut = {},
	listeners = {};

// Runs initSettings after it checks for and migrates old settings.
checkForAndMigrateOldSettings(function(){
	initSettings();	
});

function NoOp() {
}

function initSettings(){
	badgeTabs("default");
	createBaseSettingsIfTheyDontExist();
	addEventListeners(function(){
		autoStartIfEnabled(chrome.windows.WINDOW_ID_CURRENT);
	});	
}
// **** Tab Functionality ****
// Start revolving the tabs
function go(windowId) {
	chrome.tabs.query({"windowId": windowId, "active": true}, function(tab){
		grabTabSettings(windowId, tab[0], function(tabSetting){
			setMoverTimeout(windowId, tabSetting.seconds);
			windowStatus[windowId] = "on";
			badgeTabs('on', windowId);
		});	
	});
}
// Stop revolving the tabs
function stop(windowId) {
	removeTimeout(windowId);
	chrome.tabs.query({"windowId": windowId, "active": true}, function(tab){
		windowStatus[windowId] = "off";
		badgeTabs('', windowId);
	});
}
// Switch to the next tab.
function activateTab(nextTab) {
	grabTabSettingsById(nextTab.windowId, nextTab, function(tabSetting){
		if(tabSetting.reload && !include(settings.noRefreshList, nextTab.url) && nextTab.url.substring(0,19) != "chrome://extensions"){
			chrome.tabs.reload(nextTab.id, function(){
				chrome.tabs.update(nextTab.id, {selected: true}, function(){
					setMoverTimeout(tabSetting.windowId, tabSetting.seconds);
				});
			});
		} else {
			// Switch Tab right away
			chrome.tabs.update(nextTab.id, {selected: true});
			setMoverTimeout(tabSetting.windowId, tabSetting.seconds);
		}	
	});
}

// compare a URL without query string and hash
//
function compareURL(detectURLParams, tab1, tab2) {
	if ( detectURLParams ) {
		return stripURL(tab1.url)===stripURL(tab2.url);
	}
	return tab1.url===tab2.url;
}

// Call moveTab if the user isn't interacting with the machine
function moveTabIfIdle(timerWindowId, tabTimeout) {
	if (settings.inactive) {
		// 15 is the lowest allowable number of seconds for this call
		chrome.idle.queryState(15, function(state) {
			if(state == 'idle') {
				windowStatus[timerWindowId] = "on";
				badgeTabs("on", timerWindowId);
				return moveTab(timerWindowId);
			} else {
				windowStatus[timerWindowId] = "pause";
				badgeTabs("pause", timerWindowId);
				return setMoverTimeout(timerWindowId, tabTimeout);
			}
		});
	} else {
		moveTab(timerWindowId);
	}
}
// Switches to next tab in the index, re-requests feed if at end of the index.
function moveTab(timerWindowId) {
	var nextTabIndex = 0;
	chrome.tabs.getSelected(timerWindowId, function(currentTab){
		chrome.tabs.getAllInWindow(timerWindowId, function(tabs) {
			if(currentTab.index + 1 < tabs.length) {
				nextTabIndex = currentTab.index + 1;
			} else {
				nextTabIndex = 0;
			}
			activateTab(tabs[nextTabIndex]);
		});
	});
}


// Initiates a login sequence with the tab
function doLoginWithTab(tab, tabSettings, callback) {
	console.log("DOING LOGIN WITH tabSettings", tabSettings);
	chrome.tabs.sendMessage(tabSettings.id, {"type": "LOGIN", "settings":  tabSettings}, function(response) {
	    callback( tab, tabSettings, response );
	});
}

// Redirects to another URL after login
function doRedirectWithTab(tab, tabSettings, callback) {
	console.log("DOING REDIRECT WITH tabSettings", tabSettings);
	chrome.tabs.sendMessage(tabSettings.id, {"type": "REDIRECT", "settings":  tabSettings}, function(response) {
	    callback( tab, tabSettings, response );
	});
}
// Checks if we need to relogin the user
function doCheckWithTab(tab, tabSettings, callback) {
	console.log("DOING CHECK WITH tabSettings", tabSettings);
	chrome.tabs.sendMessage(tabSettings.id, {"type": "CHECK", "settings":  tabSettings}, function(response) {
	    callback( tab, tabSettings, response );
	});
}


// **** Event Listeners ****
// Creates all of the event listeners to start/stop the extension and ensure badge text is up to date.
function addEventListeners(callback){
	chrome.browserAction.onClicked.addListener(function(tab) {
		var windowId = tab.windowId;
		if (windowStatus[windowId] == "on" || windowStatus[windowId] == "pause") {
			stop(windowId);
		} else {
			createTabsManifest(windowId, function(){
				go(windowId);
			});
		}
	});	
	chrome.windows.onRemoved.addListener(
		listeners.onWindowRemoved = function(windowId){
			removeTimeout(windowId);
			delete moverTimeOut[windowId];
			delete windowStatus[windowId];
			delete tabsManifest[windowId];
		}
	);
	chrome.tabs.onCreated.addListener(
		listeners.onCreated = function (tab){
			createTabsManifest(tab.windowId, function(){
				setBadgeStatusOnActiveWindow(tab);	
			});
		}
	);
	chrome.tabs.onUpdated.addListener(
		listeners.onUpdated = function onUpdated(tabId, changeObj, tab){
			setBadgeStatusOnActiveWindow(tab);

			var loginTimeoutWait = ( settings.loginTimeout * 1000 );
			var redirectTimeoutWait = ( settings.redirectTimeout * 1000 );

			function onLoginResponse( tab, tabSettings, status ) {
				doRedirectTimeout(tab, tabSettings);	
			}
			function onRedirectResponse( tab, tabSettings, status ) {
			}
			function doLoginTimeout(tab, tabSettings) {
				setTimeout(function() {
					if (windowStatus[tab.windowId]!=="on"){
						return;
					}

					doLoginWithTab(tab, tabSettings, onLoginResponse);
				},  loginTimeoutWait);
			}
			function doRedirectTimeout(tab, tabSettings) {
				setTimeout(function() {
					if (windowStatus[tab.windowId]!=="on"){
						return;
					}

					if (tabSettings.redirectUrl!==""){
						doRedirectWithTab(tab, tabSettings, onRedirectResponse);
					}
				},  redirectTimeoutWait);
			}


			function doUpdateSequence( tab, tabSettings ) {
				if (windowStatus[tab.windowId]!=="on"){
					return;
				}
				function checkNeedsLogin() {
					function promiseFn( resolve, reject ) {	
						function onCheckResponse(tab, tabSettings, status ) {
							if ( status ) {
								return resolve();
							}
							return reject();
						}
						if ( !tabSettings.login) {
							return reject();
						}
						if ( tabSettings.prevTab && !compareURL(tabSettings.detectURLParams, tabSettings.prevTab, tabSettings)) {
						    return resolve();
						}
						//when the prevUrl is the same we ask to check if
						//the DOM has the login elements
						doCheckWithTab(tab,tabSettings, onCheckResponse);
					}
					return new Promise( promiseFn );

				}
				checkNeedsLogin().then(function() {
					doLoginTimeout(tab, tabSettings);
				}, NoOp);
			}

			if(changeObj.status === "complete") createTabsManifest(tab.windowId, function(){
				//have we been logged out or do we need a redirect?
			 	grabTabSettingsById( tab.windowId, tab, function( tabSettings ) {
					 doUpdateSequence( tab, tabSettings );
				} );
				return true;
			});
		}
	);
	chrome.tabs.onActivated.addListener(
		listeners.onActivated = function(tab){
			checkIfWindowExists(tab.windowId, function(windowExists){
				if (windowExists == true) setBadgeStatusOnActiveWindow(tab);
			});
		}
	);
	chrome.tabs.onAttached.addListener(
		listeners.onAttached = function(tabId, newWindow){
			createTabsManifest(newWindow.newWindowId, function(){
				return true;
			});
		}
	);
	chrome.tabs.onDetached.addListener(
		listeners.onDetached = function(tabId, detachWindow){
			createTabsManifest(detachWindow.oldWindowId, function(){
				return true;
			});
		}
	);
	chrome.tabs.onRemoved.addListener(
		listeners.onRemoved = function(tabId, removedInfo){
			if(!removedInfo.isWindowClosing){
				createTabsManifest(removedInfo.windowId, function(){
					return true;
				});	
			}
		}
	);
	chrome.windows.onCreated.addListener(
		listeners.onWindowCreated = function(window){
			autoStartIfEnabled(window.id);
		}
	);
	return callback();
};
// **** Badge Status ****
// If the window has revolver tabs enabled, make sure the badge text reflects that.
function setBadgeStatusOnActiveWindow(tab){
	if (windowStatus[tab.windowId] === "on") badgeTabs("on", tab.windowId);
	else if (windowStatus[tab.windowId] === "pause") badgeTabs("pause", tab.windowId);
	else badgeTabs("", tab.windowId);
}

// strip a URL for no query string or hash
function stripURL(url) {
  var withoutQs =  url.split("?")[0];
  var withoutHash = withoutQs.split("#"); 
  return withoutHash[ 0 ];
}

//Change the badge icon/background color.  
function badgeTabs(text, windowId) {
	if(text === "default") {
		chrome.browserAction.setBadgeText({text:"\u00D7"}); //Letter X
 		chrome.browserAction.setBadgeBackgroundColor({color:[255,0,0,100]}); //Red	
	} else {
		chrome.tabs.query({"windowId": windowId, "active": true}, function(tab){
			if(text === "on") {
				chrome.browserAction.setBadgeText({text:"\u2022", tabId: tab[0].id}); //Play button
		  		chrome.browserAction.setBadgeBackgroundColor({color:[0,255,0,100], tabId: tab[0].id}); //Green
			} else
			if (text === "pause"){
				chrome.browserAction.setBadgeText({text:"\u2022", tabId: tab[0].id}); //Play button
				chrome.browserAction.setBadgeBackgroundColor({color:[255,238,0,100], tabId: tab[0].id}); //Yellow
			} else {
				chrome.browserAction.setBadgeText({text:"\u00D7", tabId: tab[0].id}); //Letter X
		 		chrome.browserAction.setBadgeBackgroundColor({color:[255,0,0,100], tabId: tab[0].id}); //Red
			}
		});	
	}	
}		
// **** Timeouts ***
// Generate the timeout and assign it to moverTimeOut object.
function setMoverTimeout(timerWindowId, seconds){
	moverTimeOut[timerWindowId] = setTimeout(function(){
		removeTimeout(timerWindowId);
		moveTabIfIdle(timerWindowId, seconds);
	}, parseInt(seconds)*1000);
}
// Remove the timeout specified.
function removeTimeout(windowId){
	clearTimeout(moverTimeOut[windowId]);
	moverTimeOut[windowId] = "off";
}
// **** Helpers ****
// If a user closes a window, chrome activates each tab (presumably to close them).  This prevents errors when the onActivated listener 
// is fired on the tabs being activated to close them.
function checkIfWindowExists(windowId, callback){		
	chrome.windows.getAll(function(windows){		
		for(var i=0;i<windows.length;i++){		
			if(windows[i].id === windowId){		
				return callback(true);		
			}		
		}		
		return callback(false);		
	});		
}
// Checks if a string exists in an array.
function include(arr,url) {
    return (arr.indexOf(url) != -1);
}
// Returns all the tabs for the current window.
function getAllTabsInCurrentWindow(callback){
	chrome.tabs.query({windowId: chrome.windows.WINDOW_ID_CURRENT}, function(tabs){
		callback(tabs);
	});
}
// **** Settings ****
// Checks each tab object for settings, if they don't exist assign them to the object.
function assignBaseSettings(tabs, callback) {
	for(var i = 0;i<tabs.length;i++){
		tabs[i].reload = (tabs[i].reload || settings.reload);
		tabs[i].seconds = (tabs[i].seconds || settings.seconds);	
	};
	callback();
}
// If there are advanced settings for the URL, set them to the tab.
function assignAdvancedSettings(tabs, callback) {
	for(var y=0;y<tabs.length;y++){
		for(var i=0;i<advSettings.length;i++){
			if(compareURL(advSettings[i].detectURLParams, advSettings[i], tabs[y])) {
				tabs[y].reload = advSettings[i].reload;
				tabs[y].seconds = advSettings[i].seconds;
			}
		}	
	}
	callback();
}
// If there are advanced settings for the URL, set them to the tab and check if we need to assign a login sequence.
function assignAdvancedSettingsAndState(prevTabs, tabs, callback) {
	function findPrevTab(tab) {
		if ( !prevTabs ) {
			return;
		}
		for (var i=0;i<prevTabs.length;i++) {
			if (prevTabs[i].id === tab.id) {
				return prevTabs[ i ];
			}
		}
	}
	for(var y=0;y<tabs.length;y++){
		var prevTab = findPrevTab( tabs[ y ] );	
		for(var i=0;i<advSettings.length;i++){
			var settings = advSettings[ i ];
			if( ( prevTab && compareURL(settings.detectURLParams, prevTab, settings) )
			||  ( compareURL(settings.detectURLParams, tabs[ y ], settings ) ) ) {
				tabs[y].login = advSettings[i].login;
				tabs[y].usernameCssSelector = advSettings[i].usernameCssSelector;
				tabs[y].username = advSettings[i].username;
				tabs[y].passwordCssSelector = advSettings[i].passwordCssSelector;
				tabs[y].password = advSettings[i].password;
				tabs[y].accountNoCssSelector = advSettings[i].accountNoCssSelector;
				tabs[y].accountNo = advSettings[i].accountNo;
				tabs[y].redirectUrl = advSettings[i].redirectUrl;

				tabs[y].submitCssSelector = advSettings[i].submitCssSelector;
				tabs[y].detectURLParams = advSettings[i].detectURLParams;


				tabs[y].reload = advSettings[i].reload;
				tabs[y].seconds = advSettings[i].seconds;
				tabs[y].prevTab = prevTab;
			}
		}	
	}
	callback();
}


// Get the settings for a tab.
function grabTabSettings(windowId, tab, callback) {	
	for(var i=0; i<tabsManifest[windowId].length; i++){
		var tabManifest = tabsManifest[windowId][i];
		if(compareURL(tabManifest.detectURLParams,tab,tabManifest)){
			return callback(tabManifest);
		}
	}
}
// Get the settings for a tab.
function grabTabSettingsById(windowId, tab, callback) {	
	for(var i=0; i<tabsManifest[windowId].length; i++){
		if(tabsManifest[windowId][i].id === tab.id){
			return callback(tabsManifest[windowId][i]);
		}
	}
}

// This will convert users old settings into the new object format and remove the old ones.
function checkForAndMigrateOldSettings(callback){
	if(localStorage["revolverSettings"]) callback();
	else {
		var oldSettings = ["seconds", "autostart", "inactive", "noRefreshList", "reload"],
			tempSettings = {};
		for(var i=0;i<oldSettings.length;i++){
			if(localStorage[oldSettings[i]]) {
				tempSettings[oldSettings[i]] = localStorage[oldSettings[i]];
				delete localStorage[oldSettings[i]];
			}
		}
		if(JSON.stringify(tempSettings) != "{}"){
			localStorage["revolverSettings"] = JSON.stringify(tempSettings);	
		}
		callback();
	}
}
// Check if the objects exist in local storage, create them if they don't, load them if they do.
function createBaseSettingsIfTheyDontExist(){
	if(!localStorage["revolverSettings"]){
		settings.seconds = 15;
		settings.reload = false;
		settings.login = false;
		settings.inactive = false;
		settings.autoStart = false;
		settings.loginTimeout = 5;
		localStorage["revolverSettings"] = JSON.stringify(settings);
	} else {
		settings = JSON.parse(localStorage["revolverSettings"]);
	};
	if(localStorage["revolverAdvSettings"]){
		advSettings = JSON.parse(localStorage["revolverAdvSettings"]);
	}
	return true;
}
// If user has auto start enabled, well then, auto start.
function autoStartIfEnabled(windowId){
	if(settings.autostart) {
		createTabsManifest(windowId, function(){
			go(windowId);
		});
	}
}
// Go through each tab and assign settings to them.
function assignSettingsToTabs(tabs, callback){
	assignBaseSettings(tabs, function(){
		assignAdvancedSettingsAndState(tabs, tabs, function(){
			callback();
		});	
	});
}

// Create the tabs object with settings in tabsManifest object.
function createTabsManifest(windowId, callback){
	chrome.tabs.query({"windowId" : windowId}, function(tabs){
		var prevTabs = tabsManifest[windowId];
		assignBaseSettings(tabs, function(){
			assignAdvancedSettingsAndState(prevTabs, tabs, function(){
				tabsManifest[ windowId ] = tabs;
				callback();
			});	
		});
	});
}
//If a user changes settings this will update them on the fly.  Called from options_script.js
function updateSettings(){
	settings = JSON.parse(localStorage["revolverSettings"]);
	advSettings = JSON.parse(localStorage["revolverAdvSettings"]);
	getAllTabsInCurrentWindow(function(tabs){
		assignBaseSettings(tabs, function(){
			assignAdvancedSettingsAndState(tabs, tabs, function(){
				createTabsManifest(tabs[0].windowId, function(){
					return true;	
				});
			});
		});
	});
}

