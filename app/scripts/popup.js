'use strict';

var bg = chrome.extension.getBackgroundPage().bg;

window.onload = function(){
    $('#login').on('click', function(){
        bg.showFacebookAuth();
    });
};
