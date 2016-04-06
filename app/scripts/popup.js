'use strict';

var bg = chrome.extension.getBackgroundPage();

window.onload = function(){
	if(!bg.config.user.isLoggedIn){
		bg.checkUserStatus(true); // force login menu
		window.close();
		return;
	}

    // set active tab
    chrome.tabs.query({active:true,currentWindow:true},function(tabs){
    	var tab = tabs[0];
    	setPopupMenu(tab);
    });
};

function setPopupMenu(tab){
	// set user name
	$('#popup_user_name').html(bg.config.user.name);
	
	// set user image
	$('#popup_user_image').css('backgroundImage', 'url('+bg.config.user.smallImage+')')

	$('#feed_button').on('click', function(){
		var feedURL = bg.config.domain.feed;
		chrome.tabs.create({ url: feedURL });
    });

	// tag button
	$('#tag_button').on('click', function(){
		chrome.tabs.sendMessage(tab.id, {action: "shot_overlay"}, closeMenu);
    })

	// logout
    $('#popup_user_logout').on('click', function(){    	
    	bg.logout(function(response){
    		console.log('logout response', response);
    		// reload after
    		bg.config.user = {isLoggedIn:false};
    		//location.reload();
    		window.close();
    	})
    })

    if(!bg.tabStore[tab.id].tags || !bg.tabStore[tab.id].tags.length)
		return $('.show_tag').hide();

	$('#show_tag_button').on('click', function(){
		chrome.tabs.sendMessage(tab.id, {action: "show_page_tags"});
		closeMenu();
	})
	.find('span').html('('+bg.tabStore[tab.id].tags.length +')');

	

}

function closeMenu(){
	window.close();
}