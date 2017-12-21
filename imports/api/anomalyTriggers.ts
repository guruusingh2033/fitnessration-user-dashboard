import { Mongo } from 'meteor/mongo';
export const AnomalyTriggers = new Mongo.Collection('anomalyTriggers', {idGeneration: 'MONGO'});
