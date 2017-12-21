import { Mongo } from 'meteor/mongo';
export const MealStock = new Mongo.Collection('mealStock', {idGeneration: 'MONGO'});
