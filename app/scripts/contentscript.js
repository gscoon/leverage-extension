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

    // used to maintain connection with background script
    var chromePort = chrome.runtime.connect({name:"pulsecontentscript"});

    this.start = function(){
        console.log('content script started');

        setChromeConnectionHandlers();
        setEventHandlers();

        // handle pulse menu
        pulse.menu = $('#tag_menu');
        if (pulse.menu.length == 0)
            chromePort.postMessage({action:"menu"});

        // generic image?
        var generic = $('meta[property="og:image"]');
        if(generic.length > 0)
            pulse.genericImgSrc = generic.attr('content');

        // get current page tags
        chromePort.postMessage({action: "socket", which: 'get_page_tags', url: window.location.href});
    }

    function setChromeConnectionHandlers(){
        chromePort.onMessage.addListener(function(message, sender){
            if(message.action === "menu")
                handleMenuResponse(message);
            else if(message.action === 'saved_chain')
                handleNewChain(message);
            else if(message.action === 'saved_tag')
                handleSavedTag(message);
            else if(message.action === 'saved_tag_text')
                handleSavedTagText(message);
            else if(message.action === 'saved_tag_chain')
                handleSavedTagChain(message);
            else if(message.action === 'deleted_chain')
                handleDeletedChain(message);
            else if(message.action === 'page_tags')
                handlePageTags(message);
        });
    }

    // menu received from bg script
    function handleMenuResponse(response){
        // remove old copies
        $('#tag_menu').remove();
        // add menu to html body
        $('body').append(response.menu);
        pulse.menu = $('#tag_menu');
        $('#x').unbind().on('click', closePulse).css('zIndex', z.menuX);

        pulse.user.imgSmall = $('#pulse_user_image').attr('src');
        pulse.pointer = $('#pulse_pointer');

        // save chain when these anchors are clicked
        $('#chain_selection_row a.chain_selection_option, a.chain_menu_expanded_list_option').unbind().on('click', saveTagChain);

        // show more chain when ... is clicked
        $('#more_chain').unbind().on('click', function(){
            $('#chain_menu_expanded_list').show();
            $('#chain_menu_expanded').slideDown(300);
        });

        // show the new chain menu
        $('#chain_menu_expanded_new_button').unbind().on('click', showNewChainMenu);

        // save new chain
        $('#chain_menu_save_new_button').unbind().on('click', saveNewChain);
        $('#chain_menu_expanded_new_name').unbind().on('keyup', function(e){
            if(e.keyCode == '13') saveNewChain();
        });

        // delete chain
        $('.chain_menu_expanded_list_delete').unbind().on('click', deleteChain);

        // cancel new
        $('#chain_menu_cancel_new_button').unbind().on('click', cancelNewChain)

        // test overlay
        $('#general_overlay').unbind().on('click', function(){
            $(this).hide();
            $('#pulse_preview').fadeOut(300);
        })
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
        setFamilyTree();
        pulse.class = randomStr(5);
        pulse.innerText = $.trim(pulse.target.text());

        var dims = null;
        pulse.pos.dims = dims = returnDimensions(pulse.target);
        console.log('pulse tag', pulse.target.prop("tagName"), dims, {x:e.pageX, y:e.pageY});
        pulse.pos.abs = {x: e.pageX, y: e.pageY}
        pulse.pos.rel = {x: (e.pageX - dims.ol), y:(e.pageY - dims.ot)};
        pulse.pos.spacing = {left: dims.ol - dims.opl, top: dims.ot - dims.opt};
        pulse.pos.opt = {left: pulse.pos.rel.x + pulse.pos.spacing.left, top: pulse.pos.rel.y + pulse.pos.spacing.top};
        pulse.pos.window = {w: $(window).width(), h: $(window).height()};

        var options = {
            interval: 300,
            size:70,
            zIndex: z.pulse,
            left: pulse.pos.opt.left,
            top: pulse.pos.opt.top,
            class: pulse.class
        };

        if(pulse.target.prop("tagName")  == 'HTML')
            pulse.target = $('body');


        pulse.target.jPulse(options);

        saveTag(); // save!!!!!!

        showTagMenu(function(){});
    }


    // SHOW TAG MENU
    function showTagMenu(callback){
        var x = pulse.pos.abs.x;
        var y = pulse.pos.abs.y;

        pulse.pointer.find('#pp_icon').attr('class', 'pp_text');

        // figure out where place menu
        var slope = 1 - pulse.menu.width() / pulse.pos.window.w;
        var menuPos = {top: y - 48/2, zIndex: z.menu};

        if(pulse.pos.window.w / 2 < x){
            pulse.pointer.attr('class', 'pulse_pointer_right');
            menuPos.left = x - pulse.menu.width() - 80;
        }
        else{
            pulse.pointer.attr('class', 'pulse_pointer_left');
            menuPos.left = x + 80;
        }

        $('body').animate({
            scrollTop: y - pulse.pos.window.h / 2
        }, 500, function(){
            hideAllMenuContainers();
            $('#tag_menu_content').show();
            pulse.menu.hide().css(menuPos).fadeIn(300, showMessageMenu);
            callback();
        });
    }

    function hideAllMenuContainers(){
        $('#tag_menu_content, #tag_menu_chain, #tag_menu_preview, #tag_menu_who, #tag_menu_load_page, #chain_menu_expanded, #tag_menu_notification_saved, #tm_loader_message, #chain_menu_expanded_new').hide();
    }


    function saveTag(){
        console.log('saveTag');
        var saved = $('#tag_menu_notification_saved');
        saved.hide();

        pulse.tagSaved = false;
        var data = {
            action:"socket",
            which:'save_tag',
            url: pulse.url,
            share: '',
            pulseText: pulse.innerText,
            thoughts: pulse.comment,
            zoom: '',
            pulsePos: JSON.stringify(pulse.pos),
            family: JSON.stringify(pulse.family)
        };
        // send save message to bg script
        chromePort.postMessage(data);
    }

    function handleSavedTag(res){
        if(res.success){
            pulse.tagSaved = true;
            pulse.id = res.id;
            pulse.result = res.result; //used later to place permanently
            console.log('tag saved', res)
            //saveTagImages();
        }
    }


    function undoSaveTag(){

    }

    function closePulse(){
        console.log('close attempt');
        $('.' + pulse.class).hide().css('visible','hidden');
        pulse.target.jPulse( "disable" );
        pulse.menu.hide();

    }



    function showMessageMenu(fade){
        console.log('showMessageMenu');

        hideAllMenuContainers();
        $('#tag_menu_content').show();
        $('#pp_icon').attr('class', 'pp_text');

        $('#pulse_comment_textarea, #pulse_comment_input')
            .hide()
            .unbind()
            .on('keyup', function(e){
                if(e.keyCode == '13')
                    saveTagText();
            })

        $('#pulse_comment_input')
            .show()
            .val('')
            .attr('placeholder', 'Type what you\'re thinking...')
            .on('input', function(){
                pulse.comment = this.value;

                // expand to text area
                if(this.value.length > 40){
                    $(this).hide();
                    $('#pulse_comment_textarea')
                        .show()
                        .val(this.value)
                        .animate({'height':60}, 300)
                        .focus();
                }
            })
            .focus();

    }

    function saveTagText(){
        hideAllMenuContainers();
        $('#tag_menu_load_page, #tm_loader').show(); // show loader menu

        var data = {thoughts: pulse.comment, id: pulse.id, action:"socket", which: 'save_tag_text'};
        chromePort.postMessage(data);
    }

    function handleSavedTagText(res){
        console.log('saved text', res);
        if(res.success)
            setTimeout(function(){
                $('#tm_loader').hide();
                $('#tm_loader_message').show().html('Select a chain...');
                setTimeout(showChainMenu, 1000)
            }, 1000);
    }

    function showChainMenu(){
        hideAllMenuContainers();
        $('#chain_menu_expanded_list').show();
        $('#tag_menu_chain').fadeIn(300);
        $('#pp_icon').attr('class', 'pp_chain');
    }

    function saveTagChain(cID){
        console.log('saveTagChain');
        hideAllMenuContainers();
        $('#tag_menu_load_page, #tm_loader').show(); // show loader menu

        if(typeof cID !== 'number')
            cID = $(this).find('input').val();

        var data = {chainID: cID, tagID: pulse.id, action:"socket", which: 'save_tag_chain'};
        chromePort.postMessage(data);
    }

    function handleSavedTagChain(res){
        console.log('SavedTagChain', res);
        setTimeout(function(){
            $('#tm_loader').hide();
            $('#tm_loader_message').show().html('Tag saved.');
            setTimeout(function(){
                pulse.menu.fadeOut(200, function(){
                    // gerren
                    setExistingTag(pulse.result);

                    $('.' + pulse.class).hide().css('visible','hidden');
                    pulse.target.jPulse("disable");
                    //captureElement($('body'));
                });
            }, 2000);
        }, 1000);
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

        var req = {action: "socket", which: 'save_new_chain', chainName: chainName};
        chromePort.postMessage(req);
        console.log('save req', req);
    }

    function handleNewChain(response){
        console.log('saved chain', response);
        saveTagChain(response.chainID);
    }

    function cancelNewChain(){
        $('#chain_menu_expanded_list, #chain_menu_expanded_select').show();
        $('#chain_menu_expanded_new').hide();
    }

    function deleteChain(){
        if(!confirm('Are you sure you want to delete this')) return false;
        var cID = $(this).find('input').val();
        var req = {action: "socket", which: 'delete_chain', chainID: cID};
        console.log('delete chain', req);
        chromePort.postMessage(req);
    }

    function handleDeletedChain(response){
        console.log('deleted response', response);
        var aID = 'chain_delete_' + response.chainID;
        $('#' + aID).parent().fadeOut(300);
    }

    function handlePageTags(response){
        console.log('page tag response', response);
        setExistingTag(response.results);
    }

    function setExistingTag(tArray){
        console.log('setExistingTag', tArray);
        tArray.forEach(function(tag, i){
            var famSelector = getFamilySelector(tag.family);

            console.log('famSelector', famSelector);
            var target = $(famSelector.byClass);

            var psc = $('<div class="pulse_set_circle" id="psc_' + tag.tag_id + '"></div>');
            var psb = $('<div class="pulse_set_bar" id="psc_' + tag.tag_id + '"></div>');

            target.parent().append(psc);
            target.parent().append(psb);

            // circle
            psc.css('top', tag.placement.opt.top - .5 * psc.height());
            psc.css('left', tag.placement.opt.left - .5 * psc.width());

            // bar
            psb.css('top', tag.placement.opt.top - .5 * psb.height());
            psb.css('left', tag.placement.dims.opl * -1);
            psb.width(tag.placement.window.w);
        });
    }

    function captureElement(target){
        html2canvas(target[0], {
            onrendered: function(oldCanvas) {
                var dims = {x:500,y:500};
                var start = {left:0, top:0};
                if(pulse.pos.abs.x > dims.x/2) start.left = pulse.pos.abs.x - dims.x/2;
                if(pulse.pos.abs.y > dims.y/2) start.top = pulse.pos.abs.y - dims.y/2;

                var img = new Image();
                var newCanvas = document.createElement('CANVAS');
                var ctx = newCanvas.getContext('2d');
                newCanvas.width = dims.x;
                newCanvas.height = dims.y;

                img.onload = function (){
                    ctx.drawImage(this, start.left, start.top, dims.x, dims.y, 0, 0, dims.x, dims.y);
                    $('#pulse_preview').append(newCanvas);
                    $('#pulse_preview, #general_overlay').show();
                }

                img.src = oldCanvas.toDataURL("image/png");

            }
        });
    }

    function returnDimensions(c){
        var par = c.parent();
        if(par.css('position') != 'absolute')
            par.css('position', 'relative');

        var op = par.offset();
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
            ctx = canvas.getContext('2d');
            canvas.height = this.height;
            canvas.width = this.width;
            ctx.drawImage(this, 0, 0);
            var dataURL = canvas.toDataURL(outputFormat);
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

    function setFamilyTree(){
        var go = true;
        var current = pulse.target;
        var fam = [];
        var c = 0;
        while(go){
            var classVal = current.attr('class');
            if(classVal !== undefined) classVal = classVal.split(' ');
            var gen = {
                tagName: current.prop("tagName").toLowerCase(),
                class: classVal, //array
                id: current.attr('id'),
                index: 0
            };
            if(gen.tagName == 'body' || gen.tagName == 'html' || c > 200)
                go = false;
            else {
                gen.index = current.parent().find(gen.tagName).index(current);
                current = current.parent();
            }

            fam.push(gen);
            c++;
        }
        pulse.family = fam;
    }

    function getFamilySelector(fArray){
        var selector = {byTagName: '', byClass: '', byIndex: ''};

        fArray.forEach(function(f, i){
            var eq = ':eq(' + f.index + ')';
            var allEq = '';
            if(i <= 1) allEq = eq;// if target or parent, then be specific
            
            var className = (typeof f.class !== 'undefined' && $.trim(f.class) != '') ? '.' + f.class.join('.') : '';
            selector.byClass = f.tagName + className + allEq + ' ' + selector.byClass;
            selector.byTagName = f.tagName + allEq + ' ' + selector.byTagName;
            selector.byIndex = f.tagName + eq + ' ' + selector.byIndex;
        });

        return selector;
    }

}

