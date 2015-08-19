'use strict';

 window.onload = function(){
     lev.start();
 }

 var lev = new function(){

     this.start = function(){
        pageHandler();
     }

     function pageHandler() {
         switch(window.location.hostname){
             case 'www.facebook.com':
             case 'facebook.com':
                handleFacebook();
                break;
            case 'www.instagram.com':
            case 'instagram.com':
                handleInstagram();
                break;
         }

     }

     function handleFacebook(){
         console.log('handleFacebook');
     }

     function handleInstagram(){
         console.log('handleInstagram');
     }
 }
