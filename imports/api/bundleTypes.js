export const BundleTypes = new Mongo.Collection('bundleTypes', {idGeneration: 'MONGO'});
if (Meteor.isServer) {
  Meteor.publish('bundleTypes', function() {
  	return BundleTypes.find();
  });
}