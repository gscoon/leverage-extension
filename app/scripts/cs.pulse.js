'use strict';

window.onload = function(){
    chickenPox.start();
}

var chickenPox =  new function(){

    this.main = {
        chromePort: null,
        lastPortCheck: null, // keep track of connection to bg script
        portIntervalID: null
    }

    var feedURL = 'http://localhost:1111/feed';

    var ctrKeyPressed = false;
    this.z = {pulse: 999999999, menu: 99999999999997, menuX: 99999999999999, select: 99999999999998};

    var pulse = {
        menu: null,
        isMenuActive: false,
        target: null,
        class: null,
        pos: {},
        thoughts: '',
        innerText: '',
        url: window.location.href,
        id: null,
        meme: false,
        isMemeSaved: false,
        tagSaved: false,
        pointer: null
    };

    this.user = {}; // current user data

    this.userImages = {}; // all users displayed...

    this.keys = {ctrl: 17, v: 86, c:67, f: 70, esc: 27, enter: 13};

    this.start = function(){
        console.log('content script started');
        handleBGConnection();
        setEventHandlers();
        feedCheck();
    }

    function handleBGConnection(){
        // used to maintain connection with background script
        chickenPox.main.chromePort = chrome.runtime.connect({name:"pulsecontentscript"});
        setChromeConnectionListener();

        // handle pulse menu
        chickenPox.main.chromePort.postMessage({action:"menu"});
        chickenPox.main.chromePort.postMessage({action:"user"});
    }

    function setChromeConnectionListener(){
        chickenPox.main.chromePort.onMessage.addListener(function(message, sender){
            if(message.action === "menu")
                handleMenuResponse(message);
            else if(message.action === 'user')
                handleUser(message);
            else if(message.action === 'checkup')
                handleCheckup(message);
            else if(message.action === 'tag_content')
                chickenPox.handleTagContent(message);
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
            else if(message.action === 'convert_image2')
                handlePageImageResponse(message);
            else if(message.action === 'undo_tag')
                handleUndoTag(message);
            else if(message.action === 'delete_discussion_tag')
                chickenPox.handleDiscussionDelete(message);
            else if(message.action === 'feed')
                handleFeed(message);
        });
    }

    function feedCheck(){
        // ask for feed
        console.log(pulse.url, feedURL);
        if(pulse.url == feedURL){
            chickenPox.main.chromePort.postMessage({action:"socket", which:'get_feed'});
            console.log('feed request');
        }

    }

    function handleFeed(res){
        console.log('handleFeed');
        $('body').html(res.feed);
        $('.feed_response_input_img').attr('src', chickenPox.user.images.small);
        chickenPox.updateTimeSince();
    }

    // menu received from bg script
    function handleMenuResponse(response){
        // remove old copies
        $('#tag_menu').remove();
        // add menu to html body
        $('body').append(response.menu);
        pulse.menu = $('#tag_menu');

        chickenPox.doCSSTricks(pulse.menu, 'menu');

        $('#x').unbind().on('click', closePulse).css('zIndex', chickenPox.z.menuX);

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
            if(e.keyCode == chickenPox.keys.enter) saveNewChain();
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

    function handleUser(response){
        console.log('handleUser', response.user);
        $.extend(chickenPox.user, response.user);
        chickenPox.userImages[chickenPox.user.user_id] = chickenPox.user.images;

        // get current page tags
        chickenPox.main.chromePort.postMessage({action: "socket", which: 'get_page_tags', url: window.location.href});
    }

    function setEventHandlers(){
        $(window).on('keydown', function(e){
            if(e.keyCode == chickenPox.keys.ctrl){
                if(ctrKeyPressed) return false;
                console.log('control key pressed');
                ctrKeyPressed = true;
                $('a').addClass('disabled');
            }
            else if(ctrKeyPressed && (e.keyCode == chickenPox.keys.c || e.keyCode == chickenPox.keys.v || e.keyCode == chickenPox.keys.f)){
                console.log('special key');
                resetKeys();
            }
            else if(pulse.isMenuActive && e.keyCode == chickenPox.keys.esc){
                undoPulse();
            }
        })

        $(window).on('keyup', function(e){
            if(e.keyCode == chickenPox.keys.ctrl){
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
        pulse.isMenuActive = true;

        // get the position of the target in different ways
        setFamilyTree();

        pulse.class = randomStr(5);
        pulse.innerText = $.trim(pulse.target.text());
        pulse.pos = returnDimensions(pulse.target, e.pageX, e.pageY);
        var dims = pulse.pos.dims;

        pulse.pos.abs = {x: e.pageX, y: e.pageY}
        pulse.pos.rel = {x: (e.pageX - dims.ol), y:(e.pageY - dims.ot)};
        pulse.pos.spacing = {left: dims.ol - dims.opl, top: dims.ot - dims.opt};
        pulse.pos.opt = {left: pulse.pos.rel.x + pulse.pos.spacing.left, top: pulse.pos.rel.y + pulse.pos.spacing.top};
        pulse.pos.window = {w: $(window).width(), h: $(window).height()};

        var options = {
            interval: 300,
            size:70,
            zIndex: chickenPox.z.pulse,
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

        // set image
        $('#pulse_user_image').attr('src', chickenPox.user.images.small);

        // need this to get accurate width below
        $('#tag_menu_content').show();
        var mw = pulse.menu.width();

        // figure out where place menu
        var menuPos = {top: y - 48/2, zIndex: chickenPox.z.menu};

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
        var saved = $('#tag_menu_notification_saved');
        saved.hide();

        pulse.tagSaved = false;
        var data = {
            action:"socket",
            which:'save_tag',
            url: pulse.url,
            pageTitle: document.title,
            share: '',
            pulseText: pulse.innerText,
            thoughts: pulse.thoughts,
            zoom: '',
            pulsePos: JSON.stringify(pulse.pos),
            family: JSON.stringify(pulse.family),
            html: '<html>' + document.documentElement.innerHTML + '</html>'
        };
        // send save message to bg script
        chickenPox.main.chromePort.postMessage(data);
    }

    function handleSavedTag(res){
        if(res.success){
            pulse.tagSaved = true;
            pulse.id = res.id;
            pulse.saved = res.result[0]; //used later to place permanently
            pulse.saved.name = chickenPox.user.name;
            // save favicon and generic
            handlePageImages();
        }
    }

    // undo tag
    function undoPulse(){
        var data = {
            action:"socket",
            which:'undo_tag',
            id: pulse.id,
        };
        // send save message to bg script
        closePulse();
        chickenPox.main.chromePort.postMessage(data);
    }

    function handleUndoTag(m){
        console.log('handleUndoTag', m);
    }

    function closePulse(){
        $('.' + pulse.class).hide().css('visible','hidden');
        pulse.target.jPulse( "disable" );
        pulse.menu.hide();
        pulse.isMenuActive = false;
    }

    function showMessageMenu(fade){
        hideAllMenuContainers();
        $('#tag_menu_content').show();
        $('#pp_icon').attr('class', 'pp_text');

        $('#pulse_comment_textarea, #pulse_comment_input')
            .hide()
            .unbind()
            .on('keyup', function(e){
                if(e.keyCode == chickenPox.keys.enter)
                    saveTagText.call(this);
            })

        $('#pulse_comment_input')
            .show()
            .val('')
            .attr('placeholder', 'Type what you\'re thinking...')
            .on('input', function(){
                // expand to text area
                if(this.value.length > 32){
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
        pulse.thoughts = $(this).val();

        var data = {thoughts: pulse.thoughts, id: pulse.id, action:"socket", which: 'save_tag_text'};

        console.log('thoughts', data);
        chickenPox.main.chromePort.postMessage(data);
    }

    function handleSavedTagText(res){
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
        hideAllMenuContainers();
        $('#tag_menu_load_page, #tm_loader').show(); // show loader menu

        if(typeof cID !== 'number')
            cID = $(this).find('input').val();

        var data = {chainID: cID, tagID: pulse.id, action:"socket", which: 'save_tag_chain'};
        chickenPox.main.chromePort.postMessage(data);
        pulse.saved.chain_id = cID;
        pulse.saved.chain_name = chickenPox.user.chains[cID].name;
        console.log('chain name', chickenPox.user.chains[cID], chickenPox.user.chains[cID].name)
    }

    function handleSavedTagChain(res){
        setTimeout(function(){
            $('#tm_loader').hide();
            $('#tm_loader_message').show().html('Tag saved.');
            setTimeout(function(){
                pulse.menu.fadeOut(200, function(){
                    // gerren
                    pulse.saved.thoughts = pulse.thoughts;
                    console.log('pulse.saved', pulse.saved);
                    chickenPox.setExistingTag([pulse.saved]);

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
        chickenPox.main.chromePort.postMessage(req);
    }

    function handleNewChain(response){
        console.log('handleNewChain', response);
        saveTagChain(response.chain.chain_id);
        chickenPox.user.chain[response.chain.chain_id] = response.chain;
    }

    function cancelNewChain(){
        $('#chain_menu_expanded_list, #chain_menu_expanded_select').show();
        $('#chain_menu_expanded_new').hide();
    }

    function deleteChain(){
        if(!confirm('Are you sure you want to delete this')) return false;
        var cID = $(this).find('input').val();
        var req = {action: "socket", which: 'delete_chain', chainID: cID};
        chickenPox.main.chromePort.postMessage(req);
    }

    function handleDeletedChain(response){
        var aID = 'chain_delete_' + response.chainID;
        $('#' + aID).parent().fadeOut(300);
    }

    function handlePageTags(response){
        chickenPox.setExistingTag(response.results);
    }

    // Image capture... Way too long
    // 1. startDOMCapture               Set capture properties like min width, max, etc
    // 2. determineCaptureDimensions
    // 3. handleCaptureCrop             if necessary,...
    // beginning of 3 step process to handle remote images
    // 4. handleCaptureRemoteImages     start it up
    // 5. remoteImageCaptureCheck       check to see if item is an image
    // 6. sendCaptureRemote             send image url to bg script
    // 7. handleCaptureRemoteResponse   callback from bg script
    // 8. finishDOMCapture              finally run the html2canvas script

    function startDOMCapture(){
        pulse.cProp = {
            target: pulse.target,
            minW: 400,
            minH: 150,
            maxW: 1000,
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
        determineCaptureDimensions();
        cProp.timing['dets'] = +new Date() / 1000 - cProp.timing['start'];  // log start timestamp
        handleCaptureCrop();
        cProp.timing['crop'] = +new Date() / 1000 - cProp.timing['start'];  // log start timestamp
        handleCaptureRemoteImages();

    }

    function determineCaptureDimensions(){
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

        console.log('determineCaptureDimensions:', cProp);
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
        var eles = pulse.cProp.target.find('*');
        eles.push(pulse.cProp.target[0]);

        pulse.cProp.target.find('*').each(remoteImageCaptureCheck); // find all targets iwthin
        pulse.cProp.target.each(remoteImageCaptureCheck); // make sure you include the actual target

        if(cp.remote.count == 0) finishDOMCapture();

        console.log('handleCaptureRemoteImages', pulse.cProp);
    }

    function remoteImageCaptureCheck(a, b){
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
    }

    function sendCaptureRemote(o){
        var cp = pulse.cProp;
        var dataTag = 'data-pulse-convert-' + o.type;
        // check if full url
        o.url = returnAbsoluteURL(o.url);

        // existing image
        if(typeof cp.remote.existing[o.type + o.url] !== 'undefined')
            $(this).attr(dataTag, cp.remote.existing[o.type + o.url]);
        else{
            var id = randomStr(5);
            $(this).attr(dataTag, id);  // set data tag
            cp.remote.existing[o.type + o.url] = id; // add it to the existing list

            var sendObj = {action: "convert_image", format: 'image/png', url: o.url, type: o.type, id: id};

            chickenPox.main.chromePort.postMessage(sendObj);
            cp.remote.count++;
        }
    }

    function handleCaptureRemoteResponse(r){
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
        var cp = pulse.cProp;
        cp.timing['remote'] = +new Date() / 1000 - cp.timing['start'];  // log start timestamp
        var bgColor = $('body').css("background-color");

        html2canvas(cp.target[0], {
            background: getMyBackgroundColor(cp.target),
            allowTaint: true,
            logging: true,
            onrendered: function(oldCanvas) {
                cp.timing['render'] = +new Date() / 1000 - cp.timing['start'];  // log start timestamp
                var img = new Image();
                var newCanvas = document.createElement('CANVAS');
                var ctx = newCanvas.getContext('2d');
                newCanvas.width = cp.finalW;
                newCanvas.height = cp.finalH;

                img.onload = function (){
                    ctx.drawImage(this, cp.start.left, cp.start.top, cp.finalW, cp.finalH, 0, 0, cp.finalW, cp.finalH);

                    //pulse.saved.meta_images.target = true;
                    savePageImage("target", newCanvas.toDataURL("image/png"));

                    $('#pulse_preview').append(newCanvas);
                    $('#pulse_preview, #general_overlay').show();
                    cp.timing['end'] = +new Date() / 1000 - cp.timing['start'];  // log start timestamp
                }

                img.src = oldCanvas.toDataURL("image/png");

            }
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

    function getMyBackgroundColor(t){
        var current = t;
        var go = true;
        var blank = "rgba(0, 0, 0, 0)";
        while (go){
            var bg = current.css('background-color');

            if(bg != blank) return bg;

            if(current.prop("tagName").toLowerCase() == 'body')
                go = false;
            else
                current = current.parent();
        }

        return "rgb(255,255,255)"; // return white
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
            onSuccess(dataURL);
            canvas = null;
        };

        img.onerror = callback.bind(null, false);

        img.src = url;
    }

    function handlePageImages(){
        // favicons first
        var favURL = returnAbsoluteURL('/favicon.ico');
        var sendObj = {action: "convert_image2", format: 'image/png', url: favURL, type: 'favicon'};
        var favMeta = $('link[rel="shortcut icon"]');
        if(favMeta.length > 0){
            var favMetaURL = returnAbsoluteURL(favMeta.attr('href'));
            sendObj.url = [favURL, favMetaURL];
        }
        chickenPox.main.chromePort.postMessage(sendObj);

        // generic image?
        var generic = $('meta[property="og:image"]');
        if(generic.length > 0){
            var url = returnAbsoluteURL(generic.attr('content'));
            var sendObj = {action: "convert_image2", format: 'image/png', url: url, type: 'generic'};
            chickenPox.main.chromePort.postMessage(sendObj);
        }
    }

    function handlePageImageResponse(r){
        console.log('handlePageImageResponse', r.type, r.dataURL == true);
        if(r.dataURL)
            savePageImage(r.type, r.dataURL);
    }

    function savePageImage(whichImage, dataURL){
        var req = {
            action: "socket",
            which: "save_image",
            imageType: whichImage,
            dataURL: dataURL,
            tagID: pulse.saved.tag_id,
            fileID: pulse.saved.file_id
        }
        chickenPox.main.chromePort.postMessage(req);
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

    function handleCheckup(r){
        // update the check last port with the value from the bg script
        // this is send periodically from the bg script
        chickenPox.main.lastPortCheck = r.time;
        //console.log('checkup', r);
    }

    function returnAbsoluteURL(url){
        var h = 'http';
        console.log('start abs url', url, url.split('//'));
        if(url.split('//').length == 1) // if it's a relative url
            url = window.location.protocol + '//' + window.location.hostname + url;
        else if(url.substring(0, h.length) !== h)
            url = window.location.protocol + url;

        console.log('end abs url', url);
        return url;
    }

    this.doCSSTricks = function(ele, type){
        if(type == 'menu')
            ele.find('*').css({'line-height': 'normal', 'box-sizing':'initial'});
        else if(type == 'circle')
            ele.css({'padding': '0px', 'margin':'0px'});
    }

    this.updateTimeSince = function() {
        var dTag = 'data-pulse-ts';


        $('[' + dTag + ']').each(function(i, span){
            var date = $(span).attr(dTag);

            if (typeof date !== 'object')
                date = new Date(date);

            var seconds = Math.floor((new Date() - date) / 1000);
            var intervalType;

            var interval = Math.floor(seconds / 31536000);
            if (interval >= 1) {
                intervalType = 'year';
            } else {
                interval = Math.floor(seconds / 2592000);
                if (interval >= 1) {
                    intervalType = 'month';
                } else {
                    interval = Math.floor(seconds / 86400);
                    if (interval >= 1) {
                        intervalType = 'day';
                    } else {
                        interval = Math.floor(seconds / 3600);
                        if (interval >= 1) {
                            intervalType = "hour";
                        } else {
                            interval = Math.floor(seconds / 60);
                            if (interval >= 1) {
                                intervalType = "minute";
                            } else {
                                interval = seconds;
                                intervalType = "second";
                            }
                        }
                    }
                }
            }

            if (interval > 1 || interval === 0) {
                intervalType += 's';
            }

            var curr = interval + ' ' + intervalType + ' ago';
            $(span).html(curr);
        });
    }
}
