'use strict';

 window.onload = function(){
     lev.start();
 }

 var lev = new function(){

     this.start = function(){
        pageHandler();
        eventHandler();
        test();
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

     function eventHandler(){
         console.log('control key not pressed');
         $(window).on('keydown', function(e){
             if(e.ctrlKey){
                 console.log('control key pressed');
             }
         })
     }

     function handleFacebook(){
         console.log('handleFacebook');
     }

     function handleInstagram(){
         console.log('handleInstagram');
     }

     function test(){
         var pulse = $('#pulse-bg');

         $(window).on('click', function(e){

             var dims = returnDimensions(pulse);
             var l = e.pageX - dims.w / 2;
             var t = e.pageY - dims.h / 2;
             console.log(e.pageX + ' , ' + e.pageY);
             pulse.jPulse('disable');
             pulse.jPulse({
                 left: l,
                 top: t,
                 interval: 400
             });

            //  {
            //     color: "#993175",
            //     size: 120,
            //     speed: 2000,
            //     interval: 400,
            //     left: 0,
            //     top: 0,
            //     zIndex: -1
            // }

         });

     }

     function returnDimensions(c){
         return {w: c.outerWidth(), h: c.outerHeight()};
     }
 }
