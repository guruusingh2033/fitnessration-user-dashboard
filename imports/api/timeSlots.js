export const TimeSlots = new Mongo.Collection('timeSlots', {idGeneration: 'MONGO'});
if (Meteor.isServer) {
  Meteor.publish('timeSlots', function() {
  	return TimeSlots.find();
  });
}