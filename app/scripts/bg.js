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
        checkupInterval: null
    }

    window.onload = start;

    function start(){
        console.log('Ext Loaded');
        chrome.storage.sync.get('extID', storageCallback);

        // listen to all connections from content scripts
        chrome.runtime.onConnect.addListener(connectionListener);

        startCheckup();
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

        console.log('port connection established', port);

        var portIndex = config.ports.push(port) - 1; // gerren, this could get ugly

        port.onMessage.addListener(function(request) {
            //console.log('action',request.action);
            if(request.action){
                if (request.action == "capture")
                    port.postMessage({farewell: "gotcha"});
                else if (request.action == "menu")
                    port.postMessage({action:'menu', menu: config.menuHTML});
                else if (request.action == "user")
                    port.postMessage({action:'user', user: config.user});
                else if(request.action == "socket"){
                    sendSocketMessage(request, function(d){
                        port.postMessage(d);
                    });
                }
                else if(request.action == "convert_image"){
                    convertImgToBase64URL(request, function(dURL){
                        console.log('convert', dURL);
                        request.dataURL = dURL;
                        port.postMessage(request);
                    });
                }
            }
        });

        port.onDisconnect.addListener(function(p) {
            console.log('disconnected port');
            port = null;
            config.ports[portIndex] = null;
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
            config.socket.on('auth_status', handleAuthUpdate);
            config.socket.on('content', handleContent);
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

        function handleAuthUpdate(data){
            console.log('handleAuthUpdate: ', data);
            //close auth window
            chrome.windows.remove(config.authWindow.id);
            setTimeout(function(){
                config.socket.emit('get_content', config.extID);
            }, 1000);
        }

        function handleContent(data){
            console.log(data);
        }
    }  // end of socket name space

    function sendSocketMessage(req, callback){
        req.extID = config.extID;
        req.callbackID = genRandomID(5);
        config.callbackObj[req.callbackID] = callback;
        config.socket.emit(req.which, req);
    }

    function startCheckup(){
        config.checkupInterval = setInterval(function(){
            console.log(config.ports);
            config.ports.forEach(function(p, i){

                if(p && p.sender.tab.active){
                    console.log('checkupInterval', i, p);
                    p.postMessage({action:'checkup', message: 'check', time: moment().format('MMMM D, YYYY HH:mm:ss')});
                }
            });
        }, 5000);
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
            callback("data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="); // blank gif
        }

        img.src = req.url;
    }

    function genRandomID(len){
        var text = '';
        var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for( var i=0; i < len; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

}
