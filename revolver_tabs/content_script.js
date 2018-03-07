chrome.runtime.onMessage.addListener(function(data, sender, sendResponse) {
	 var usernameEl, passwordEl, accountNoEl, submitEl, settings = data.settings;
	 console.log("received data ", data);
	 function makeLoginEls() {
		 usernameEl = document.querySelector(settings.usernameCssSelector);
		 passwordEl = document.querySelector(settings.passwordCssSelector);
		 submitEl = document.querySelector(settings.submitCssSelector);
	}
	function checkCanLogin() {
		makeLoginEls();
		return usernameEl && passwordEl && submitEl;
	}
	// wait for DOM next tick
	setTimeout(function() {
	 if ( data.type === "LOGIN" ) {
		 if ( checkCanLogin() ) {
			usernameEl.value = settings.username;
			passwordEl.value = settings.password;
			if ( settings.accountNoCssSelector !== "" ) {
				accountNoEl = document.querySelector( settings.accountNoCssSelector );
				accountNoEl.value = settings.accountNo;
			}
			submitEl.click();
			sendResponse( true );
			return;
		}
		sendResponse( false );
	} else if ( data.type === "REDIRECT" ) {
		 if ( settings.redirectUrl !== "" ) {
			 window.location.replace( settings.redirectUrl );
			 sendResponse( true );
			 return;
		 }
		sendResponse( false );
	} else if ( data.type === "CHECK" ) {
		sendResponse( checkCanLogin() );
	}
     }, 0);
});
