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
            else if(message.action === 'convert_image')
                handleCaptureRemoteResponse(message);
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
        // on key press

        var ctrlKey = 17, vKey = 86, cKey = 67, fKey = 70;
        $(window).on('keydown', function(e){
            if(e.keyCode == ctrlKey){
                if(ctrKeyPressed) return false;
                console.log('control key pressed');
                ctrKeyPressed = true;
                $('a').addClass('disabled');
            }
            else if(ctrKeyPressed && (e.keyCode == cKey || e.keyCode == vKey || e.keyCode == fKey)){
                console.log('special key');
                resetKeys();
            }
        })

        $(window).on('keyup', function(e){
            if(e.keyCode == ctrlKey){
                console.log('control key released');
                resetKeys();
            }
        })

        function resetKeys(){
            ctrKeyPressed = false;
            $('a.disabled').removeClass('disabled');
        }

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

        // get the position of the target in different ways
        setFamilyTree();

        pulse.class = randomStr(5);
        pulse.innerText = $.trim(pulse.target.text());
        pulse.pos = returnDimensions(pulse.target, e.pageX, e.pageY);
        var dims = pulse.pos.dims;

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

        $('#tag_menu_content').show(); // need this to get accurate width below
        var mw = pulse.menu.width();

        // figure out where place menu
        var menuPos = {top: y - 48/2, zIndex: z.menu};

        // if pulse is on the right side of the screen
        if(pulse.pos.window.w / 2 < x){
            pulse.pointer.attr('class', 'pulse_pointer_right');
            menuPos.left = x - mw - 80;
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
                    startDOMCapture();
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

            var classTarget = $($.trim(famSelector.byClass));
            console.log('targets found - class : ', classTarget.length);
            var indexTarget = $($.trim(famSelector.byIndex));
            console.log('targets found - index : ', indexTarget.length);
            var tagTarget = $($.trim(famSelector.byTagName));
            console.log('targets found - tag: ', tagTarget.length);

            // which one are you going with??
            var target = indexTarget;

            //var pos = returnDimensions(target, tag.placement.abs.x, tag.placement.abs.y);

            var psc = $('<div class="pulse_set_circle" id="psc_' + tag.tag_id + '"></div>');
            var psb = $('<div class="pulse_set_bar" id="psc_' + tag.tag_id + '"></div>');

            var par = target.parent();
            if(par.css('position') != 'absolute')
                par.css('position', 'relative');

            par.append(psc);
            //par.append(psb);

            //classTarget.parent().css('backgroundColor', '#000000');

            // circle
            psc.css('top', tag.placement.opt.top - .5 * psc.height());
            psc.css('left', tag.placement.opt.left - .5 * psc.width());

            // bar
            psb.css('top', tag.placement.opt.top - .5 * psb.height());
            psb.css('left', tag.placement.dims.opl * -1);
            psb.width($(window).width());
        });
    }

    function startDOMCapture(){
        pulse.cProp = {
            target: pulse.target,
            minW: 400,
            minH: 150,
            maxW: 800,
            maxH: 600,
            defaultW: 600,
            defaultH: 400,
            firstW: null, // first width match
            firstH: null, // first height match
            finalW: null,
            finalH: null,
            exactFit: true,
            start:{
                left: 0,
                top: 0
            },
            timing: {}, // performance testing
            remote: {}  //images
        };

        var cProp = pulse.cProp;
        cProp.timing['start'] = +new Date() / 1000;  // log start timestamp
        handleCaptureDetails();
        cProp.timing['dets'] = +new Date() / 1000 - cProp.timing['start'];  // log start timestamp
        handleCaptureCrop();
        cProp.timing['crop'] = +new Date() / 1000 - cProp.timing['start'];  // log start timestamp
        handleCaptureRemoteImages();

    }

    function handleCaptureDetails(){
        var cProp = pulse.cProp;

        while(true){
            // set current capture target properties
            var c = {w: cProp.target.width(), h: cProp.target.height(), tagName: cProp.target.prop("tagName").toLowerCase()};

            // if this is the first target to reach the dimension criteria
            if(cProp.firstW == null && c.w >= cProp.minW) cProp.firstW = c.w;
            if(cProp.firstH == null && c.h >= cProp.minH) cProp.firstH = c.h;

            // if both the width and height criteria have been met
            if((cProp.firstW != null && cProp.firstH != null) || c.tagName == 'body'){
                // figure out final width
                if(c.w <= cProp.maxW) // if cProp.target width is less than max
                    cProp.finalW = c.w;
                else if(cProp.firstW != null && cProp.firstW <= cProp.maxW){ // if the first found width is set and less than the max
                    cProp.finalW = cProp.firstW;
                    cProp.exactFit = false;
                }
                else {
                    cProp.finalW = cProp.defaultW
                    cProp.exactFit = false;
                }

                // figure out final Height
                if(c.h <= cProp.maxH)
                    cProp.finalH = c.h;
                else if(cProp.firstH != null && cProp.firstH <= cProp.maxH){
                    cProp.finalH = cProp.firstH;
                    cProp.exactFit = false;
                }
                else {
                    cProp.finalH = cProp.defaultH
                    cProp.exactFit = false;
                }

                break;
            }

            cProp.target = cProp.target.parent();
        }

        console.log('capture element:', cProp);
    }

    function handleCaptureCrop(){

        var cProp = pulse.cProp;

        if(!cProp.exactFit){
            var captureOffset = cProp.target.offset();

            var calcedTop = pulse.pos.abs.y - captureOffset.top - cProp.finalH/2;
            var calcedLeft = pulse.pos.abs.x - captureOffset.left - cProp.finalW/2;

            // if it pushes against bottom
            if((cProp.target.height() - calcedTop) < cProp.finalH)
                cProp.start.top = cProp.target.height() - cProp.finalH;
            else if(calcedTop < 0) // if it pushes against top
                cProp.start.top = 0;
            else
                cProp.start.top = calcedTop;

            // if it pushes against the sides
            if((cProp.target.width() - calcedLeft) < cProp.finalW)
                cProp.start.left = cProp.target.width() - cProp.finalW;
            else if(calcedLeft < 0) // if it pushes against top
                cProp.start.left = 0;
            else
                cProp.start.left = calcedLeft;

        }

        console.log('handleCaptureCrop', cProp);
    }

    function handleCaptureRemoteImages(){
        var capImgs = pulse.cProp.target.find('img');
        var cp = pulse.cProp;
        cp.remote = {
            completed: 0,
            count: 0,
            existing: {}
        };

        // loop through all elements looking for an image

        pulse.cProp.target.find('*').each(function(i,v){
            var ele = $(this);

            // if traditional image...
            if(ele.prop("tagName").toLowerCase() == 'img'){
                var obj = {url: ele.attr('src'), type:'img'}
                sendCaptureRemote.call(this, obj);
            }

            // if background image
            var bgURL = ele.css('background-image');
            if(bgURL){
                bgURL = bgURL.replace('url(','').replace(')','');
                if(bgURL.toLowerCase() != 'none'){
                    var obj = {url: bgURL, type:'bg'};
                    sendCaptureRemote.call(this, obj);
                }
            }
        });

        if(cp.remote.count == 0) finishDOMCapture();

        console.log('handleCaptureRemoteImages', pulse.cProp);
    }

    function sendCaptureRemote(o){
        var cp = pulse.cProp;
        var dataTag = 'data-pulse-convert-' + o.type;
        // check if full url
        if(o.url.split('//') == 1)
            o.url = window.location.protocol + '//' + window.location.hostname + o.url;

        // existing image
        if(typeof cp.remote.existing[o.type + o.url] !== 'undefined')
            $(this).attr(dataTag, cp.remote.existing[o.type + o.url]);
        else{
            var id = randomStr(5);
            $(this).attr(dataTag, id);  // set data tag
            cp.remote.existing[o.type + o.url] = id; // add it to the existing list

            var sendObj = {action: "convert_image", format: 'image/png', url: o.url, type: o.type, id: id};
            console.log('sendCaptureRemote', sendObj);

            chromePort.postMessage(sendObj);
            cp.remote.count++;
        }
    }

    function handleCaptureRemoteResponse(r){
        console.log('handleCaptureRemoteResponse', pulse.cProp);
        var ele = $('[data-pulse-convert-' + r.type + '="' + r.id + '"]');

        if(r.type == 'img')
            ele.attr('src', r.dataURL);
        else
            ele.css('background-image', 'url(' + r.dataURL + ')');

        pulse.cProp.remote.completed++;
        if(pulse.cProp.remote.completed == pulse.cProp.remote.count)
            finishDOMCapture();
    }

    function finishDOMCapture(){
        console.log('finishDOMCapture');
        var cp = pulse.cProp;
        cp.timing['remote'] = +new Date() / 1000 - cp.timing['start'];  // log start timestamp
        var bgColor = $('body').css("background-color");

        html2canvas(cp.target[0], {
            onrendered: function(oldCanvas) {
                cp.timing['render'] = +new Date() / 1000 - cp.timing['start'];  // log start timestamp
                var img = new Image();
                var newCanvas = document.createElement('CANVAS');
                var ctx = newCanvas.getContext('2d');
                newCanvas.width = cp.finalW;
                newCanvas.height = cp.finalH;

                img.onload = function (){
                    ctx.drawImage(this, cp.start.left, cp.start.top, cp.finalW, cp.finalH, 0, 0, cp.finalW, cp.finalH);
                    $('#pulse_preview').append(newCanvas);
                    $('#pulse_preview, #general_overlay').show();
                    cp.timing['end'] = +new Date() / 1000 - cp.timing['start'];  // log start timestamp
                    console.log(cp.timing);
                }

                img.src = oldCanvas.toDataURL("image/png");

            },
            background: bgColor,
            allowTaint: true,
            logging: true
        });
    }

    function returnDimensions(c, x, y){
        var par = c.parent();
        if(par.css('position') != 'absolute')
            par.css('position', 'relative');

        var op = par.offset();
        if(typeof op === 'undefined')
            op = {left:0, top:0};

        var retObj = {};

        var dims = {
            w: c.innerWidth(),  // target inner width
            h: c.innerHeight(), // target inner height
            ol: c.offset().left, // target left relative to doocument
            ot: c.offset().top, // target top relative to doocument
            opl: op.left,
            opt: op.top
        }

        retObj.abs = {x: x, y: y};
        retObj.rel = {x: (x - dims.ol), y:(y - dims.ot)};
        retObj.spacing = {left: dims.ol - dims.opl, top: dims.ot - dims.opt};
        retObj.opt = {left: retObj.rel.x + retObj.spacing.left, top: retObj.rel.y + retObj.spacing.top};
        retObj.window = {w: $(window).width(), h: $(window).height()};
        retObj.dims = dims;

        return retObj;
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
            var classVal = $.trim(current.attr('class'));
            if(classVal !== undefined) classVal = classVal.split(/ +/); // look for one or more spaces
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
