export const Blocks = new Mongo.Collection('blocks', {idGeneration: 'MONGO'});
if (Meteor.isServer) {
  Meteor.publish('blocks', function() {
  	return Blocks.find();
  });
}