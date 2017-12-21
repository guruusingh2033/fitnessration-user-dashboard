export const MealPlans = new Mongo.Collection('mealPlans', {idGeneration: 'MONGO'});
if (Meteor.isServer) {
  Meteor.publish('mealPlans', function() {
  	return MealPlans.find();
  });
}