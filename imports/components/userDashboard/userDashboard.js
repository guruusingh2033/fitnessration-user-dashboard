import angular from 'angular';
import angularMeteor from 'angular-meteor';
import template from './userDashboard.html';
import headerTemplate from '../../../client/app/common/templates/header.html';
import orders from '../orders/orders';
import preferences from '../preferences/preferences';
import profile from '../profile/profile';
import welcomeBack from '../welcomeBack/welcomeBack';
// import { MealPlans } from '../../api/mealPlans';
// import { Portions } from '../../api/portions';
import collectionQueries from '../../collectionQueries';

class UserDashboardCtrl {
  constructor($scope, $meteor, $element) {
    "ngInject";
    $scope.viewModel(this);
    $meteor.autorun($scope, () => {
    	this.user = Meteor.user();
    });
    this.subscribe('mealPlans');
    this.subscribe('portions');
    this.tab = 'profile';
    collectionQueries($scope);
    this.$element = $element;
    // console.log($element.find('.head .picture'));
    // $element.find('.head .picture').fileupload({
    //   url: '/profile-picture',
    //   // dataType: 'json'
    // });

    $meteor.autorun($scope, () => {
      this.tab = FlowRouter.getRouteName();
    });
  }
  setTab(tab) {
    FlowRouter.go(`/${tab}`);
  }

  uploadProfilePicture() {
  }
}

export default angular.module('userdashboard', [
  angularMeteor,
  orders.name,
  preferences.name,
  profile.name,
  welcomeBack.name,
  'accounts.ui',
])
  .directive('upload', function() {
    return {
      link(scope, element) {
        element.change(function() {
          var fileReader = new FileReader;
          fileReader.onloadend = (evt) => {
            var data = (fileReader.result || evt.srcElement.result || evt.target.result).split(',')[1];
            Meteor.call('uploadProfilePicture', {
              data:data
            }, (err, res) => {
              this.value = '';
            });
          };
          fileReader.readAsDataURL(this.files[0]);
        });
      }
    };
  })
  .component('websiteheader', {
    templateUrl: headerTemplate,
    controller($meteor, $element, $compile, $scope) {
      "ngInject";
      $scope.websiteUrl = Meteor.settings.public.websiteUrl;
      $scope.userDashboardUrl = '/';
      $meteor.autorun($scope, () => {
        $scope.user = Meteor.user();
        if ($scope.user) {
          $scope.username = $scope.user.profile.firstName || $scope.user.username;          
        }
      });
      $element.find('.order').click(() => {
        var el = $compile('<welcomeback user="user"></welcomeback>')($scope);
        var wrapperEl = $('<div id="welcome-back-wrapper" />').append(el).appendTo(document.body);
        setTimeout(function() {
          wrapperEl.find('.close').click(function() {
            wrapperEl.remove();
          });
          wrapperEl.find('.edit-preferences').click(function() {
            wrapperEl.remove();
          });
        }, 0);
        return false;
      });
    }
  })
  .component('userdashboard', {
    templateUrl: template,
    controller: UserDashboardCtrl
  })
  .filter('display', function() {
    return function(input) {
      if (_.isString(input)) {
        return input.toLowerCase().replace(/-/g, ' ').replace(/\b[a-z]/g, function(letter) {
          return letter.toUpperCase();
        });
      }
    }
  });
