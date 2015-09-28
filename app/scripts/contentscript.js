'use strict';

window.onload = function(){
    lev.start();
}

var lev = new function(){
    var server = 'http://localhost:1111/';
    var processURL = server + 'process?which=';

    var ctrKeyPressed = false;
    var z = {
        pulse: 999999999,
        menu: 99999999999997,
        menuX: 99999999999999,
        select: 99999999999998
    };

    var pulse = {
        menu: null,
        target: null,
        class: null,
        pos: {},
        comment: '',
        innerText: '',
        url: window.location.href,
        id: null,
        genericImgSrc: null,
        meme: false,
        isMemeSaved: false,
        tagSaved: false,
        pointer: null,
        user:{
            imgSmall:null
        }
    };

    this.start = function(){
        console.log('content script started');

        setTagMenu();
        setEventHandlers();

        var generic = $('meta[property="og:image"]');
        if(generic.length > 0)
            pulse.genericImgSrc = generic.attr('content');

        //console.log($('h1, h2, h3, h4, p').text());
    }

    function setTagMenu(){
        pulse.menu = $('#tag_menu');
        if (pulse.menu.length == 0)
            // ask the background script for the menu
            chrome.runtime.sendMessage({action: "menu"}, function(response) {
                // add menu to html body
                $('body').append(response.menu);
                pulse.menu = $('#tag_menu');
                $('#x').on('click', closePulse).css('zIndex', z.menuX);

                // save chain when these anchors are clicked
                $('#chain_selection_row a.chain_selection_option, a.chain_menu_expanded_list_option').on('click', saveTagChain);
                pulse.user.imgSmall = $('#pulse_user_image').attr('src');
                pulse.pointer = $('#pulse_pointer');

                // show more chain when ... is clicked
                $('#more_chain').on('click', function(){
                    $('#chain_menu_expanded_list').show();
                    $('#chain_menu_expanded').slideDown(300);
                });

                // show the new chain menu
                $('#chain_menu_expanded_new_button').on('click', showNewChainMenu);

                // save new chain
                $('#chain_menu_save_new_button').on('click', saveNewChain);

                // cancel new
                $('#chain_menu_cancel_new_button').on('click', cancelNewChain)

                // cancel chain

            });
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
       });


       // pulsate!!
       $(window).on('click', pulsate);

    }

    // create annotation / pulse
    function pulsate(e){
        if(!ctrKeyPressed)
            return;

        if(pulse.target != null)
            closePulse();

        pulse.target = $(e.target);
        pulse.class = randomStr(5);
        pulse.innerText = $.trim(pulse.target.text());

        var dims = returnDimensions(pulse.target);

        pulse.pos.abs = {x: e.pageX, y: e.pageY}
        pulse.pos.rel = {x: (e.pageX - dims.ol), y:(e.pageY - dims.ot)};

        var spacingLeft = (dims.ol - dims.opl);
        var spacingTop = (dims.ot - dims.opt);

        var options = {
            interval: 300,
            size:70,
            zIndex: z.pulse,
            left: -1 * (dims.w/2) + spacingLeft + pulse.pos.rel.x,
            top: -1 * (dims.h/2) + pulse.pos.rel.y,
            class: pulse.class
        };

        if(pulse.target.prop("tagName")  == 'HTML')
            pulse.target = $('body');

        pulse.target.jPulse(options);

        saveTag(); // save!!!!!!

        showTagMenu(e.pageX, e.pageY, function(){});
    }

    // SHOW TAG MENU
    function showTagMenu(x, y, callback){

        pulse.pointer.find('#pp_icon').attr('class', 'pp_text');


        $('#tag_share_button').unbind().on('click', showWhoMenu);

        $('#tag_private_button').unbind().on('click', showPreviewMenu);

        // navigation stuff
        $('#tmn_add_message').unbind().on('click', showMessageMenu);
        $('#tmn_share').unbind().on('click', showWhoMenu);
        $('.tag_hide_button').unbind().on('click', closePulse);

        // save tag message
        $('#tag_save_message_button').unbind().on('click', function(){
            saveTagText();
        })

        // figure out where place menu
        var wWindow = $(window).width();
        var slope = 1 - pulse.menu.width() / wWindow;
        var menuPos = {top: y - 48/2, zIndex: z.menu};

        if(wWindow/2 < x){
            pulse.pointer.attr('class', 'pulse_pointer_right');

            menuPos.left = x - pulse.menu.width() - 80;
        }
        else{
            pulse.pointer.attr('class', 'pulse_pointer_left');
            menuPos.left = x + 80;
        }

        $('body').animate({
            scrollTop: y - 100
        }, 500, function(){
            hideAllMenuContainers();
            $('#tag_menu_content').show();
            pulse.menu.hide().css(menuPos).fadeIn(300, showMessageMenu);
            callback();
        });
    }

    function hideAllMenuContainers(){
        $('#tag_menu_content, #tag_menu_chain, #tag_menu_preview, #tag_menu_who, #tag_menu_load_page, #chain_menu_expanded').hide();
    }


    function saveTag(){
        console.log('saveTag');
        var saved = $('#tag_menu_notification_saved');
        saved.hide();

        pulse.tagSaved = false;
        var data = {
            url: pulse.url,
            width: $(window).width(),
            height: $(window).height(),
            share: '',
            pulseText: pulse.innerText,
            thoughts: pulse.comment,
            zoom: '',
            pulsePos: JSON.stringify(pulse.pos)
        };

        $.post(processURL + 'save_tag', {data:JSON.stringify(data)}).done(function(res){
            console.log('res', res);
            if(res != ''){
                if(res.success){
                    pulse.tagSaved = true;
                    pulse.id = res.id;
                    //saveTagImages();
                }
            }
        });
    }


    function undoSaveTag(){

    }

    function closePulse(){
        $('.' + pulse.class).hide().css('visible','hidden');
        pulse.target.jPulse( "disable" );
        pulse.menu.hide();
        console.log('close attempt');
    }



    function showMessageMenu(fade){
        console.log('showMessageMenu');

        $('#tag_menu_who').hide();
        $('#tag_menu_content').show();
        $('#pp_icon').attr('class', 'pp_text');

        $('#lev_comment_textarea, #lev_comment_input')
            .hide()
            .unbind()
            .on('keyup', function(e){
                if(e.keyCode == '13')
                    saveTagText();
            })

        $('#lev_comment_input')
            .show()
            .val('')
            .attr('placeholder', 'Type what you\'re thinking...')
            .on('input', function(){
                pulse.comment = this.value;

                // expand to text area
                if(this.value.length > 40){
                    $(this).hide();
                    $('#lev_comment_textarea')
                        .show()
                        .val(this.value)
                        .animate({'height':60}, 300)
                        .focus();
                }
            })
            .focus();

    }

    function saveTagText(){
        var data = {thoughts: pulse.comment, id: pulse.id};
        $('#tag_menu_content').hide();

        $('#tag_menu_load_page, #tm_loader').show(); // show loader menu
        $.post(processURL + 'save_tag_text', {data:JSON.stringify(data)}).done(function(res){
            console.log('save message', res);
            if(res.success)
                setTimeout(function(){
                    $('#tm_loader').hide();
                    $('#tm_loader_message').html('Select a chain...');
                    setTimeout(showChainMenu, 1500)
                }, 1000);
        });
    }

    function showChainMenu(){
        hideAllMenuContainers();
        $('#tag_menu_chain').fadeIn(300);
        $('#pp_icon').attr('class', 'pp_chain');

    }

    function saveTagChain(tID){
        console.log('saveTagChain');
        if(typeof tID !== 'number'){
            tID = $(this).find('input').val();
        }

        var data = {tagID: tID, id: pulse.id};
        $('#tag_menu_chain').hide();
        $('#tag_menu_load_page, #tm_loader').show(); // show loader menu
        $('#tm_loader_message').html('');

        $.post(processURL + 'save_tag_chain', {data:JSON.stringify(data)}).done(function(res){
            setTimeout(function(){
                $('#tm_loader').hide();
                $('#tm_loader_message').html('Tag saved.');
                setTimeout(function(){
                    pulse.menu.fadeOut(200);
                    $('#tag_menu_load_page').hide();
                }, 2000);
            }, 1000);
        });

        console.log('tID', tID);
    }

    // stuff dealing with new chain menu

    function showNewChainMenu(){
        $('#chain_menu_expanded_list, #chain_menu_expanded_select').hide();
        $('#chain_menu_expanded_new').fadeIn(300);
        $('#chain_menu_expanded_new_name').focus();
    }

    function saveNewChain(){
        var chainName = $.trim($('#chain_menu_expanded_new_name').val());
        if(chainName.length < 1)
            return alert("Must be at least one character.")

        var req = {action: "socket", message: 'save_new_chain', chainName: chainName};
        console.log('save req', req);
        chrome.runtime.sendMessage(req, function(response) {
            console.log('save response', response);
        });

    }

    function cancelNewChain(){
        $('#chain_menu_expanded_list, #chain_menu_expanded_select').show();
        $('#chain_menu_expanded_new').hide();
    }

    function saveTagImages(){
        console.log('saveTagImages');
        // 1. save target
        if(pulse.tagType != 'img'){
            html2canvas(pulse.target, {
                background: '#ffffff',
                onrendered: function(canvas) {
                    saveTagImageProcess({
                        str: canvas.toDataURL(),
                        ext: 'png',
                        type: 'target',
                        fileID: pulse.id
                    });
                }
            });

        }


        // 2. save generic image
        if(pulse.genericImgSrc != null){
            var img = new Image();
            img.setAttribute('crossOrigin', 'anonymous');
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');

            img.onload = function(){
                canvas.width = this.width;
                canvas.height = this.height;
                ctx.drawImage(this, 0, 0);
                saveTagImageProcess({
                    str: canvas.toDataURL(),
                    ext: 'png',
                    type: 'generic',
                    fileID: pulse.id
                });
            }
            img.src = pulse.genericImgSrc
        }

    }

    function saveTagImageProcess(saveObj){
        $.post(processURL + 'save_image', {data: JSON.stringify(saveObj)});
    }

    function showWhoMenu(){
        updateTagNav('tmn_share');
        $('#tag_back_button').unbind().on('click', showMessageMenu.bind(null, true));
        $('#tag_save_preview').unbind().on('click', showPreviewMenu);

        $('#tag_menu_who').fadeIn(300);
        $('#tag_menu_content, #tag_menu_preview, #tag_menu_load_page').hide();
        $('#people_search_input')
            .attr('placeholder', 'Enter names or email addresses')
            .focus();
    }

    function showPreviewMenu(){
        //tag_menu_preview
        $('#tag_menu_who, #tag_menu_content').hide();
        $('#tag_menu_preview').fadeIn(300);
        $('#preview_back_button').unbind().on('click', showWhoMenu);

        pulse.meme = pulse.isMemeSaved = false;

        pulse.tagType = pulse.target.prop("tagName").toLowerCase();

        switch(pulse.tagType){
            case 'p':
            case 'span':
            case 'a':
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'img':
                createPulsePreview();
                break;
        }
    }

    function createPulsePreview(){
        console.log('createPulsePreview');

        // add canvas to document
        $('.tag_item_user_name').html('gscoon:');
        $('.tag_item_user_img').attr('src', 'images/users/1.jpg');

        $('.tag_item_snippit_link').html(pulse.url);

        if(pulse.tagType == 'img'){
            createImageMeme(pulse.target.attr('src'));
        }
        else if(pulse.genericImgSrc != null){
            $('.tag_item_thoughts').html(pulse.comment);
            createImageIcon(pulse.genericImgSrc);
            if(pulse.innerText != null && pulse.innerText != '')
                $('.tag_item_snippit_text').html(pulse.innerText).ellipsis();
        }

    }

    function createImageIcon(src){
        var previewContainer = $('#tag_menu_preview_container');
        var imageObj = new Image();
        var canvas = previewContainer.find('.tag_item_snippit_img')[0];
        imageObj.onload = function(){
            var imageRatio = this.width/this.height;

            if(this.width>this.height){
                var squareLength = this.height;
                var newPos = {l:(this.width - this.height)/2, t:0};
            }
            else{
                var squareLength = this.width;
                var newPos = {l:0, t:(this.height - this.width)/2};
            }

            var menuWidth = parseInt(pulse.menu.css('width'));

            var canvasDims = {w: squareLength * imageRatio, h: squareLength * (1/imageRatio)};

            var fontSize = 18;
            var iconLength = 100;

            canvas.width =  iconLength;
            canvas.height = iconLength;

            var context = canvas.getContext("2d");
            context.save();

            context.drawImage(this, 0, 0, squareLength, squareLength, 0, 0, iconLength, iconLength);
        };
        imageObj.src = src;
    }

    function createImageMeme(src){
        console.log('createImageMeme');
        var previewContainer = $('#tag_menu_preview_container');
        var imageObj = new Image();
        imageObj.setAttribute('crossOrigin', 'anonymous');
        var canvas = previewContainer.find('.tag_item_snippit_img')[0];

        imageObj.onload = function(){

            var imageRatio = this.width / this.height;
            var canvasDims = {w:previewContainer.innerWidth(), h:previewContainer.innerWidth() / imageRatio};
            console.log({canvasDims:canvasDims});
            canvas.width =  canvasDims.w;
            canvas.height = canvasDims.h;

            var context = canvas.getContext("2d");
            context.save();
            context.drawImage(this, 0, 0, this.width, this.height, 0, 0, canvasDims.w, canvasDims.h);

            // transparent overlay
            //context.fillStyle = "rgba(0, 0, 0, 0.70)";
            //context.fillRect(0, 0, canvasDims.w, canvasDims.h);

            // restore to the default which was saved immediatlely
            context.restore();

            var fontSize = 18;
            context.font = fontSize + "px Open Sans";
            context.shadowColor="black";
            context.shadowBlur=7;
            context.fillStyle  = "#ffffff";
            // context.textBaseline="top";
            context.textBaseline="hanging";

            wrapText(context, pulse.comment, canvasDims.w * .05, canvasDims.h * .1, canvasDims.w * .9, fontSize * 1.25);

            pulse.meme = canvas.toDataURL();

            // gerren, this should make sure the tag is saved first saved...
            saveTagImageProcess({
                str: pulse.meme,
                ext: 'png',
                type: 'meme',
                fileID: pulse.id
            });
        }

        imageObj.src = src;
    }

    function wrapText(context, text, x, y, maxWidth, lineHeight) {
        var words = text.split(' ');
        var line = '';

        for(var n = 0; n < words.length; n++) {
            var testLine = line + words[n] + ' ';
            var metrics = context.measureText(testLine);
            var testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                context.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
            }
            else
                line = testLine;

        }
        context.fillText(line, x, y);
    }

    function captureElement(target){
        html2canvas(target[0], {
            onrendered: function(canvas) {
                //$('#lev_menu').html(canvas);
            // canvas is the final rendered <canvas> element
            }
        });
    }

    function returnDimensions(c){
        var op = c.parent().offset();
        if(typeof op === 'undefined')
            op = {left:0, top:0};

        return {
            w: c.innerWidth(),  // target inner width
            h: c.innerHeight(), // target inner height
            ol: c.offset().left, // target left relative to doocument
            ot: c.offset().top, // target top relative to doocument
            opl: op.left,
            opt: op.top
        };
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

    function extend(a, b){
        for(var key in b)
            if(b.hasOwnProperty(key))
                a[key] = b[key];
        return a;
    }

    function randomStr(len){
	    var text = "";
	    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	    for( var i=0; i < len; i++ )
	        text += possible.charAt(Math.floor(Math.random() * possible.length));

	    return text;
	}


}
