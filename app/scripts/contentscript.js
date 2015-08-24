'use strict';

 window.onload = function(){
     lev.start();
 }

 var lev = new function(){

     this.start = function(){
         console.log('content script started');
        // pageHandler();
        // eventHandler();

        $(window).on('click', function(e){
            var target = $(e.target);
            chrome.runtime.sendMessage({action: "capture", target: target}, function(response) {
                console.log('response', response);
            });
        });
    }


     //
    //  function pageHandler() {
    //      switch(window.location.hostname){
    //          case 'www.facebook.com':
    //          case 'facebook.com':
    //             handleFacebook();
    //             break;
    //         case 'www.instagram.com':
    //         case 'instagram.com':
    //             handleInstagram();
    //             break;
    //      }
     //
    //  }
     //
    //  function eventHandler(){
    //      console.log('control key not pressed');
    //      $(document).on('keydown', function(e){
    //          if(e.ctrlKey){
    //              console.log('control key pressed');
    //          }
    //      })
    //  }
     //
    //  function handleFacebook(){
    //      console.log('handleFacebook');
    //  }
     //
    //  function handleInstagram(){
    //      console.log('handleInstagram');
    //  }
 }
