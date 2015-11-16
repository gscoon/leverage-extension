'use strict';

var bg = new function(){

    var config = {
        serverURL: 'http://localhost:1111/',
        extID: null,
        socket: null,
        authWindow: null,
        menuHTML: null,
        user: null,
        callbackObj: {},
        ports:[],
        contentCheckupInterval: null
    }

    chrome.browserAction.onClicked.addListener(function(activeTab){
        var feedURL = 'http://localhost:1111/feed';
        chrome.tabs.create({ url: feedURL });
    });

    window.onload = start;

    function start(){
        console.log('Ext Loaded');
        chrome.storage.sync.get('extID', storageCallback);

        // listen to all connections from content scripts
        chrome.runtime.onConnect.addListener(connectionListener);
    }

    function storageCallback(ret){
        if(ret.extID){
            config.extID = ret.extID;
            console.log('extension id pulled: ', config.extID);
            startSocket();
            return true;
        }

        extID = genRandomID(15);
        chrome.storage.sync.set({extID: config.extID}, function() {
            startSocket();
            console.log('extension id saved: ', config.extID);
        });
    }

    function connectionListener(port){
        // listen for messages from content script
        port.onMessage.addListener(function(request) {
            if("action" in request){
                if (request.action == "menu")
                    port.postMessage({action:'menu', menu: config.menuHTML});
                else if (request.action == "user")
                    port.postMessage({action:'user', user: config.user});
                else if(request.action == "socket"){
                    sendSocketMessage(request, function(d){
                        port.postMessage(d);
                    });
                }
                else if(request.action == "convert_image" || request.action == "convert_image2"){
                    convertImgToBase64URL(request, function(dURL){
                        console.log('convert', dURL, request.type);
                        request.dataURL = dURL;
                        port.postMessage(request);
                    });
                }
                else if(request.action == "get_feed"){
                    var res = {action:'feed'}
                    port.postMessage(res);
                }
            }
        });

        port.onDisconnect.addListener(function(p) {
            console.log('disconnected port');
            // port = config.ports[portIndex] = null;
            // if you splice, you mess up port index
            //config.ports.splice(portIndex);
        });
    }

    function startSocket(){
        config.socket = io(config.serverURL);
        var isConnected = false;

        config.socket.on('connect', function(){
            if(isConnected) return false;

            isConnected = true;
            console.log('socket connected');
            config.socket.emit('extension_check', {extID: config.extID});

            // listen for user information based on extension id
            config.socket.on('menu', handleMenu);
            config.socket.on('user', handleUserResults);
            config.socket.on('callback', handleSocketCallback);
        });

        function handleMenu(data){
            console.log('menuData', data)
            config.menuHTML = data.menu;
        }

        function handleUserResults(data){
            console.log('user results: ', data);

            // if user doesnt exist
            if(typeof data != 'object' || !data.success)
                return false;

            // set user variable
            config.user = data.user;

            // get pulse menu
            config.socket.emit('get_pulse_menu', {extID: config.extID});
        }

        function handleSocketCallback(data){
            console.log('handleSocketCallback', data);
            if(typeof data == 'object' && 'callbackID' in data){
                config.callbackObj[data.callbackID](data);
            }
        }

    }  // end of socket name space

    function sendSocketMessage(req, callback){
        req.extID = config.extID;
        req.callbackID = genRandomID(5);
        config.callbackObj[req.callbackID] = callback;
        config.socket.emit(req.which, req);
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

    function closeThatWindow(){

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

}
