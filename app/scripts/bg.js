'use strict';

// 1. get pox menu
// 2. storage request for extension id
// 3. establish socket connection
// 4. request user information via socket


var config = {
	serverURL: 'http://www.chickenpox.io/',
	publicDomain: 'chickenpox.io',
	domain: {},
	extID: null,
	socket: null,
	authWindow: null,
	menuHTML: null,
	user: {},
	callbackObj: {},
	ports:[],
	contentCheckupInterval: null,
	fbAppID: "992333930803653",
	loadType: 'restart' //installed, update, normal, restart
}

var tabStore = {};

window.onload = start;

function start(){
	console.log('Extension Loaded');
}

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
	if(details.reason == "install"){
		config.loadType = 'install';
		console.log('Installed');
	}
	else if(details.reason == 'update'){
		config.loadType = 'update';
		console.log('updated');
	}
});

// initial badge
chrome.browserAction.setBadgeText({text: '!'});

// get storage details
chrome.storage.sync.get('extID', storageCallback);

// listen to all connections from content scripts
chrome.runtime.onConnect.addListener(portHandler);

// listen for one-off messages
chrome.extension.onMessage.addListener(messageHandler);

// when extension button is clicked...
chrome.tabs.onUpdated.addListener(handleTabUpdate);

// when tab is closed
chrome.tabs.onRemoved.addListener(tabClosedHandler);

function storageCallback(ret){
	if(ret.extID){
		config.extID = ret.extID;
		console.log('extension id pulled from local storage: ', config.extID);
		startSocket();
		return true;
	}

	config.extID = genRandomID(15);
	chrome.storage.sync.set({extID: config.extID}, function() {
		startSocket();
		console.log('extension id saved: ', config.extID);
	});
}

// handle one-off messages
function messageHandler(request, sender, sendResponse){
	if(!("action" in request)) return;

	switch(request.action){
		case 'menu':
			sendResponse({action:'menu', menu: config.menuHTML});
			break;
		case 'user':
			sendResponse({action:'user', user: config.user});
			break;
		case 'domain':
			sendResponse({action:'domain', domain: config.domain});
			break;
		case 'screenshot':
			doScreenshot(sender.tab, sendResponse);
			break;
		case 'show_preview':
			showPreview(request, sender.tab, sendResponse);
			break;
		case 'data_url':
			convertImgToBase64URL(request, sendResponse);
			break;
	}

	return true;
}

// handle long-lived connections
function portHandler(port){
	// each port is a long-lived connection to a content script
	// when a message is received for this port
	port.onMessage.addListener(function(request) {
		if(!("action" in request)) return;

		if(request.action == "socket"){
			sendSocketMessage(request, function(d){
				port.postMessage(d);
			});
		}
	});

	// when port is disconnected
	port.onDisconnect.addListener(function(p) {
		//console.log('disconnected port');
		// port = config.ports[portIndex] = null;
		// if you splice, you mess up port index
		//config.ports.splice(portIndex);
	});
}


// handle new tabs
function handleTabUpdate(tabId, changeInfo, tab){
	if(!changeInfo.status || changeInfo.status != 'complete')
		return;

	// set up browser action
	chrome.browserAction.setPopup({
		tabId: tabId,
		popup: '/html/popup.html'
	});

	// send favicon URL
	if(tab.favIconUrl)
		chrome.tabs.sendMessage(tab.id, {
			action: 'set_favicon',
			faviconURL: tab.favIconUrl
		});

	// call for page tags
	if(config.user && config.user.isLoggedIn)
		getPageTags(tab);
}

// clean up when tab is closed.
function tabClosedHandler(tabID){
	if(tabID in tabStore){
		console.log('Clean up in aisle', tabID);
		delete tabStore[tabID];
	}
}

function getPoxMenu(){
	var menuURL = chrome.extension.getURL('html/tag-menu.html');
	$.get(menuURL, function(m){
		config.menuHTML = m;
	});
}

function getPageTags(tab, callback){
	var pageURL = tab.url;
	$.ajax({
		url: config.domain.default + '/share-process?which=get-page-tags',
		type: 'post',
		data: {url: pageURL},
		success: function(response){

			if(!response.status)
				return;

			// update the badge with the number of tags on this page
			chrome.browserAction.setBadgeText({
				text: response.results.length.toString(),
				tabId: tab.id
			})

			// send page tags
			response.action = 'handle_page_tags';
			chrome.tabs.sendMessage(tab.id, response, nada);

			if(!tabStore[tab.id])
				tabStore[tab.id] = {};
			tabStore[tab.id].tags = response.results;
			// save page tags
		}
	}).done(function(){
		if(typeof callback == 'function')
			callback();
	})
}

function updateAllTabsTags(){
	console.log('update all tabs');
	chrome.tabs.query({}, function(tabs){
		var completed = 0;

		(function doWork(){
			if(completed >= tabs.length)
				return;

			var tab = tabs[completed];
			getPageTags(tab, function(){
				completed++;
				doWork();
			})
		})();
	})
}

function doScreenshot(tab, callback){
	var options = {format: 'png'};
	chrome.tabs.captureVisibleTab(tab.widowId, options, callback);
}



function showPreview(request, tab, sendResponse){
	log('showPreview');
	$.post(config.domain.default + '/share-process?which=extension-preview', {spot: JSON.stringify(request.spot)}, function(response){
		console.log('preview', response)
		sendResponse(response);
		if(response.status)
			chrome.tabs.create({ url: response.poxURL }, function(newTab){});
	});
}

