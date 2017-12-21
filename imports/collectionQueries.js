import { MealPlans } from './api/mealPlans';
import { Portions } from './api/portions';
export default function collectionQueries(scope) {
	scope.query = {
		mealPlan(id) {
			return MealPlans.findOne({_id:id});        
		},
		portion(id) {
			return Portions.findOne({_id:id});        
		}
	}
}
