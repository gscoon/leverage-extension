(function(cp){

    setInterval(updateTimeSince, 10 * 1000); // every 10 seconds

    cp.pox = {
        existing: {},
        active: null,
        div: null
    };

    cp.setExistingTag = function(tArray){
        tArray.forEach(function(tag, i){
            cp.pox.existing[tag.tag_id] = tag;
            var famSelector = cp.getFamilySelector(tag.family);
            var classTarget = $($.trim(famSelector.byClass));
            var indexTarget = $($.trim(famSelector.byIndex));
            var tagTarget = $($.trim(famSelector.byTagName));
            console.log('targets found', tag, famSelector, 'index', indexTarget.length, 'class', classTarget.length, 'tag', tagTarget.length);

            // which one are you going with??
            var target = indexTarget;

            //var pos = returnDimensions(target, tag.placement.abs.x, tag.placement.abs.y);

            var psc = $('<div class="pulse_set_circle" data-pulse-circle="' + tag.tag_id + '" id="psc_' + tag.tag_id + '"></div>');
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

            // on click
            psc.on('click', cp.displayDiscussion.bind(null, tag.tag_id));
        });

        cp.doCSSTricks($('.pulse_set_circle'), 'circle');
    }

    // display discussion container; container to discuss a particular tag
    cp.displayDiscussion = function(id){
        var tag = cp.pox.existing[id];
        cp.pox.active = tag;

        cp.pox.div = $('#active_discussion_container');

        cp.doCSSTricks(cp.pox.div, 'menu');

        cp.pox.div.css('zIndex', cp.z.menu).show();

        $('#active_discussion_name').html(tag.name);

        // no discussion, until otherwise...
        $('#active_discussion_comment_outer').html('<div id="active_discussion_no_comments"></div>');

        // set current user images
        $('#active_discussion_tagger img').attr('src', cp.user.images.large);
        $('#active_discussion_response_img').attr('src', cp.user.images.small);

        $('#active_discussion_x').unbind().on('click',function(){
            cp.pox.div.fadeOut(300);
        });

        $('#active_discussion_arrow').unbind().on('click',function(){
            $('#active_discussion_menu').show();
        });

        $('#active_discussion_delete').unbind().on('click',function(){
            if(confirm('Are you sure you want to delete this tag?')){
                cp.main.chromePort.postMessage({action: "socket", which: 'delete_discussion_tag', id: cp.pox.active.tag_id});
            }
        });

        $('#active_discussion_menu_hide').unbind().on('click', function(){
            $('#active_discussion_menu').hide();
        });

        if($.trim(tag.thoughts) == '') tag.thoughts = '[No Text]';
        $('#active_discussion_op_span').html(tag.thoughts);
        $('#active_discussion_url').html(tag.url);

        var d = new Date(tag.timestamp);
        $('#active_discussion_time').attr('data-pulse-ts', tag.timestamp);
        updateTimeSince();

        $('#active_discussion_chain').html(tag.chain_name);

        $('#active_discussion_menu').hide();

        var adInput = $('#active_discussion_response_input');
        adInput.on('keyup', function(e){
            if(e.keyCode == cp.keys.enter)
                saveDiscComment.call(this);
        }).focus();

        cp.main.chromePort.postMessage({action: "socket", which: 'get_tag_content', tagID: id});
    }

    function displayDisussionComments(cArray){
        var cOuter = $('#active_discussion_comment_outer');
        var rowTemplateHTML = $('#active_discussion_comment_template').html();
        if(cArray.length > 0) $('#active_discussion_no_comments').hide();

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

        updateTimeSince();

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
            tag_id: cp.pox.active.tag_id,
            action: "socket",
            which: "save_tag_comment"
        };

        if(c.body == '') return console.log('Empty input');
        $(this).val('');
        // send save object
        cp.main.chromePort.postMessage(c);

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
        cp.pox.div.fadeOut(300);
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

    function updateTimeSince() {
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

})(chickenPox);
