/* global chrome */
var bg = chrome.extension.getBackgroundPage();
// Saves options to localStorage.
function addEventListeners(){
    restoreOptions();
    if (localStorage["revolverAdvSettings"]) restoreAdvancedOptions();
    buildCurrentTabsList();
    document.querySelector('#save').addEventListener('click', saveAllOptions);
}

//Base options code
function saveBaseOptions(callback) {
    var appSettings = {},
        statusEl = document.getElementById("status");
    appSettings.seconds = document.getElementById("seconds").value;
    bg.timeDelay = (document.getElementById("seconds").value*1000);
    bg.loginTimeout = (document.getElementById("loginTimeout").value*1000);
    getCheckedStatus(appSettings, "inactive");
    getCheckedStatus(appSettings, "autostart");
    appSettings.loginTimeout = parseInt(document.getElementById("loginTimeout").value);
    appSettings.noRefreshList = document.getElementById('noRefreshList').value.split('\n');
    bg.noRefreshList = document.getElementById('noRefreshList').value.split('\n');  
    statusEl.innerHTML = "OPTIONS SAVED";
    setTimeout(function() {
        statusEl.innerHTML = "";
  }, 1000);
  localStorage["revolverSettings"] = JSON.stringify(appSettings);
  callback();
}

function getCheckedStatus(appSettings, elementId){
    if(document.getElementById(elementId).checked){
        appSettings[elementId] = true;
    } else {
        appSettings[elementId] = false;
    }
    bg[elementId] = appSettings[elementId];
}

// Restores saved values from localStorage.
function restoreOptions() {
    var appSettings = {};
    if (localStorage["revolverSettings"]) appSettings = JSON.parse(localStorage["revolverSettings"]);
        document.getElementById("seconds").value = (appSettings.seconds || 10);
        document.getElementById("loginTimeout").value = (appSettings.loginTimeout || 5);
        document.getElementById("reload").checked = (appSettings.reload || false);
        document.getElementById("inactive").checked = (appSettings.inactive || false);
        document.getElementById("autostart").checked = (appSettings.autostart || false);
        if(appSettings.noRefreshList && appSettings.noRefreshList.length > 0){
            for(var i=0;i<appSettings.noRefreshList.length;i++){
                if(appSettings.noRefreshList[i]!= ""){
                    document.getElementById("noRefreshList").value += (appSettings.noRefreshList[i]+"\n");
                };
            };
        } else {
            document.getElementById("noRefreshList").value = "";
        }
}

//Advanced options code
function saveAdvancedOptions(callback){
    var advUrlObjectArray = [],
        advancedSettings = document.getElementById("adv-settings"),
        advancedDivs = advancedSettings.querySelectorAll(".settings");
        statusEl = document.getElementById("status3");

        for(var i = 0, checkboxes=0;i<advancedDivs.length;i++){
           if(advancedDivs[i].getElementsByClassName("enable")[0].checked == true){
		  var urlEl, reloadEl, secondsEl, loginEl, usernameCssEl, usernameEl, passwordCssEl, passwordEl, accountNoCssEl, accountNoEl, redirectUrlEl, submitCssEl, iconEl, detectURLParamsEl;
		  urlEl = advancedDivs[i].getElementsByClassName("url-text")[0];
		  reloadEl = advancedDivs[i].querySelector("input[name='reload']");
		  secondsEl = advancedDivs[i].querySelector("input[name='seconds']");
		  loginEl = advancedDivs[i].querySelector("input[name='login']");
		  iconEl = advancedDivs[i].getElementsByClassName("icon")[0];
		var opts = {
                    "url" : urlEl.value,
		    "login": loginEl.checked,
                    "reload" : reloadEl.checked,
                    "seconds" : secondsEl.value,
                    "favIconUrl": iconEl.src
                }
		if ( loginEl.checked ) {
		  usernameCssEl = advancedDivs[i].querySelector("input[name='usernameCssSelector']");
		  usernameEl = advancedDivs[i].querySelector("input[name='username']");
		  passwordEl = advancedDivs[i].querySelector("input[name='password']");
		  passwordCssEl = advancedDivs[i].querySelector("input[name='passwordCssSelector']");
		  accountNoCssEl = advancedDivs[i].querySelector("input[name='accountNoCssSelector']");
		  accountNoEl = advancedDivs[i].querySelector("input[name='accountNo']");
		  redirectUrlEl = advancedDivs[i].querySelector("input[name='redirectUrl']");
		  submitCssEl = advancedDivs[i].querySelector("input[name='submitCssSelector']");
		  detectURLParamsEl = advancedDivs[i].querySelector("input[name='detectURLParams']");
		  opts['usernameCssSelector']=usernameCssEl.value;
		  opts['username']=usernameEl.value;
		  opts['password']=passwordEl.value;
		  opts['passwordCssSelector']=passwordCssEl.value;
		  opts['accountNoCssSelector']=accountNoCssEl.value;
		  opts['accountNo']=accountNoEl.value;
		  opts['redirectUrl']=redirectUrlEl.value;
		  opts['detectURLParams']=detectURLParamsEl.checked;

		  opts['submitCssSelector'] = submitCssEl.value;
		}

                advUrlObjectArray.push(opts);
           }
        }
        localStorage["revolverAdvSettings"] = JSON.stringify(advUrlObjectArray);
        bg.updateSettings();
        statusEl.innerHTML = "OPTIONS SAVED";
        setTimeout(function() {
            statusEl.innerHTML = "";
         }, 1000);
        callback();
}

