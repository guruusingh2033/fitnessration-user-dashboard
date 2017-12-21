import { Mongo } from 'meteor/mongo';
export const AddOns = new Mongo.Collection('addOns', {idGeneration: 'MONGO'});
