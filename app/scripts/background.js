'use strict';

var bg = new function(){

    var serverURL = 'http://localhost:1111/';  //used for ajax calls
    var extID = null;
    var socket = null;
    var authWindow = null;
    var menuHTML = null;
    var callbackObj = {};  //holds callback functions

    window.onload = start.bind(this);

    chrome.runtime.onInstalled.addListener(function (details) {
        console.log('previousVersion', details.previousVersion);
    });

    //chrome.runtime.onMessage.addListener(messageListener.bind(this));

    chrome.runtime.onConnect.addListener(connectionListener.bind(this));


    function connectionListener(port){
        var self = this;
        console.log('port connection established', port);

        port.onMessage.addListener(function(request) {
            if(request.action){
                if (request.action == "capture")
                    port.postMessage({farewell: "gotcha"});
                else if (request.action == "menu")
                    port.postMessage({action:'menu', menu: self.menuHTML});
                else if(request.action == "socket")
                    sendSocketMessage.call(self, request, function(d){
                        port.postMessage(d);
                    });
            }
        });
    }

    function start(){
        console.log('Ext Loaded');
        chrome.storage.sync.get('extID', storageCallback.bind(this));
    }

    function startSocket(){
        var self = this;
        socket = io(serverURL);
        var isConnected = false;

        socket.on('connect', function(){
            if(isConnected) return false;

            isConnected = true;
            console.log('socket connected');
            socket.emit('extID', {extID: self.extID});


            // listen for user information based on extension id
            socket.on('menu', handleMenu.bind(self));
            socket.on('user', handleUserResults.bind(self));
            socket.on('auth_status', handleAuthUpdate.bind(self));
            socket.on('content', handleContent.bind(self));
            socket.on('callback', handleSocketCallback.bind(self));
        });

        function handleMenu(data){
            console.log('menuData', data)
            this.menuHTML = data.menu;
        }

        function handleUserResults(data){
            console.log('user results: ', data);
            if(typeof data != 'object' || !('name' in data))
                return false;

            // if user exists, then get menu
            socket.emit('get_pulse_menu', {extID: self.extID});

            //handle facebook auth
            //this.showFacebookAuth();
        }

        function handleAuthUpdate(data){
            console.log('handleAuthUpdate: ', data);
            //close auth window
            chrome.windows.remove(this.authWindow.id);
            setTimeout(function(){
                socket.emit('get_content', self.extID);
            }, 1000);
        }

        function handleContent(data){
            console.log(data);
        }

        function handleSocketCallback(data){
            console.log('handleSocketCallback', data);
            if(typeof data == 'object' && 'callbackID' in data)
                callbackObj[data.callbackID](data);
        }

    }

    function sendSocketMessage(req, callback){
        req.extID = this.extID;
        req.callbackID = genRandomID(5);
        callbackObj[req.callbackID] = callback;
        socket.emit(req.which, req);
    }

    this.showFacebookAuth = function(){
        var self = this;
        chrome.windows.create({
            'url': serverURL + 'auth/pre-fb?extID=' + this.extID,
            'type': 'popup',
            width:700,
            height:700
        }, function(pWindow) {
            if(self.authWindow != null)
                chrome.windows.remove(self.authWindow.id);

            self.authWindow = pWindow;
            console.log('Pop pop', pWindow);
        });
    }

    function closeThatWindow(){

    }

    function storageCallback(ret){
        var self = this;
        var extID = ret.extID;
        if(extID){
            this.extID = extID;
            console.log('extension id pulled: ', self.extID);
            startSocket.apply(self);
            return true;
        }

        this.extID = genRandomID(15);
        chrome.storage.sync.set({extID: this.extID}, function() {
            startSocket.apply(self);
            console.log('extension id saved: ', self.extID);
        });
    }

    function genRandomID(len){
        var text = '';
        var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for( var i=0; i < len; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

}
