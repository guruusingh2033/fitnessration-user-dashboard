export const Meals = new Mongo.Collection('meals', {idGeneration: 'MONGO'});
if (Meteor.isServer) {
  Meteor.publish('meals', function() {
  	return Meals.find();
  });
}