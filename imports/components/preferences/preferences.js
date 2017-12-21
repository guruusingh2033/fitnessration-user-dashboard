import angular from 'angular';
import angularMeteor from 'angular-meteor';
import template from './preferences.html';
import mongoProperty from '../../client/mongoProperty';
import collectionQueries from '../../collectionQueries';
import { Ingredients } from '../../api/ingredients';
import { MealPlans } from '../../api/mealPlans';
import { Portions } from '../../api/portions';
class PreferencesCtrl {
	constructor($scope, $meteor, $reactive) {
		"ngInject";
		document.title = 'Preferences';
		$scope.viewModel(this);
	  $reactive(this).attach($scope);
		this.selectedAllergies = {};
		this.editing = false;
		this.subscribe('mealPlans');
		this.subscribe('portions');
		this.ingredientsSubscription = this.subscribe('ingredients');
		collectionQueries($scope);
		$meteor.autorun($scope, () => {
			this.user = Meteor.user();
			if (this.user) {
				if (this.user.profile.preferences.allergies) {
					for (var allergy of this.user.profile.preferences.allergies) {
						this.selectedAllergies[allergy._str] = true;
					}
				}
			}
		});
		this.helpers({
			mealPlans() {
				return MealPlans.find();
			},
			portions() {
				return Portions.find();
			},
			allergies() {
				return Ingredients.find({type:'allergen'});
			}
		});
		// var createAllergyProp = (allergy) => {
		 //  Object.defineProperty(this.allergies, allergy, {
		 //  	get: () => {
		 //  		if (this.user && this.user.profile.preferences.allergies) {
			//   		return this.user.profile.preferences.allergies.indexOf(allergy) != -1;
		 //  		}
		 //  		else {
		 //  			return false;
		 //  		}
		 //  	},
		 //  	set: (value) => {
			// 		if (!this.user.profile.preferences.allergies) this.user.profile.preferences.allergies = [];
		 //  		if (!value) {
		 //  			var index;
		 //  			if ((index = this.user.profile.preferences.allergies.indexOf(allergy)) != -1) {
			//   			this.user.profile.preferences.allergies.splice(index, 1);
		 //  			}
		 //  		}
		 //  		else {
		 //  			if (this.user.profile.preferences.allergies.indexOf(allergy) == -1) {
		 //  				this.user.profile.preferences.allergies.push(allergy);
		 //  			}
		 //  		}

			 //  	Meteor.users.update({_id:Meteor.userId()}, {'$set':{'profile.preferences.allergies':this.user.profile.preferences.allergies}});
		 //  	}
		 //  });
		// };
		mongoProperty(this, 'mealPlan', Meteor.userId(), () => {return this.user}, 'profile.preferences.mealPlan');
		mongoProperty(this, 'portion', Meteor.userId(), () => {return this.user}, 'profile.preferences.portion');
	}
	edit() {
		this.editing = true;
	}
	save() {
		this.editing = false;
	}
	allergiesList() {
		if (this.ingredientsSubscription.ready()) {
			var allergies = [];
			for (let allergyId of this.user.profile.preferences.allergies) {
				allergies.push(Ingredients.findOne({_id:allergyId}).name);
			}
			return allergies.join(', ');
		}
	}
	allergyChanged() {
		var allergies = [];
		for (var allergyId in this.selectedAllergies) {
			if (this.selectedAllergies[allergyId]) {
				allergies.push(new Mongo.ObjectID(allergyId));
			} 
		}
		Meteor.users.update({_id:Meteor.userId()}, {'$set':{'profile.preferences.allergies': allergies}});
	}
}
export default angular.module('preferences', [
	angularMeteor
])
	.component('preferences', {
		templateUrl: template,
		controller: PreferencesCtrl
	});
