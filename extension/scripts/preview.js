var bg = chrome.extension.getBackgroundPage();

$(start);

function start(){
    chrome.tabs.query({currentWindow: true, active : true},function(tabArray){
        if(!bg.pendingPreview[tabArray[0].id])
            return;

        handlePreview(bg.pendingPreview[tabArray[0].id]);
    })
}

var spot;

function handlePreview(m){
    console.log('handle preview', m);
    spot = m.spot;
    spot.pulseOptions = {
        interval: 300,
        size:70,
        zIndex: 1000,
        left: spot.placement.view.x,
        top: spot.placement.view.y,
        color: '#780808'
    };

    var img = new Image();
    img.onload = handleImageCrop;
    img.src = spot.img;
}

function handleImageCrop(){
    var w = this.width;
    var h = this.height;

    var newWidth = w;
    var newHeight = h;



    var startY = 0;
    var startX = 0;

    var targetHeight = spot.cProp.finalH;
    var targetWidth = spot.cProp.finalW;

    var spotY = spot.placement.view.y;
    var spotX = spot.placement.view.x;

    var windowHeight = spot.placement.window.h;
    var windowWidth = spot.placement.window.w;

    // if(spot.placement.window.vScroll)
    //     windowWidth = windowWidth - 17;
    //
    // if(spot.placement.window.hScroll)
    //     windowHeight = windowHeight - 17;

    console.log(spotX, spotY, targetWidth, targetHeight);

    // var halfHeight = .5*targetHeight;
    // if(spotY >= halfHeight && (windowHeight - spotY) >= halfHeight)
    //     startY = spotY - halfHeight;
    // else if(spotY >= halfHeight) // not enough space underneath
    //     startY = windowHeight - targetHeight;
    //
    // var halfWidth = .5*targetWidth;
    // if(spotX >= halfWidth && (windowWidth - spotX) >= halfWidth)
    //     startX = spotX - halfWidth;
    // else if(spotX >= halfWidth) // not enough space to right
    //     startX = windowWidth - targetWidth;

    // 10 pixel padding
    startY = spot.cProp.targetDim.top + spot.cProp.start.top - 10;
    if(startY < 0) startY = 0;

    startX = spot.cProp.targetDim.left + spot.cProp.start.left - 10;
    if(startX < 0) startX = 0;

    console.log(spot.cProp.targetDim, spot.cProp.start);
    console.log('start',startX, startY);

    var canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    var context = canvas.getContext('2d');

    context.drawImage(this, startX, startY, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);

    var finalImg = $('<img id="' + spot.id + '" />');
    finalImg.attr('src', canvas.toDataURL());

    var pv = $('#preview_container');
    pv.append(finalImg);
    pv.css('width', targetWidth);

    spot.pulseOptions.left -= startX;
    spot.pulseOptions.top -= startY;

    var written = $('<div class="written">' + spot.thoughts + '</div>');
    pv.append(written);
    written.css('top', spot.pulseOptions.top - written.height()*.5)

    pv.jPulse(spot.pulseOptions);
}
