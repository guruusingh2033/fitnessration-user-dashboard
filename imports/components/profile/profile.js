import angular from 'angular';
import angularMeteor from 'angular-meteor';
import template from './profile.html';
// import { Allergies } from '../../api/allergies';
import mongoProperty from '../../client/mongoProperty';
import showPopup from '../../../client/showPopup';
function newScope(parentScope, obj) {
	var scope = parentScope.$new();
	for (var name in obj) {
		scope[name] = obj[name];
	}
	return scope;
}
function compile(parentScope, _compile, template, obj) {
	return _compile(template)(newScope(parentScope, obj));
}
var compareTo = function() {
	return {
		require: "ngModel",
		scope: {
			otherModelValue: "=compareTo"
		},
		link: function(scope, element, attributes, ngModel) {
			ngModel.$validators.compareTo = function(modelValue) {
				return modelValue == scope.otherModelValue;
			};
			scope.$watch("otherModelValue", function() {
				ngModel.$validate();
			});
		}
	};
};
class Ctrl {
	constructor($scope, $meteor, $compile) {
		"ngInject";
		document.title = 'Profile';
		$scope.viewModel(this);
		this.scope = $scope;
		$meteor.autorun($scope, () => {
			this.user = Meteor.user();
		});
		this.compile = $compile;
		mongoProperty(this, 'selectedDeliveryAddress', Meteor.userId(), ()=>{return this.user}, 'profile.selectedDeliveryAddress');
	}
	changePassword() {
		var popup = showPopup({
			title: 'Change Password',
			type: 'basic-popup-with-title',
			id: 'change-password',
			content: compile(this.scope, this.compile, `
				<form name="form">
					<div class="field old-password">
						<label>Old Password</label>
						<input ng-model="password" type="password" required>
					</div>
					<div class="field new-password">
						<label>New Password</label>
						<input ng-model="newPassword" type="password" required>
					</div>
					<div class="field confirm-password">
						<label>Confirm Password</label>
						<input ng-model="confirmPassword" type="password" compare-to="newPassword" required>
					</div>
					<button class="confirm" ng-click="confirm()">Confirm Password</button>
					<a href="#" class="forgot-password">Forgot your password?</a>
				</form>
			`, {
				confirm() {
					if (this.form.$valid) {
						Accounts.changePassword(this.password, this.newPassword, function(err) {
							if (!err) {
								popup.close();								
							}
							else {
								console.log(err);
							}
						});
					}
				}
			})
		});
	}
	edit() {
		this.editing = true;
		this.fields = {
			phoneNumber: this.user.profile.phoneNumber,
			firstName: this.user.profile.firstName,
			surname: this.user.profile.surname,
			email: this.user.username,
		};
	}
	save() {
		this.editing = false;
		Meteor.users.update({_id:Meteor.userId()}, {$set:{
			'profile.phoneNumber': this.fields.phoneNumber,
			'profile.firstName': this.fields.firstName,
			'profile.surname': this.fields.surname,
		}});
		if (this.fields.email != this.user.username) {
			Meteor.call('updateUsername', this.fields.email);
		}
	}
	addPartnerCode() {
		showPopup({
			title: 'Add Partner Code',
			type: 'basic-popup-with-title',
			id: 'add-partner-code',
			content: compile(this.scope, this.compile, `
				<div class="field">
					<input type="text" placeholder="8123456789765432">
				</div>
				<button>Save</button>
			`, {
				save() {

				}
			})
		});
	}
	addDeliveryAddress() {
		var popup = showPopup({
			type: 'basic-popup-with-title',
			title: 'Add delivery address',
			id: 'add-delivery-address',
			content: compile(this.scope, this.compile, `
				<form name="form">
					<div class="field">
						<textarea ng-model="address" placeholder="Please specify building/condo/estate name if applicable." required></textarea>
					</div>
					<div class="field postal-code">
						<label>Postal Code</label>
						<input type="text" ng-model="postalCode" required>
					</div>
					<button ng-click="save()">Save</button>
				</form>
			`, {
				save() {
					if (this.form.$valid) {
						Meteor.users.update({_id:Meteor.userId()}, {'$push':{'profile.deliveryAddresses':{address:this.address, postalCode:this.postalCode}}});
						popup.close();						
					}
				}
			})
		});
	}
	delete(deliveryAddress) {
		Meteor.users.update({_id:Meteor.userId()}, {
			'$pull':{'profile.deliveryAddresses':{address:deliveryAddress.address, postalCode:deliveryAddress.postalCode}},
			'$set':{'profile.selectedDeliveryAddress':Math.min(this.user.profile.selectedDeliveryAddress, this.user.profile.deliveryAddresses.length - 2)}
		});
	}
}
export default angular.module('profile', [
	angularMeteor
])
	.directive("compareTo", compareTo)
	.component('change-password', {
		template: 'Hello',
	})
	.component('profile', {
		templateUrl: template,
		controller: Ctrl
	});
