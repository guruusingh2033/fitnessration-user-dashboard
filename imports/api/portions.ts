import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
export const Portions = new Mongo.Collection('portions', {idGeneration: 'MONGO'});
if (Meteor.isServer) {
  Meteor.publish('portions', function() {
  	return Portions.find();
  });
}