//
// function saveTagImages(){
//     console.log('saveTagImages');
//     // 1. save target
//     if(pulse.tagType != 'img'){
//         html2canvas(pulse.target, {
//             background: '#ffffff',
//             onrendered: function(canvas) {
//                 saveTagImageProcess({
//                     str: canvas.toDataURL(),
//                     ext: 'png',
//                     type: 'target',
//                     fileID: pulse.id
//                 });
//             }
//         });
//     }
//
//     // 2. save generic image
//     if(pulse.genericImgSrc != null){
//         var img = new Image();
//         img.setAttribute('crossOrigin', 'anonymous');
//         var canvas = document.createElement('canvas');
//         var ctx = canvas.getContext('2d');
//
//         img.onload = function(){
//             canvas.width = this.width;
//             canvas.height = this.height;
//             ctx.drawImage(this, 0, 0);
//             saveTagImageProcess({
//                 str: canvas.toDataURL(),
//                 ext: 'png',
//                 type: 'generic',
//                 fileID: pulse.id
//             });
//         }
//         img.src = pulse.genericImgSrc
//     }
//
// }
//
// function showPreviewMenu(){
//     //tag_menu_preview
//     $('#tag_menu_who, #tag_menu_content').hide();
//     $('#tag_menu_preview').fadeIn(300);
//     $('#preview_back_button').unbind().on('click', showWhoMenu);
//
//     pulse.meme = pulse.isMemeSaved = false;
//
//     pulse.tagType = pulse.target.prop("tagName").toLowerCase();
//
//     switch(pulse.tagType){
//         case 'p':
//         case 'span':
//         case 'a':
//         case 'h1':
//         case 'h2':
//         case 'h3':
//         case 'h4':
//         case 'img':
//             createPulsePreview();
//             break;
//     }
// }
//
// function createPulsePreview(){
//     console.log('createPulsePreview');
//
//     // add canvas to document
//     $('.tag_item_user_name').html('gscoon:');
//     $('.tag_item_user_img').attr('src', 'images/users/1.jpg');
//
//     $('.tag_item_snippit_link').html(pulse.url);
//
//     if(pulse.tagType == 'img'){
//         createImageMeme(pulse.target.attr('src'));
//     }
//     else if(pulse.genericImgSrc != null){
//         $('.tag_item_thoughts').html(pulse.comment);
//         createImageIcon(pulse.genericImgSrc);
//         if(pulse.innerText != null && pulse.innerText != '')
//             $('.tag_item_snippit_text').html(pulse.innerText).ellipsis();
//     }
//
// }
//
// function createImageIcon(src){
//     var previewContainer = $('#tag_menu_preview_container');
//     var imageObj = new Image();
//     var canvas = previewContainer.find('.tag_item_snippit_img')[0];
//     imageObj.onload = function(){
//         var imageRatio = this.width/this.height;
//
//         if(this.width>this.height){
//             var squareLength = this.height;
//             var newPos = {l:(this.width - this.height)/2, t:0};
//         }
//         else{
//             var squareLength = this.width;
//             var newPos = {l:0, t:(this.height - this.width)/2};
//         }
//
//         var menuWidth = parseInt(pulse.menu.css('width'));
//
//         var canvasDims = {w: squareLength * imageRatio, h: squareLength * (1/imageRatio)};
//
//         var fontSize = 18;
//         var iconLength = 100;
//
//         canvas.width =  iconLength;
//         canvas.height = iconLength;
//
//         var context = canvas.getContext("2d");
//         context.save();
//
//         context.drawImage(this, 0, 0, squareLength, squareLength, 0, 0, iconLength, iconLength);
//     };
//     imageObj.src = src;
// }
//
// function createImageMeme(src){
//     console.log('createImageMeme');
//     var previewContainer = $('#tag_menu_preview_container');
//     var imageObj = new Image();
//     imageObj.setAttribute('crossOrigin', 'anonymous');
//     var canvas = previewContainer.find('.tag_item_snippit_img')[0];
//
//     imageObj.onload = function(){
//
//         var imageRatio = this.width / this.height;
//         var canvasDims = {w:previewContainer.innerWidth(), h:previewContainer.innerWidth() / imageRatio};
//         console.log({canvasDims:canvasDims});
//         canvas.width =  canvasDims.w;
//         canvas.height = canvasDims.h;
//
//         var context = canvas.getContext("2d");
//         context.save();
//         context.drawImage(this, 0, 0, this.width, this.height, 0, 0, canvasDims.w, canvasDims.h);
//
//         // transparent overlay
//         //context.fillStyle = "rgba(0, 0, 0, 0.70)";
//         //context.fillRect(0, 0, canvasDims.w, canvasDims.h);
//
//         // restore to the default which was saved immediatlely
//         context.restore();
//
//         var fontSize = 18;
//         context.font = fontSize + "px Open Sans";
//         context.shadowColor="black";
//         context.shadowBlur=7;
//         context.fillStyle  = "#ffffff";
//         // context.textBaseline="top";
//         context.textBaseline="hanging";
//
//         wrapText(context, pulse.comment, canvasDims.w * .05, canvasDims.h * .1, canvasDims.w * .9, fontSize * 1.25);
//
//         pulse.meme = canvas.toDataURL();
//
//         // gerren, this should make sure the tag is saved first saved...
//         saveTagImageProcess({
//             str: pulse.meme,
//             ext: 'png',
//             type: 'meme',
//             fileID: pulse.id
//         });
//     }
//
//     imageObj.src = src;
// }
//
// function wrapText(context, text, x, y, maxWidth, lineHeight) {
//     var words = text.split(' ');
//     var line = '';
//
//     for(var n = 0; n < words.length; n++) {
//         var testLine = line + words[n] + ' ';
//         var metrics = context.measureText(testLine);
//         var testWidth = metrics.width;
//         if (testWidth > maxWidth && n > 0) {
//             context.fillText(line, x, y);
//             line = words[n] + ' ';
//             y += lineHeight;
//         }
//         else
//             line = testLine;
//
//     }
//     context.fillText(line, x, y);
// }
