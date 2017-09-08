chrome.runtime.onMessage.addListener(function(data, sender, sendResponse) {
	 //try to do login
	 var usernameEl, passwordEl, submitEl;
	 usernameEl = document.querySelector(data.usernameCssSelector);
	 passwordEl = document.querySelector(data.passwordCssSelector);
	 submitEl = document.querySelector(data.submitCssSelector);
	 if ( usernameEl && passwordEl && submitEl ) {
		usernameEl.value = data.username;
		passwordEl.value = data.password;
		submitEl.click();
		sendResponse( true );
    		return;
	}
	sendResponse( false );
});