function sendMessage(tid, m, callback){
	chrome.tabs.sendMessage(tid, m, callback);
}

// force reload of every page
function handleFirstLoad(){
	console.log('handleFirstLoad');
	chrome.tabs.query({
		windowType: 'normal',
		url: ['http://*/*', 'https://*/*'] // ignore background page...
	}, function(tabs){
		tabs.forEach(function(tab){
			chrome.tabs.reload(tab.id);
		});
	});
}

// socket stuff
function startSocket(){

	config.socket = io(config.serverURL);
	var isConnected = false;

	config.socket.on('connect', function(){
		if(isConnected) return false;

		isConnected = true;
		console.log('socket connected');
		config.socket.emit('extension_check', {extID: config.extID});

		// listen for user information based on extension id
		config.socket.on('extension_check', handleExtensionCheck);
		config.socket.on('user_update', handleUserUpdate);
		// config.socket.on('callback', handleSocketCallback);
	});

	// when user data is sent from server (user signs in)
	function handleUserUpdate(userObj){
		log('update data', userObj);
		$.extend(config.user, userObj)

		if(config.authWindow == null) return;

		chrome.windows.remove(config.authWindow);
		config.authWindow = null;
	}

	function handleExtensionCheck(data){
		console.log('extension results: ', data);

		// if user doesnt exist
		if(typeof data != 'object' || !data.success)
			return false;

		$.extend(config.domain, data.domain);
		getPoxMenu();

		// if user is not associated with extension
		if(data.user && data.user.user_id)
			setUser(data.user);
		else
			checkUserStatus();
	}

	function handleSocketCallback(data){
		console.log('handleSocketCallback', data);
		if(typeof data == 'object' && 'callbackID' in data){
			config.callbackObj[data.callbackID](data);
		}
	}

}  // end of socket name space



function checkUserStatus(forceLoginMenu){
	// see if user is logged in on the server
	// pass extension id which is then stored in session
	$.ajax({
		url: 'http://login.chickenpox.io/status',
		data: {extID: config.extID},
		type: 'get',
		success: function(response){
			log(response);
			// if user isnt logged in on server
			if(!response.isLoggedIn){
				//
				if(config.loadType == 'install' || forceLoginMenu)
					showLoginWindow();

				// make it clear that this isnt an install
				config.loadType = 'normal';
			}
			else
				setUser(response);
		}
	})
}

function setUser(response){
	$.extend(config.user, response);
	updateAllTabsTags();

	if(config.loadType != 'normal')
		handleFirstLoad();

	config.loadType = 'normal';
}

function showLoginWindow(){
	chrome.windows.create({
		url: '/html/login.html',
		type: 'popup',
		width: 800,
		height :800
	}, function(w){
		config.authWindow = w.id;
		chrome.windows.update(w.id, {focused: true});
	});
}


function sendSocketMessage(req, callback){
	req.extID = config.extID;
	req.callbackID = genRandomID(5);
	config.callbackObj[req.callbackID] = callback;
	config.socket.emit(req.which, req);
}

function logout(callback){
	console.log('log out');
	chrome.browserAction.setBadgeText({text: '!'});
	$.post(config.domain.default + '/share-process?which=logout', {extID: config.extID}, callback);
}

this.showFacebookAuth = function(){
	chrome.windows.create({
		'url': serverURL + 'auth/pre-fb?extID=' + config.extID,
		'type': 'popup',
		width:700,
		height:700
	}, function(pWindow) {
		if(config.authWindow != null)
			chrome.windows.remove(config.authWindow.id);

		config.authWindow = pWindow;
		console.log('Pop pop', pWindow);
	});
}


function convertImgToBase64URL(req, callback){
	var img = new Image();
	var retry = null;
	var url = null
	if(typeof req.url === 'object'){ // it's an array
		req.urlIndex = (typeof req.urlIndex === 'undefined')?0:req.urlIndex+1;
		url = req.url[req.urlIndex];
		if((req.urlIndex + 1) < req.url.length)
			retry = convertImgToBase64URL.bind(null, req, callback);
	}
	else
		url = req.url

	img.crossOrigin = 'Anonymous';
	img.onload = function(){
		var canvas = document.createElement('CANVAS'),
		ctx = canvas.getContext('2d');
		canvas.height = this.height;
		canvas.width = this.width;
		ctx.drawImage(this, 0, 0);
		// allowable formats
		var goodFormats = ['png','jpeg','jpg', 'gif'];
		if(!req.format || goodFormats.indexOf(req.format) == -1)
			req.format = 'png';

		var dataURL = canvas.toDataURL(req.format);
		callback(dataURL);
		canvas = null;
	};

	img.onerror = function(){
		if(retry != null)
			retry();
		else
			callback(false);
	}

	console.log('convertImgURL', url);
	img.src = url;
}

function genRandomID(len){
	var text = '';
	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for( var i=0; i < len; i++ )
		text += possible.charAt(Math.floor(Math.random() * possible.length));

	return text;
}


function nada(){}

// facebook setup
// window.fbAsyncInit = function() {
// 	FB.init({appId:config.fbAppID, xfbml:true, version:'v2.5'});
// 	if(window.fbStart) window.fbStart();
// };

// (function(d, s, id){
// 		var js, fjs = d.getElementsByTagName(s)[0];
// 		if (d.getElementById(id)) {return;}
// 		js = d.createElement(s); js.id = id;
// 		js.src = "https://connect.facebook.net/en_US/sdk.js";
// 		fjs.parentNode.insertBefore(js, fjs);
// 	}(document, 'script', 'facebook-jssdk'));