function restoreAdvancedOptions(){
    var settings = JSON.parse(localStorage["revolverAdvSettings"]);
    if(settings.length>0){
        for(var i=0;i<settings.length;i++){
            generateAdvancedSettingsHtml(settings[i], true);
        }    
    }
}

function generateAdvancedSettingsHtml(tab, saved){
    var advancedSettings = document.getElementsByClassName("adv-settings")[0],
        enableHtmlChunk = '<div class="settings"><input type="checkbox" class="enable" name="enable">',
        iconAndUrlChunk = '<img class="icon" src='+tab.favIconUrl+'\><input class="url-text" type="text" value="'+tab.url+'">',
        loginChunk = '<p><div><label for="login">Login:</label> <input type="checkbox" name="login">';    
	loginChunk += '<div style="display: none;" id="loginWrapper">';
	loginChunk += '<p class="no-border-bottom"><label style="width: 100%;" for="usernameCssSelector">Username CSS Selector:</label> <br /><input type="text" name="usernameCssSelector" value="" style="width:500px;"></p>';
	loginChunk += '<p class="no-border-bottom"><label style="width: 100%" for="username">Username:</label> <br/><input type="text" name="username" value="" style="width:500px;"></p>';

	loginChunk += '<p class="no-border-bottom"><label style="width: 100%" for="passwordCssSelector">Password CSS Selector:</label> <br/><input type="text" name="passwordCssSelector" value="" style="width:500px;"></p>';
       	loginChunk += '<p class="no-border-bottom"><label style="width:100%" for="password">Password:</label> <br/> <input type="text" name="password" value="" style="width:500px;"></p>';

	loginChunk += '<p class="no-border-bottom"><label style="width: 100%" for="accountNoCssSelector">Account No Selector: <small>(optional)</small></label> <br/><input type="text" name="accountNoCssSelector" value="" style="width:500px;"></p>';
       	loginChunk += '<p class="no-border-bottom"><label style="width:100%" for="accountNo">Account No: <small>(optional)</small></label> <br/> <input type="text" name="accountNo" value="" style="width:500px;"></p>';

       	loginChunk += '<p class="no-border-bottom"><label style="width:100%" for="redirectUrl">Redirect URL: <small>(optional)</small></label> <br/> <input type="text" name="redirectUrl" value="" style="width:500px;"></p>';


	loginChunk += '<p class="no-border-bottom"><label style="width:100%" for="submitCssSelector">Submit CSS Selector:</label>  <br/> <input type="text" name="submitCssSelector" value="" style="width:500px;"></p>';

        loginChunk += '<p class="no-border-bottom"><label for="detectURLParams">Detect URL Params:</label> <input type="checkbox" name="detectURLParams">';
	loginChunk += '</div></div></p>';

        secondsChunk = '<label for="seconds">Seconds:</label> <input type="text" name="seconds" value="10" style="width:30px;">';
        reloadChunk = '<label class="inline" for="reload">Reload:</label> <input type="checkbox" name="reload"></p></div>';
        if(saved){ 
            enableHtmlChunk = '<div class="settings"><input type="checkbox" class="enable" name="enable" checked>';

	    if (tab.login) {
		loginChunk = '<p><div><label for="login">Login:</label> <input type="checkbox" name="login" checked>';    
		loginChunk += '<div style="display: block;" id="loginWrapper">';
		loginChunk += '<p class="no-border-bottom" ><label style="width: 100%; " for="usernameCssSelector">Username CSS Selector:</label> <br/> <input type="text" name="usernameCssSelector" value="'+tab.usernameCssSelector+'" style="width:500px;"></p>';
		loginChunk += '<p class="no-border-bottom"><label style="width: 100%; " for="username">Username:</label> <br/> <input type="text" name="username" value="' + tab.username + '" style="width:500px;"></p>';

		loginChunk += '<p class="no-border-bottom"><label style="width: 100%; " for="passwordCssSelector">Password CSS Selector:</label> <br/> <input type="text" name="passwordCssSelector" value="'+ tab.passwordCssSelector +'" style="width:500px;"></p>';
		loginChunk += '<p class="no-border-bottom"><label style="width: 100%; " for="password">Password:</label> <br/> <input type="text" name="password" value="' + tab.password + '" style="width:500px;"></p>';
		loginChunk += '<p class="no-border-bottom"><label style="width: 100%; " for="accountNoCssSelector">Account No CSS Selector: <small>(optional)</small></label> <br/> <input type="text" name="accountNoCssSelector" value="'+ tab.accountNoCssSelector +'" style="width:500px;"></p>';
		loginChunk += '<p class="no-border-bottom"><label style="width: 100%; " for="accountNo">Account No: <small>(optional)</small></label> <br/> <input type="text" name="accountNo" value="' + tab.accountNo + '" style="width:500px;"></p>';

		loginChunk += '<p class="no-border-bottom"><label style="width: 100%; " for="redirectUrl">Redirect URL: <small>(optional)</small></label> <br/> <input type="text" name="redirectUrl" value="' + tab.redirectUrl + '" style="width:500px;"></p>';

		loginChunk += '<p class="no-border-bottom"><label style="width: 100%; "for="submitCssSelector">Submit CSS Selector:</label> <br/> <input type="text" name="submitCssSelector" value="' + tab.submitCssSelector + '" style="width:500px;"></p>';

        	if ( tab.detectURLParams ) {
			loginChunk += '<p class="no-border-bottom"><label for="detectURLParams">Detect URL Params:</label> <input type="checkbox" name="detectURLParams" checked></p>';
		} else {
			loginChunk += '<p class="no-border-bottom"><label for="detectURLParams">Detect URL Params:</label> <input type="checkbox" name="detectURLParams"></p>';
		}
		loginChunk += '</div></div></p>';
	    } 

            secondsChunk = '<label for="seconds">Seconds:</label> <input type="text" name="seconds" value="'+tab.seconds+'" style="width:30px;">';

            if(tab.reload){
                reloadChunk = '<label class="inline" for="reload">Reload:</label> <input type="checkbox" name="reload" checked></p></div>';    
            } 
        }
        advancedSettings.innerHTML += enableHtmlChunk + iconAndUrlChunk + loginChunk + secondsChunk + reloadChunk;
};

