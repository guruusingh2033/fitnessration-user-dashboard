import { Mongo } from 'meteor/mongo';
 
export const Orders = new Mongo.Collection('orders', {idGeneration: 'MONGO'});

if (Meteor.isServer) {
  Meteor.publish('orders', function() {
  	return Orders.find({userId:this.userId});
  });
}

// Tasks.allow({
// 	remove(userId, doc) {
// 		if (doc.private && doc.owner != userId) return false;
// 		return true;
// 	},
// 	insert(userId) {
// 		return userId;
// 	},
// 	update(userId, doc) {
// 		return true;
// 	},
// 	fetch: ['owner', 'private']
// });