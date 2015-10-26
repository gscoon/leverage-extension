(function(cp){
    cp.pox = {
        existing: {},
        active: null
    };

    cp.setExistingTag = function(tArray){
        tArray.forEach(function(tag, i){
            cp.pox.existing[tag.tag_id] = tag;
            var famSelector = cp.getFamilySelector(tag.family);
            var classTarget = $($.trim(famSelector.byClass));
            var indexTarget = $($.trim(famSelector.byIndex));
            var tagTarget = $($.trim(famSelector.byTagName));
            console.log('targets found', famSelector, 'index', indexTarget.length, 'class', classTarget.length, 'tag', tagTarget.length);

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

            // on click
            psc.on('click', cp.displayDiscussion.bind(null, tag.tag_id));
        });
    }


    cp.displayDiscussion = function(id){
        var tag = cp.pox.existing[id];
        var cp.pox.active = tag;

        $('#active_discussion_container').show();
        if($.trim(c.thoughts) == '') tag.thoughts = '[No Text]';
        $('#active_discussion_body').html(tag.thoughts);
        $('#active_discussion_url').html(tag.url);
        var d = new Date(tag.timestamp);
        $('#active_discussion_time').html(cp.timeSince(d) + ' ago');

        var adInput = $('#active_discussion_response_input');
        adInput.on('keyup', function(e){
            if(e.keyCode == cp.keys.enter)
                saveDiscComment.call(this);
        })

        cp.chromePort.postMessage({action: "socket", which: 'get_tag_content', tagID: id});
    }

    cp.saveDiscComment = function(){
        var txt = $.trim(this.val());
        if(txt != '') return console.log('Empty input');

        cp.chromePort.postMessage({action: "socket", which: 'save_tag_comment', tagID: cp.pox.active.tag_id, text: txt});
    }

    cp.handleTagContent = function(r){
        console.log('handleTagContent', r);
        $('#active_discussion_tagger img').attr('src', r.userImage.imgLarge);
        $('#active_discussion_name').html(r.detail.name);
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

    cp.timeSince = function(date) {
        var seconds = Math.floor((new Date() - date) / 1000);
        var interval = Math.floor(seconds / 31536000);

        if (interval > 1)
            return interval + " years";

        interval = Math.floor(seconds / 2592000);
        if (interval > 1)
            return interval + " months";

        interval = Math.floor(seconds / 86400);
        if (interval > 1)
            return interval + " days";

        interval = Math.floor(seconds / 3600);
        if (interval > 1)
            return interval + " hours";

        interval = Math.floor(seconds / 60);
        if (interval > 1)
            return interval + " minutes";

        return Math.floor(seconds) + " seconds";
    }

})(chickenPox);
