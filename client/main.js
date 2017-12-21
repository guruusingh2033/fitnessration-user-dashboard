import angular from 'angular';
import angularMeteor from 'angular-meteor';
import userDashboard from '../imports/components/userDashboard/userDashboard';
import { Meteor } from 'meteor/meteor';
import './lib/angular-css.min';
import '../imports/startup/accounts-config';
import './app/common/scripts/background-image';

window.g_Cookie = Cookie;
window.g_Meteor = Meteor;
window.g_Accounts = Accounts;

// var url = document.location.href;

Accounts.config({
    loginExpirationInDays: 1000
});

Meteor.startup(() => {
  angular.module('user-dashboard', [
    angularMeteor,
    userDashboard.name,
    'accounts.ui'
  ]);

  if (!Meteor.loggingIn() && g_originalUrl.indexOf('reset-password') == -1) {
    document.location = Meteor.settings.public.websiteUrl;
  }
});

Tracker.autorun(function(){
  if (Meteor.userId()) {
    // console.log(localStorage.getItem('Meteor.loginToken'));
    Cookie.set('auth', JSON.stringify({
    	authToken: localStorage.getItem('Meteor.loginToken'),
    	userId: Meteor.userId(),
    }), {expires:new Date(Date.parse(localStorage.getItem('Meteor.loginTokenExpires'))), domain: COOKIE_DOMAIN});
  }
  else if (Cookie.get('auth')) {
    var auth = JSON.parse(Cookie.get('auth'));
    // ugly hack
    Meteor.loginWithToken(auth.authToken, function() {
      Accounts.makeClientLoggedIn(auth.userId, auth.authToken, new Date(new Date().getTime() + 60*60*24*30*2 * 1000));
    });
  }
});

FlowRouter.route('/', {
  name: 'root',
  action() {
    FlowRouter.go('/profile');
  }
});

FlowRouter.route('/profile', {
  name: 'profile'
});

FlowRouter.route('/preferences', {
  name: 'preferences'
});

FlowRouter.route('/orders', {
  name: 'orders'
});

function initWebsiteHeader() {
  var selector = '#togglembnav, header nav > ul > li'
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    $(selector).find('*').click(function(e) {
      e.stopPropagation();
    });
    $(selector).click(function(e) {
      $(this).toggleClass('show');
      // $(e).stop();
      return false;
    });       
  }
  else {
    $(selector).hover(function() {
      $(this).toggleClass('show');
      console.log('ads');
    });
  }
}

$(function() {
  initWebsiteHeader();
})