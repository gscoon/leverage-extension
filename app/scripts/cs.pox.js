'use strict';
(function(){

    var cp = {};
    window.chickenPox = cp;
    //$(cp.start);

    cp.page = {
        chromePort: null,
        lastPortCheck: null, // keep track of connection to bg script
        portIntervalID: null,
        url: window.location.href,
        host: window.location.hostname,
        domain: null
    }

    var ctrlKey = {isPressed: false, pressID: null};

    // mouse tracking for overlay pulsing../
    var mouse = {
        track: false,
        l: null, //left
        t: null,  // top
        $spotHolder: null
    }

    cp.user = {}; // current user data

    cp.userImages = {}; // all users displayed...

    (cp.start = function(){
        $('html, body').css({
            //height: '100%',
            margin:0,
            padding:0
        });

        $('body').css({
            //height: '100%',
            //position: 'relative'
        });

		var patt = /chickenpox\.io$/ig
		var isChicken = patt.test(cp.page.host);
		console.log('content script started.', cp.page.host, isChicken);
		if(isChicken)
			return;

        handleBGPort();
        handleMessages();
        setEventHandlers();

        // get menu
        sendMessage({action: "menu"}, handlePoxMenu);
        sendMessage({action: "user"}, handleUser);
        sendMessage({action: "domain"}, handleDomain);
    })();

    function handleMessages(){
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            if(!("action" in request)) return;

            switch(request.action){
                case 'shot_overlay':
                    showSpotOverlay(sendResponse);
                    break;
                case 'set_favicon':
                    setFavicon(request.faviconURL, sendResponse);
                    break;
                case 'handle_page_tags':
                    handlePageTags(request, sendResponse);
                    break;
                case 'show_page_tags':
                    showPageTags(request, sendResponse);
                    break;
            }
        });
    }

    function handleBGPort(){
        // used to maintain connection with background script
        cp.page.chromePort = chrome.runtime.connect({name:"poxcontentscript"});
        setChromeConnectionListener();
    }

    function setChromeConnectionListener(){
        cp.page.chromePort.onMessage.addListener(function(message, sender){
            // empty
        });
    }

    // menu received from bg script
    function handlePoxMenu(response){
        console.log('pox menu', response);
        if(typeof response == 'object'){
			// remove old copies
			$('#pox--tag_menu').remove();
			// add menu to html body
			$('body').append(response.menu);
            mouse.$spotHolder = $('#pox--spot_holder');
		}

    }

    function handlePageTags(response){
        if(!response.results || typeof(response.results) !== 'object')
            return;

        cp.setExistingTag(response.results);
    }

	// get user info from bg script
    function handleUser(response){
        console.log('user', response);
        cp.user = response.user;
    }

    // get user info from bg script
	function handleDomain(response){
		cp.page.domain = response.domain;
	}

    function setEventHandlers(){
        $(window).on('keydown', function(e){
            if(e.keyCode == cp.keys.ctrl){
                if(ctrlKey.isPressed) return false;
                console.log('control key pressed');
                $('a').addClass('pox--disabled');
                startCtrlTimer();
            }
            else if(ctrlKey.isPressed && (e.keyCode == cp.keys.c || e.keyCode == cp.keys.v || e.keyCode == cp.keys.f)){
                console.log('special key');
                resetCtrlKey();
            }
            else if(cp.pulse.isMenuActive && e.keyCode == cp.keys.esc){
                cp.closePulse();
            }
        })

        $(window).on('keyup', function(e){
            if(e.keyCode == cp.keys.ctrl){
                console.log('control key released');
                resetCtrlKey();
            }
        })

       // pulsate!!
       $(window).on('click', function(e){
            if(!ctrlKey.isPressed)
                return;
            pulsate(e, e.target)
        });

       $(document).bind('mousemove', function(e){
            if(!mouse.track)
                return;

            var l = mouse.l = e.pageX;
            var t = mouse.t = e.pageY;

            // spot holder shows something while pulse warms up
            mouse.$spotHolder.css({left: l - 10, top: t - 10});
        });

    }

    var pulse;

    // create annotation / pulse
    function pulsate(e, target){
        pulse = cp.pulse;

        // get screenshot before everything pops up
        pulse.images.screenshot = null;

        if(pulse.target != null)
            cp.closePulse();

        pulse.target = $(target);
        pulse.isMenuActive = true;

        // get the position of the target in different ways
        cp.setFamilyTree();

        pulse.class = cp.genRandomStr(5);
        pulse.innerText = $.trim(pulse.target.text());
        pulse.pos = cp.returnDimensions(pulse.target, e);

        //console.log(pulse.pos);

        var options = {
            interval: 300,
            size:70,
            zIndex: cp.z.pulse,
            left: pulse.pos.opt.left,
            top: pulse.pos.opt.top,
            class: pulse.class,
            color: '#780808'
        };

        if(pulse.target.prop("tagName")  == 'HTML')
            pulse.target = $('body');

        console.log('set jpulse');
        pulse.target.jPulse(options);
		pulse.id = cp.genRandomStr(10);

		//analyzeDOM();
        //box.js
        
		cp.showTagMenu(menuSetCallback);
    }

    function menuSetCallback(done){
        pulse.menu.hide().css(pulse.menuPos).fadeIn(300, function(){
            done();
        });

        // show the resize box!
        cp.showResizeBox({
            targetLeft: pulse.pos.abs.x,
            targetTop: pulse.pos.abs.y,
            left: $(window).scrollLeft() + pulse.cProp.start.left,
            top: $(window).scrollTop() + pulse.cProp.start.top,
            height: pulse.cProp.finalH,
            width: pulse.cProp.finalW,
            z: cp.z.menu - 10
        });
   
    }


    // called from popup.js
    function showSpotOverlay(send){
        $('#pox--general_overlay').show();
        mouse.track = true;
        mouse.$spotHolder
            .show()
            .css('display','block')
            .on('click', function(e){
                mouse.track = false;
                $('#pox--general_overlay').hide();
                $(this).unbind().hide(0, function(){
                    var pos = {
                        x: e.pageX - $(window).scrollLeft(),
                        y: e.pageY - $(window).scrollTop(),
                    }
                    var target = document.elementFromPoint(pos.x, pos.y);
                    console.log('overlay clicked; target: ', pos, target);
                    pulsate(e, target);
                });
            });
        send(true);
    }


    // finally, save the spot
    // and associate with the screenshot
	cp.finishSpot = function(done){
        console.log('finish spot');

        $('.pox--pulse_set_circle, '+'.'+pulse.class).hide();
        pulse.menu.hide();
        cp.hidePoxBox();
		
        sendMessage({action:'screenshot'}, function(dataURL){
            pulse.menu.show();
            cp.showPoxBox();
            $('.pox--pulse_set_circle, '+'.'+pulse.class).show();

            pulse.images.screenshot = dataURL;
            //$('#pox--tag_menu_content').show();
            
            getOtherImages();
        });
        
        // get favicon and generic images
        function getOtherImages(){
            cp.handlePageImages(function(){
                // save text and spot object
                saveSpot();
            });
        }


        function saveSpot(){
            var spot = {
                url: pulse.url,
                thoughts: pulse.thoughts,
                placement: pulse.pos,
                family: pulse.family,
                pageTitle: pulse.pageTitle,
                images: pulse.images,
                cProp: pulse.cProp
            };

            // send message to bg which makes post request
            sendMessage({action: 'show_preview', spot: spot}, function(response){
                // hide pulse menu
                cp.closePulse();

                if(!response.status)
                    return;

                // set spot id from response
                spot.id = response.id;

                // set the existing tag; found in discussion.js
                cp.setExistingTag([{spot_json: spot}]);

                // hide pulsating circle
                $('.' + pulse.class).hide().css('visible','hidden');
                pulse.target.jPulse("disable");


                cp.handleMenuCompletion(response);

                if(typeof done == 'function')
                    done();
            });
        }
		
	}

    // set from bg script
    var bgFavicon = null;
    function setFavicon(f){
        bgFavicon = f;
    }

	cp.handlePageImages = function(callback){
		var responseCount = 0;
		var totalImages = 0;

        // favicons first
        var favURL = bgFavicon;
        if(!favURL){
            var favMeta = $('link[rel="icon"]');
            favURL = (favMeta.length)?returnAbsoluteURL(favMeta.attr('href')):returnAbsoluteURL('/favicon.ico');
        }

		handleDataURL({url: favURL, type: 'favicon'});

        // generic image?
        var generic = $('meta[property="og:image"]');
        if(generic.length > 0){
            var url = returnAbsoluteURL(generic.attr('content'));
			handleDataURL({url: url, type: 'generic'});
        }

		var logoURL = "https://logo.clearbit.com/" + pulse.host;
		handleDataURL({url: logoURL, type: 'logo'});

		function handleDataURL(obj){
			totalImages++;
			var ext = returnExtension(obj.url);
			sendMessage({action: 'data_url', url: obj.url, format: ext}, function(d){
				if(d)
					pulse.images[obj.type]= d;
				responseCount++;
				if(responseCount == totalImages)
					callback(true);

			})
		}

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

	function sendMessage(m, callback){
        chrome.runtime.sendMessage(m, callback);
    }

	// Image capture... Way too long
    // 1. analyzeDOM               Set capture properties like min width, max, etc
    // 2. determineCaptureDimensions
    // 3. handleCaptureCrop             if necessary,...
    // beginning of 3 step process to handle remote images
    // 4. handleCaptureRemoteImages     start it up
    // 5. remoteImageCaptureCheck       check to see if item is an image
    // 6. sendCaptureRemote             send image url to bg script
    // 7. handleCaptureRemoteResponse   callback from bg script
    // 8. finishDOMCapture              finally run the html2canvas script

    var analyzeDOM = cp.analyzeDOM = function(){
        pulse.cProp = {
            target: pulse.target,
            minW: 500,
            minH: 315, // because facebook
            maxW: 1200, // leave room for text
            maxH: 720,
            defaultW: 600,
            defaultH: 400,
            firstW: null, // first width match
            firstH: null, // first height match
            finalW: null,
            finalH: null,
            exactFit: true,
            start:{
                left: 0, // where to start cropping within the target element
                top: 0  // where to start cropping within the target element
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
        //handleCaptureRemoteImages();

    }

    cp.updateCrop = function(updateObj, type){
        pulse.cProp.finalW = updateObj.width;
        pulse.cProp.finalH = updateObj.height;
        pulse.cProp.start.left = updateObj.left;
        pulse.cProp.start.top = updateObj.top;
        if('type' in updateObj && updateObj.type == 'absolute'){
            pulse.cProp.start.top -= $(window).scrollTop();
            pulse.cProp.start.left -= $(window).scrollLeft();
        }
    }

    function determineCaptureDimensions(){
        var cProp = pulse.cProp;

        while(true){
            // set current capture target properties
            var c = {w: cProp.target.outerWidth(), h: cProp.target.outerHeight(), tagName: cProp.target.prop("tagName").toLowerCase()};

            // if this is the first target to reach the dimension criteria
            if(cProp.firstW == null && c.w >= cProp.minW) cProp.firstW = c.w;
            if(cProp.firstH == null && c.h >= cProp.minH) cProp.firstH = c.h;

            // if both the width and height criteria have been met
            if((cProp.firstW != null && cProp.firstH != null) || c.tagName == 'body'){
                // figure out final width
                if(c.w <= cProp.maxW) // if cProp.target width is less than max
                    cProp.finalW = c.w;
                else if(cProp.firstW != null && cProp.firstW <= cProp.maxW && cProp.firstW >= cProp.minW){ // if the first found width is set and less than the max
                    cProp.finalW = cProp.firstW;
                    cProp.exactFit = false;
                }
                else {
                    cProp.finalW = cProp.defaultW
                    cProp.exactFit = false;
                }

                // figure out final Height
                if(c.h <= cProp.maxH && c.h >= cProp.minH)
                    cProp.finalH = c.h;
                else if(cProp.firstH != null && cProp.firstH <= cProp.maxH && cProp.firstH >= cProp.minH){
                    cProp.finalH = cProp.firstH;
                    cProp.exactFit = false;
                }
                else {
                    cProp.finalH = cProp.defaultH
                    cProp.exactFit = false;
                }

                // get targets position relative to window
                cProp.targetDim = {
                    top: cProp.target[0].getBoundingClientRect().top,
                    bottom: cProp.target[0].getBoundingClientRect().bottom,
                    left: cProp.target[0].getBoundingClientRect().left,
                    right: cProp.target[0].getBoundingClientRect().right,
                    tag: cProp.target.prop('tagName'),
                    offset: cProp.target.offset()
                }

                break;
            }

            cProp.target = cProp.target.parent();
        }

        //console.log('determineCaptureDimensions:', cProp);
    }

    function handleCaptureCrop(){

        var cProp = pulse.cProp;

        // visible limits of target div
        var tLeft = (cProp.targetDim.left < 0)?0:cProp.targetDim.left;
        var tTop = (cProp.targetDim.top < 0)?0:cProp.targetDim.top;
        var tRight = (cProp.targetDim.right > pulse.pos.window.w)?pulse.pos.window.w:cProp.targetDim.right;
        var tBottom = (cProp.targetDim.bottom > pulse.pos.window.h)?pulse.pos.window.h:cProp.targetDim.bottom;


        // include body offset, for now
        cProp.start.top = tTop + pulse.pos.body.top;
        cProp.start.left = tLeft;

        if(!cProp.exactFit){
            // coordinates if it were prefectly centered
            var calcedTop = pulse.pos.view.y - cProp.finalH/2;
            var calcedLeft = pulse.pos.view.x - cProp.finalW/2;

            // if it pushes against bottom
            if(calcedTop >= 0 && (calcedTop + cProp.finalH) > tBottom)
                cProp.start.top = tBottom - cProp.finalH;
            else if(calcedTop > tTop) // if it doesnt push against top
                cProp.start.top = calcedTop;

            // if it extends beyond right side of target
            if((calcedLeft + cProp.finalW) > tRight)
                cProp.start.left = tRight - cProp.finalW;
            else if(calcedLeft > tLeft) // if it *doesnt* push against left
                cProp.start.left = calcedLeft;

        }

        console.log('handleCaptureCrop', cProp);
        console.log('position', pulse.pos);
    }

    function returnExtension(filename){
        return filename.split('.').pop();
    }

    function startCtrlTimer(){
        ctrlKey.isPressed = true;
        var currentID = cp.genRandomStr(3);
        ctrlKey.pressID = currentID;
        setTimeout(function(){
            if(currentID == ctrlKey.pressID){
                resetCtrlKey();
                console.log('times up on that key, bro');
            }
        }, 5000)
    }

    function resetCtrlKey(){
        ctrlKey.isPressed = false;
        ctrlKey.pressID = null;
        $('a.pox--disabled').removeClass('pox--disabled');
    }

    // used to be in discussion.js

    //setInterval(cp.updateTimeSince, 10 * 1000); // every 10 seconds

    cp.spots = {
        existing: {},
        active: null,
        div: null
    };

    cp.setExistingTag = function(rows){
        rows.forEach(function(row, i){
            var tag = row.spot_json;
            if(typeof tag == 'string')
                tag = JSON.parse(tag);

            //console.log('existing tag:', tag);
            cp.spots.existing[tag.id] = tag;
            var famSelector = cp.getFamilySelector(tag.family);
            var classTarget = $($.trim(famSelector.byClass));
            var indexTarget = $($.trim(famSelector.byIndex));
            var tagTarget = $($.trim(famSelector.byTagName));

            //console.log('targets found', tag.id, famSelector, 'index', indexTarget.length, 'class', classTarget.length, 'tag', tagTarget.length);

            // which one are you going with??
            var target = null;
            if(indexTarget.length)
                target = indexTarget;
            else if(classTarget.length)
                target = classTarget;
            else if(tagTarget.length)
                target = tagTarget;

            if(target == null)
                return console.log('tag placement error:', tag.id);

            //var pos = returnDimensions(target, tag.placement.abs.x, tag.placement.abs.y);

            var psc = $('#pox--spot_template .pox--pulse_set_circle');
            psc.attr({id: 'pox--psc_' + tag.id, "data-pulse-circle": tag.id}).addClass('pox--content');

            var psb = $('#pox--spot_template .pox--pulse_set_bar');
            psb.attr({id: 'pox--psc_' + tag.id}).addClass('pox--content');

            var par = target.parent();
            if(par.css('position') != 'absolute')
                par.css('position', 'relative');

            par.append(psc);
            par.append(psb);

            //classTarget.parent().css('backgroundColor', '#000000');

            // circle
            psc.css('top', tag.placement.opt.top - .5 * psc.height());
            psc.css('left', tag.placement.opt.left - .5 * psc.width());

            // bar
            psb.css('top', tag.placement.opt.top - .5 * psb.height());
            psb.css('left', tag.placement.dims.opl * -1);
            psb.width($(window).width());

            // on click
            psc.on('click', displayMiniDiscussion.bind(null, tag.id));
            psc.attr('href', cp.page.domain.share + '/' + tag.id);
        });
        //cp.doCSSTricks($('.pulse_set_circle'), 'circle');
    }

    function showPageTags(){
        var pc = $('.pox--content');
        pc.show().css('display', 'block');
        $('html, body').animate({
            scrollTop: pc.offset().top
        }, 500);
    }

    function displayMiniDiscussion(id){
        console.log('display discussion');
    }

    // display discussion container; container to discuss a particular tag
    cp.displayDiscussion = function(id){
        console.log('display discussion');
        var tag = cp.spots.existing[id];
        cp.spots.active = tag;

        cp.spots.div = $('#pox--active_discussion_container');

        cp.doCSSTricks(cp.spots.div, 'menu');

        cp.spots.div.css('zIndex', cp.z.menu).show();

        $('#pox--active_discussion_name').html(tag.name);

        // no discussion, until otherwise...
        $('#pox--active_discussion_comment_outer').html('<div id="pox--active_discussion_no_comments"></div>');

        // set current user images
        $('#pox--active_discussion_tagger img').attr('src', cp.user.images.large);
        $('#pox--active_discussion_response_img').attr('src', cp.user.images.small);

        $('#pox--active_discussion_x').unbind().on('click',function(){
            cp.spots.div.fadeOut(300);
        });

        $('#pox--active_discussion_arrow').unbind().on('click',function(){
            $('#pox--active_discussion_menu').show();
        });

        $('#pox--active_discussion_delete').unbind().on('click',function(){
            if(confirm('Are you sure you want to delete this tag?')){
                cp.page.chromePort.postMessage({action: "socket", which: 'delete_discussion_tag', id: cp.spots.active.tag_id});
            }
        });

        $('#pox--active_discussion_menu_hide').unbind().on('click', function(){
            $('#pox--active_discussion_menu').hide();
        });

        if($.trim(tag.thoughts) == '') tag.thoughts = '[No Text]';
        $('#pox--active_discussion_op_span').html(tag.thoughts);
        $('#pox--active_discussion_url').html(tag.url);

        var d = new Date(tag.timestamp);
        $('#pox--active_discussion_time').attr('data-pulse-ts', tag.timestamp);
        cp.updateTimeSince();

        $('#pox--active_discussion_chain').html(tag.chain_name);

        $('#pox--active_discussion_menu').hide();

        var adInput = $('#pox--active_discussion_response_input');
        adInput.on('keyup', function(e){
            if(e.keyCode == cp.keys.enter)
                saveDiscComment.call(this);
        }).focus();

        cp.page.chromePort.postMessage({action: "socket", which: 'get_tag_content', tagID: id});
    }

    function displayDisussionComments(cArray){
        var cOuter = $('#pox--active_discussion_comment_outer');
        var rowTemplateHTML = $('#pox--active_discussion_comment_template').html();
        if(cArray.length > 0) $('#pox--active_discussion_no_comments').hide();

        cArray.forEach(function(c){
            var row = $(rowTemplateHTML);

            c.date = new Date(c.timestamp);

            row.find('.active_discussion_comment_image').attr('src', cp.userImages[c.user_id].small);
            row.find('.active_discussion_commentor').html(c.name + ': ');
            row.find('.active_discussion_comment_body').html(c.body);
            row.find('.active_discussion_comment_ts').attr('data-pulse-ts', c.timestamp);

            cOuter.append(row)
        });


        // determine the correct height for the comment container
        cOuter.height(0);
        var par = cOuter.parent();
        var totalHeight = 0;
        par.children().each(function(){
            var child = $(this);
            if(child.css('position') != 'absolute')
                totalHeight += child.outerHeight(true);
        });
        cOuter.height(par.height() - totalHeight - 5); // not sure why the minus 5 is needed yet

        cp.updateTimeSince();

        // auto scroll
        cOuter.animate({ scrollTop: cOuter[0].scrollHeight}, 500);
    }

    // save discussion comment.  this will be the current user
    function saveDiscComment(){
        var c = {
            date: new Date(),
            body: $.trim($(this).val()),
            timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
            name: cp.user.name,
            user_id: cp.user.user_id,
            tag_id: cp.spots.active.tag_id,
            action: "socket",
            which: "save_tag_comment"
        };

        if(c.body == '') return console.log('Empty input');
        $(this).val('');
        // send save object
        cp.page.chromePort.postMessage(c);

        displayDisussionComments([c]);
    }

    // discussion content
    cp.handleTagContent = function(r){
        console.log('Discussion content', r);
        displayDisussionComments(r.comments);
    }

    cp.handleDiscussionDelete = function(r){
        console.log('handleDiscussionDelete', r);
        $('[data-pulse-circle="'+r.id+'"]').fadeOut(300);
        cp.spots.div.fadeOut(300);
    }

    cp.getFamilySelector = function(fArray){
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

})();
