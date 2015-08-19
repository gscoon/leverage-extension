'use strict';

chrome.runtime.onInstalled.addListener(function (details) {
  console.log('previousVersion', details.previousVersion);
});

chrome.browserAction.setBadgeBackgroundColor({color: '#3cb73e'});
chrome.browserAction.setBadgeText({text: 'GS'});

console.log('\'Allo \'Allo! Event Page for Browser Action');
