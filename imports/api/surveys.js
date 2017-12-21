export const Surveys = new Mongo.Collection('surveys', {idGeneration: 'MONGO'});
if (Meteor.isServer) {
  Meteor.publish('surveys', function() {
  	return Surveys.find();
  });
}
