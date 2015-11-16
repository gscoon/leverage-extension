$(function(){
    console.log('feed page loaded');
    poxFeed.start();
});

var poxFeed = new function(){

    var chromePort = null;

    this.start = function(){
        chromePort = chrome.runtime.connect({name:"feedscript"});// handle pulse menu
        // set listenr
        setChromeConnectionListener();


    }

    function setChromeConnectionListener(){
        chromePort.onMessage.addListener(function(message, sender){
            if(message.action === "feed")
                displayFeed(message);
        });
    }

    function displayFeed(res){
        
    }

}
