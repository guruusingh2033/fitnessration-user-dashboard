export const Promotions = new Mongo.Collection('promotions', {idGeneration: 'MONGO'});
if (Meteor.isServer) {
  Meteor.publish('promotions', function() {
  	return Pormotions.find();
  });
}