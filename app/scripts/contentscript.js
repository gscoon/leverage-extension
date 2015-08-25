'use strict';

window.onload = function(){
    lev.start();
}

var lev = new function(){

    var ctrKeyPressed = false;

    this.start = function(){
        console.log('content script started');
        setPageHandlers();
        setEventHandlers();
        setAnnotate();

        // $(window).on('click', function(e){
        //     var target = $(e.target);
        //     chrome.runtime.sendMessage({action: "capture", target: target}, function(response) {
        //         console.log('response', response);
        //     });
        // });
    }


     //
    function setPageHandlers() {
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

    function setEventHandlers(){
        $(window).on('keydown', function(e){
            if(e.keyCode == 17){
                if(ctrKeyPressed) return false;

                console.log('control key pressed');
                ctrKeyPressed = true;

                $('a').addClass('disabled');
            }
        })

        $(window).on('keyup', function(e){
            if(e.keyCode == 17){
                console.log('control key released');
                ctrKeyPressed = false;

                $('a.disabled').removeClass('disabled');
            }
        })

        $('img').on('click', function(e){
           convertImgToBase64URL($(this).attr('src'), 'image/png', function(dataURL){
               console.log('converted: ', dataURL);
           });
           console.log($(this).attr('src'));
        })

        $('#x').on('click', function(){
            $('#lev_menu').fadeOut(300);
        });
    }

    function setAnnotate(){
        var target = null;

        $(window).on('click', function(e){
               if(!ctrKeyPressed)
                   return;

               if(target != null)
                   target.jPulse( "disable" );

               target = $(e.target);

               var dims = returnDimensions(target);

               var rel = {x: (e.pageX - dims.ol), y:(e.pageY - dims.ot)}
               var spacingLeft = (dims.ol - dims.opl);
               var spacingTop = (dims.ot - dims.opt);

               var options = {
                   left: -1 * (dims.w/2) + spacingLeft + rel.x,
                   top: -1 * (dims.h/2) + rel.y,
                   interval: 400,
                   zIndex: 99999999999999999
               };

               showLevMenu(e.pageY, function(){
                   target.jPulse(options);
                   setTimeout(function(){
                       //captureElement(target);
                   }, 2000);
               });

               //captureElement(target);
               //  {color: "#993175", size: 120, speed: 2000, interval: 400, left: 0,  top: 0,  zIndex: -1 }
        });
    }

    function showLevMenu(h, callback){
         //console.log('lev menu', $('#lev_menu').length);
         if ($('#lev_menu').length == 0)
             $('body').append('<div id="lev_menu"></div><div id="general_overlay"></div>');

         var menu = $('#lev_menu');
         menu.css('top', h + 100).show();

         //$('#general_overlay').show();

         $('html, body').animate({
            scrollTop: h - 100
        }, 500, callback);

        // $('#lev_menu').slideDown(300);
     }

    function captureElement(target){
        html2canvas(target[0], {
            onrendered: function(canvas) {
                //$('#lev_menu').html(canvas);
            // canvas is the final rendered <canvas> element
            }
        });
    }

    function convertImgToBase64URL(url, outputFormat, callback){
        var img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function(){
            var canvas = document.createElement('CANVAS'),
            ctx = canvas.getContext('2d'), dataURL;
            canvas.height = this.height;
            canvas.width = this.width;
            ctx.drawImage(this, 0, 0);
            dataURL = canvas.toDataURL(outputFormat);
            callback(dataURL);
            canvas = null;
        };
        img.src = url;
    }

    function returnDimensions(c){
        return {
            w: c.innerWidth(),
            h: c.innerHeight(),
            ol: c.offset().left,
            ot: c.offset().top,
            opl: c.parent().offset().left,
            opt: c.parent().offset().top,
        };
    }

    function handleFacebook(){
         console.log('handleFacebook');
    }

    function handleInstagram(){
         console.log('handleInstagram');
    }
}
