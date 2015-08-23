'use strict';

var bg = new function(){
    // extension ID
    this.extID = null;
    var socket = null;
    var authWindow = null;

    window.onload = start.bind(this);

    chrome.runtime.onInstalled.addListener(function (details) {
        console.log('previousVersion', details.previousVersion);
    });

    // random badge stuff
    chrome.browserAction.setBadgeBackgroundColor({color: '#3cb73e'});
    chrome.browserAction.setBadgeText({text: 'GS'});

    function start(){
        console.log('Ext Loaded');
        chrome.storage.sync.get('extID', storageCallback.bind(this));
    }

    var serverURL = 'http://localhost:1111/';

    function startSocket(){
        var self = this;
        socket = io(serverURL);
        var isConnected = false;
        socket.on('connect', function(){
            if(isConnected) return false;

            isConnected = true;
            console.log('socket connected');
            socket.emit('extID', self.extID);

            // listen for user information based on extension id
            socket.on('user', handleUserResults.bind(self));
            socket.on('auth_status', handleAuthUpdate.bind(self));
        });

        function handleUserResults(data){
            console.log('user results: ', data);
            if(data.length == 0){

            }
            this.showFacebookAuth();
        }

        function handleAuthUpdate(data){
            console.log('handleAuthUpdate: ', data);
            //close auth window
            chrome.windows.remove(this.authWindow.id);
        }
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
