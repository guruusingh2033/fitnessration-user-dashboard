import { Mongo } from 'meteor/mongo';
export const LocationSurcharges = new Mongo.Collection('locationSurcharges', {idGeneration: 'MONGO'});