function getCurrentTabs(callback){
    var returnTabs=[];
    chrome.windows.getCurrent({populate: true}, function(window){
        window.tabs.forEach(function(tab){
          if(tab.url.substring(0,16) != "chrome-extension"){
              returnTabs.push(tab);
          }
       });
       callback(returnTabs);
    });
}

function buildCurrentTabsList(){ 
    getCurrentTabs(function(allCurrentTabs){
        if(localStorage["revolverAdvSettings"]){
        compareSavedAndCurrentUrls(function(urls){
            for(var i=0;i<urls.length;i++){
                for(var y=0;y<allCurrentTabs.length;y++){
                    if(urls[i] === allCurrentTabs[y].url){
                        generateAdvancedSettingsHtml(allCurrentTabs[y]);
                    }
                }
            } 
            createAdvancedSaveButton();
        });    
        } else {
            allCurrentTabs.forEach(function(tab) {
                generateAdvancedSettingsHtml(tab);
            });
            createAdvancedSaveButton();
        }
    });
}

function compareSavedAndCurrentUrls(callback){
    var currentTabsUrls = [],
        savedTabsUrls = [],
        urlsToWrite = [];
        
    JSON.parse(localStorage["revolverAdvSettings"]).forEach(function(save){
       savedTabsUrls.push(save.url); 
    });
    getCurrentTabs(function(allCurrentTabs){
       for(var i=0;i<allCurrentTabs.length;i++){
         currentTabsUrls.push(allCurrentTabs[i].url);
       };
       for(var i=0;i<currentTabsUrls.length;i++){
            if(savedTabsUrls.indexOf(currentTabsUrls[i]) == -1){
                urlsToWrite.push(currentTabsUrls[i]);        
            }
       };
       callback(urlsToWrite);
    });
}

function saveAllOptions(){
    saveBaseOptions(function(){
       saveAdvancedOptions(function(){
          return true; 
       });
    });
}

function createAdvancedSaveButton(){
    var parent = document.querySelector("#adv-settings"),
        advSaveButton = document.createElement("button"),
        advSaveIndicator = document.createElement("span");

    var logins = document.querySelectorAll("input[name='login']");
    logins.forEach( function(el) {
		el.addEventListener("change", onChangeLoginSetting, false);
    });


    advSaveButton.setAttribute("id", "adv-save");
    advSaveButton.innerText = "Save";
    advSaveButton.addEventListener("click", saveAllOptions);
    advSaveIndicator.setAttribute("id", "status3");
    parent.appendChild(advSaveButton);
    parent.appendChild(advSaveIndicator); 
}

function onChangeLoginSetting() {
	var loginWrapper = this.parentElement.querySelector("#loginWrapper");
	if ( this.checked ) {
		loginWrapper.style.display="block";
	} else {
		loginWrapper.style.display="none";
	}
}

// Load settings and add listeners:
document.addEventListener('DOMContentLoaded', addEventListeners);
