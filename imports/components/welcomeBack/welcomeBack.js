import angular from 'angular';
import angularMeteor from 'angular-meteor';
import template from '../../../client/app/common/templates/welcome-back.html';
import { MealPlans } from '../../api/mealPlans';
import { Portions } from '../../api/portions';

export default angular.module('welcomeback', [
  angularMeteor,
])
  .component('welcomeback', {
    templateUrl: template,
    controller($scope, $meteor) {
      "ngInject";
    	$scope.firstName = this.user.profile.firstName || this.user.username;
      var mealPlan = MealPlans.findOne({_id:this.user.profile.preferences.mealPlan});
      var portion = Portions.findOne({_id:this.user.profile.preferences.portion});
      if (this.user.profile.picture) {
        $scope.profilePicture = this.user.profile.picture;     
      }
      else {
        $scope.profilePicture = 'app/common/images/profile-picture-placeholder.149.png';
      }
    	$scope.preferences = {
        mealPlan: {
          icon:mealPlan ? mealPlan.icon : null,
          name:mealPlan ? mealPlan.name : null
        },
        portion: {
          icon:portion ? portion.icon : null,
          name:portion ? portion.name : null
        }
      };
    	$scope.orderWizardUrl = Meteor.settings.public.orderWizardUrl;
	  },
		bindings: {
			user: '<',
		}
  });