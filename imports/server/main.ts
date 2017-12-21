import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Orders } from '../api/orders';
import { Meals } from '../api/meals';
import { AddOns } from '../api/addOns';
import { BundleTypes } from '../api/bundleTypes';
import { MealPlans } from '../api/mealPlans';
import { AnomalyTriggers } from '../api/anomalyTriggers';
import { TimeSlots } from '../api/timeSlots';
import { Promotions } from '../api/promotions';
import { FulfillmentSettings } from '../api/fulfillmentSettings';
import { LocationSurcharges } from '../api/locationSurcharges';
import { MealStock } from '../api/mealStock';
import { Ingredients } from '../api/ingredients';
import { Portions } from '../api/portions';
import { Blocks } from '../api/blocks';
import { convertToDate, calendarDaysForMonth, formatDate, createDay } from '../common/scripts/date.ts';
import { DateSet } from '../common/scripts/DateSet.ts';
import * as _ from 'lodash';
import { excludeAvailabilityDate, orderFulfillmentDays, bundleTotal, orderSubtotal, orderDeliveryFee, orderTotal, bundlePrice, orderTotalMeals, orderFlagged, orderLocationSurcharge } from '../common/scripts/order.ts';

import { HTTP } from 'meteor/http'

function getToday() {
	var now = new Date();
	return createDay(now.getFullYear(), now.getMonth(), now.getDate());
}


interface ObjectID {
	_str: string;
}

interface FRUser {
	role: string;
	username: string;
	profile: {
		debug: boolean;
		firstName: string;
		surname: string;
		phoneNumber: string;
		deliveryAddresses: any[];
	};
	emails: {address:string; verified: boolean}[];
}

interface Meal {
	_id: ObjectID;
};

interface MealStock {
	stock: number;
};

interface TimeSlot {
	_id: ObjectID;
	start: string;
	end: string;
}

interface Portion {
	_id: ObjectID;
}
interface MealPlan {
	_id: ObjectID;
}
interface BundleType {
	_id: ObjectID;
}

interface Promotion {
	start: string;
	end: string;
	fulfillmentStart: string;
	fulfillmentEnd: string;
	mealPlan: ObjectID;
	portion: ObjectID;
	bundleType: ObjectID;
	deliveryFee: boolean;
	usageLimit: number;
	premiumCap: number;
	premiumAllowance: number;
	_id: ObjectID;
}

export interface Ingredient {

}

namespace Order {
	export interface Bundle {
		portion?: Portion;
		mealPlan?: MealPlan;
		type?: BundleType;
		allergies?: Ingredient[];
		mealSelections?: MealSelection[];
		promotion?: Promotion;
		price?: number;
		total?: number;
		deliveryFee?: boolean;
	}

	export interface MealSelection {

	}

	export interface AddOnSelection {

	}
}

interface Order {
	status?: string;
	flagged?: boolean;
	emailError?: any;
	debug?: boolean;
	transaction?: any;
	state?: string;
	createdAt?: Date;
	userId?: string;
	addOnSelections?: Order.AddOnSelection[];
	bundles?: Order.Bundle[];
	deliveryOptions?: {
		date: string;
		firstName: string;
		time: TimeSlot;
		surname: string;
		selfCollection: boolean;
	};
	subtotal?: number;
	total?: number;
	number?: number;
	locationSurcharge?: number;
	deliveryFee?: number;
}

namespace OrderData {
	export interface MealSelection {
		mealId: string;
		quantity: number;
	}

	export interface AddOnSelection {
		addOnId: string;
		quantity: number;
		variant: string;
	}

	export interface Bundle {
		promotion: string;
		mealPlan: string;
		portion: string;
		type: string;
		allergies: string[];
		mealSelections: MealSelection[];
	}
}

interface OrderData {
	bundles: OrderData.Bundle[];
	addOnSelections: OrderData.AddOnSelection[];
	deliveryOptions: any;
	userId: string;
	paymentNonce: any;
}


export const Errors = new Mongo.Collection('errors', {idGeneration: 'MONGO'});

declare var tx:any;

if (!('toJSON' in Error.prototype))
Object.defineProperty(Error.prototype, 'toJSON', {
    value: function () {
        var alt = {};

        Object.getOwnPropertyNames(this).forEach(function (key) {
            alt[key] = this[key];
        }, this);

        return alt;
    },
    configurable: true,
    writable: true
});

function nextOrderNumber() {
	var order = Orders.findOne({debug:null}, {sort:{number:-1}});
	if (order) {
		return order.number + 1;
	}
	else {
		return 8050;
	}
}

function amPm(time, appendSuffix=true) {
  var date = new Date(Date.parse('Jan 1 ' + time));
  var hours = date.getHours();
  var suffix = hours >= 12 ? "pm":"am";
  hours = ((hours + 11) % 12 + 1); 

  return hours + (appendSuffix ? '' + suffix : '');
}


var _mealStock = null;
var _mealStockDate = null;
function getMealStock() {
	var today = getToday();
	if (_mealStock && _mealStockDate.valueOf() == today.valueOf()) {
		return _mealStock;
	}
	_mealStock = HTTP.get(Meteor.settings.public.adminUrl + 'api/stock').data;
	_mealStockDate = getToday();
	return _mealStock;
}

class OrderApi {
	_mealStock = null;
	fulfillmentSettings: any;
	anomalyTriggers: any;
	findOne(collectionName, query) {
		var collection;
		switch (collectionName) {
			case 'mealPlans': collection = MealPlans; break;
			case 'portions': collection = Portions; break;
		}
		return collection.findOne(query);
	}
	compareObjectId(a: ObjectID, b: ObjectID) {
		return a._str == b._str;
	}
	mealStock(meal: Meal) {
		var getMealStock = () => {
			if (!this._mealStock) {
				this._mealStock = HTTP.get(Meteor.settings.public.adminUrl + 'api/stock').data;
			}
			return this._mealStock;
		}

		return getMealStock()[meal._id._str];
	}
	constructor() {
		this.fulfillmentSettings = FulfillmentSettings.findOne();
		this.anomalyTriggers = AnomalyTriggers.find().fetch();
	}
}

export function timeSlotsForMonth(month) {
	return timeSlotsForDates(calendarDaysForMonth(month));
}

export function timeSlotsForDates(dates) {
	let minDate = formatDate(dates[0]);
	let maxDate = formatDate(dates[dates.length - 1]);
	let orders:Order[] = <Order[]>Orders.find({'deliveryOptions.date':{$gte:minDate, $lte:maxDate}, state: 'completed'}).fetch();
	let ordersByDate = {};
	for (let order of orders) {
		if (!ordersByDate[order.deliveryOptions.date]) {
			ordersByDate[order.deliveryOptions.date] = [];
		}
		ordersByDate[order.deliveryOptions.date].push(order);
	}

	let timeSlotsById = _.reduce(TimeSlots.find().fetch(), (timeSlotsById, timeSlot: TimeSlot) => {
		timeSlotsById[timeSlot._id._str] = timeSlot;
		return timeSlotsById;
	}, {});

	let availableTimeSlotsByDate = {};
	for (let date of dates) {
		let timeSlotsForDate = [];
		for (let timeSlotId in timeSlotsById) {
			if (timeSlotsById[timeSlotId].days[date.getDay()] && timeSlotsById[timeSlotId].capacity) {
				timeSlotsForDate.push(timeSlotId);
			}
		}

		date = formatDate(date);
		let ordersByTimeSlot = {};
		if (ordersByDate[date]) {
			let ordersByTimeSlot = {};
			for (let order of ordersByDate[date]) {
				if (!ordersByTimeSlot[order.deliveryOptions.time._id._str]) {
					ordersByTimeSlot[order.deliveryOptions.time._id._str] = [];
				}
				ordersByTimeSlot[order.deliveryOptions.time._id._str].push(order);
			}
			availableTimeSlotsByDate[date] = [];
			for (let timeSlotId of timeSlotsForDate) {
				let timeSlot = timeSlotsById[timeSlotId];
				if (!ordersByTimeSlot[timeSlotId] || ordersByTimeSlot[timeSlotId].length < timeSlot.capacity) {
					availableTimeSlotsByDate[date].push(timeSlotId);
				}
			}
		}
		else {
			availableTimeSlotsByDate[date] = timeSlotsForDate;
		}
	}
	return availableTimeSlotsByDate;
}

interface CreateOrderOptions {
	charge?: boolean;
	gateway?: any;
	sendEmails?: boolean;
	transactions?: boolean;
}

export function createOrder(orderData: OrderData, userId: string, opts: CreateOrderOptions = {}): boolean|any {
	try {
		let user: FRUser = <FRUser>Meteor.users.findOne({_id:userId});

		if (orderData.userId) {
			if (user.role == 'admin') {
				userId = orderData.userId;
			}
			else {
				return false;
			}
		}

		let index = 0;
		for (let bundle of orderData.bundles) {
			if (bundle.promotion) {
				let result = validatePromotion(userId, orderData, Promotions.findOne({_id:new Mongo.ObjectID(bundle.promotion)}));
				if (_.isArray(result) && result.indexOf(index) == -1 || !_.isArray(result)) {
					return {
						success: false,
						error: 'invalidPromotion',
						promotionStatus: result
					};
				}
			}
			++ index;
		}

		let order = resolveOrder(orderData, userId);

		let availabilityDates = availablilityDatesForOrder(order);
		let timeSlots = timeSlotsForDates([convertToDate(order.deliveryOptions.date)])[order.deliveryOptions.date];

		if (availabilityDates.test(convertToDate(order.deliveryOptions.date)) && timeSlots && timeSlots.indexOf(order.deliveryOptions.time._id._str) != -1) {
			order.state = 'charging';
			order.createdAt = new Date();
			let orderId = Orders.insert(order);

			let response;
			if (order.total > 0 && opts.charge && !user.profile.debug) {
				response = Meteor.wrapAsync(opts.gateway.transaction.sale, opts.gateway.transaction)({
					amount: order.total,
					paymentMethodNonce: orderData.paymentNonce,
					options: {
						submitForSettlement: true
					},
					customer: {
						firstName: order.deliveryOptions.firstName,
						lastName: order.deliveryOptions.surname,
						email: (user.username.match(/@/g) || []).length == 1 ? user.username : null
					}
				});
			}

			if (!opts.charge || order.total === 0 || user.profile.debug || (opts.charge && response.success)) {
				if (response) order.transaction = response.transaction;
				order.state = 'processing';
				Orders.update({_id:orderId}, order);

				let userUpdates = {};
				if (!user.profile.firstName) {
					user.profile.firstName = userUpdates['profile.firstName'] = orderData.deliveryOptions.firstName;
				}
				if (!user.profile.surname) {
					userUpdates['profile.surname'] = orderData.deliveryOptions.surname;
				}
				if (!user.profile.phoneNumber) {
					userUpdates['profile.phoneNumber'] = orderData.deliveryOptions.contactNumber;
				}
				if (!user.profile.deliveryAddresses.length) {
					userUpdates['profile.deliveryAddresses'] = [{address:orderData.deliveryOptions.address, postalCode:orderData.deliveryOptions.postalCode}];
					userUpdates['profile.selectedDeliveryAddress'] = 0;
				}
				if (!_.isEmpty(userUpdates)) {
					Meteor.users.update({_id:userId}, {$set:userUpdates});
				}

				if (user.profile.debug) {
					order.debug = true;
				}

				if (opts.sendEmails) {
					try {
						if (order.deliveryOptions.selfCollection) {
							Email.send({
								to: user.emails[0].address,
								from: Accounts.emailTemplates.from,
								subject: 'Self-Collection of your Fitness Ration meals',
								html: `
									<p>Dear ${user.profile.firstName},</p>
									<p>Your order #${order.number} is confirmed for self-collection on ${order.deliveryOptions.date} at ${amPm(order.deliveryOptions.time.start)}-${amPm(order.deliveryOptions.time.end)}.</p>
									<p>To view your current order summary and e-receipt, <a href="http://www.fitnessration.com.sg/#login">log in to your account here.</a></p>
									<p>Have a question?<br>
									Refer to our <a href="http://www.fitnessration.com.sg/faq.php">FAQ</a> or drop us an email at enquiries@fitnessration.com.sg</p>
									<p>Remember to like us on <a href="http://www.facebook.com/fitnessration">Facebook</a> for the latest menu, promotions and events.</p>
									<p>Enjoy your meals!<br>
									Team Fitness Ration</p>`
							});
						}
						else {
							Email.send({
								to: user.emails[0].address,
								from: Accounts.emailTemplates.from,
								subject: 'Confirmed delivery of your Fitness Ration meals',
								html: `
									<p>Dear ${user.profile.firstName},</p>
									<p>Your order #${order.number} is confirmed for delivery on ${order.deliveryOptions.date} at ${amPm(order.deliveryOptions.time.start)}-${amPm(order.deliveryOptions.time.end)}. Be sure to have someone to receive your bundles on delivery day!</p>
									<p>To view your current order summary and e-receipt, <a href="http://www.fitnessration.com.sg/#login">log in to your account here.</a></p>
									<p>Have a question?<br>
									Refer to our <a href="http://www.fitnessration.com.sg/faq.php">FAQ</a> or drop us an email at enquiries@fitnessration.com.sg</p>
									<p>Remember to like us on <a href="http://www.facebook.com/fitnessration">Facebook</a> for the latest menu, promotions and events.</p>
									<p>Enjoy your meals!<br>
									Team Fitness Ration</p>`
							});
						}	
					}
					catch (e) {
						order.emailError = JSON.parse(JSON.stringify(e));
					}
				}

				order.status = 'pending';
				order.flagged = orderFlagged(order, new OrderApi);
				order.state = 'completed';
				if (opts.transactions) tx.start('create order');
				Orders.update({_id:orderId}, order);
				if (opts.transactions) tx.commit();
				
				return {
					success: true,
					orderId: orderId._str
				};
			}
			else {
				order.state = 'failed';
				order.error = 'payment';
				order.paymentResponse = response;
				Orders.update({_id:orderId}, order);
				return {
					success: false,
					error: 'payment',
					response: response
				};
			}
		}
		else {
			let cursor = Meals.find()
			let stock = {};
			cursor.forEach(function(meal) {
				stock[meal._id._str] = meal.stock;
			});
			return {
				success: false,
				error: 'deliveryDate',
				stock: stock,
			};
		}
	}
	catch (e) {
		let error = JSON.parse(JSON.stringify(e));
		error.createdAt = new Date();
		error.orderData = orderData;
		Errors.insert(error);
		return {
			success: false,
			error: 'inernalError',
			e:e
		};
	}
}

export function availablilityDatesForOrder(order: Order): DateSet {
	let excluded = [
		['dayOfYear', '10-29'],
		['dayOfYear', '09-12']
	];
	let blocks = Blocks.find().fetch();
	for (let block of blocks) {
		excluded.push(['range', formatDate(block.start), formatDate(block.end)]);
	}
	let excludedDates = new DateSet();
	for (let rule of excluded) {
		excludedDates.addRule('include', DateSet.rule[rule[0]].apply(DateSet, rule.slice(1)));
	}
	var orderApi = new OrderApi;

	let availabilityDates = new DateSet();
	availabilityDates.addRule('exclude', excludeAvailabilityDate({
		excludedFulfillmentDates:excludedDates,
		fulfillmentDays: () => orderFulfillmentDays(order, orderApi),
		api:orderApi
	}));

	for (let bundle of order.bundles) {
		if (bundle.promotion && bundle.promotion.fulfillmentStart && bundle.promotion.fulfillmentEnd) {
			availabilityDates.addRule('exclude', DateSet.rule.invertedRange(bundle.promotion.fulfillmentStart, bundle.promotion.fulfillmentEnd));
		}
	}

	return availabilityDates;
}


// TODO: Eliminate nesting
export function validatePromotion(userId: string, order: OrderData, promotion: Promotion): any {
	if (promotion) {
		let now = new Date();
		let today = formatDate(now);
		if (now.getTime() >= Date.parse(promotion.start)) {
			if (now.getTime() < Date.parse(promotion.end)) {
				if (!order.deliveryOptions.date || !(promotion.fulfillmentStart && promotion.fulfillmentEnd) || order.deliveryOptions.date >= promotion.fulfillmentStart && order.deliveryOptions.date <= promotion.fulfillmentEnd) {
					let used = false;
					if (promotion.usageLimit) {
						let count = Orders.find({userId:userId, bundles:{$elemMatch:{'promotion._id':promotion._id}}}).count();
						used = count >= promotion.usageLimit;
					}
					if (!used) {
						if (promotion.premiumCap !== null) {
							let premiumCount = 0;
							for (let bundle of order.bundles) {
								for (let mealSelection of bundle.mealSelections) {
									if (Meals.findOne(new Mongo.ObjectID(mealSelection.mealId)).grade == 'premium') {
										premiumCount += mealSelection.quantity;
										if (premiumCount > promotion.premiumCap) {
											return {error:'surpassedPremiumCap', premiumCap: promotion.premiumCap};
										}
									}
								}
							}
						}

						let bundles = [];
						let index = 0;
						for (let bundle of order.bundles) {
							if (promotion.mealPlan && bundle.mealPlan != promotion.mealPlan._str) continue;
							if (promotion.portion && bundle.portion != promotion.portion._str) continue;
							if (promotion.bundleType && bundle.type != promotion.bundleType._str) continue;
							bundles.push(index);
							++ index;
						}
						if (bundles.length) {
							return bundles;
						}
						else {
							return 'notCompatible';
						}
					}
					else {
						return 'alreadyUsed';
					}
				}
				else {
					return 'invalidFulfillmentDate';
				}
			}
			else {
				return 'promotionEnded';
			}
		}
		else {
			return 'promotionNotStarted';
		}
	}
	else {
		return 'invalidPromoCode';
	}	
}


export function resolveOrder(orderData: OrderData, userId: string): Order {
	var fulfillmentSettings = FulfillmentSettings.findOne();
	var bundles = [];
	for (var bundleData of orderData.bundles) {
		var bundle: Order.Bundle = {
			portion: <Portion>Portions.findOne({_id:new Mongo.ObjectID(bundleData.portion)}),
			mealPlan: <MealPlan>MealPlans.findOne({_id:new Mongo.ObjectID(bundleData.mealPlan)}),
			type: <BundleType>BundleTypes.findOne({_id:new Mongo.ObjectID(bundleData.type)}),
			allergies: <Ingredient[]>_.map(bundleData.allergies, (allergyId: string) => {return Ingredients.findOne({_id:new Mongo.ObjectID(allergyId)})}),
			mealSelections: <Order.MealSelection[]>_.map(bundleData.mealSelections, (mealSelection: OrderData.MealSelection): Order.MealSelection => {
				return {
					meal: Meals.findOne({_id:new Mongo.ObjectID(mealSelection.mealId)}),
					quantity: mealSelection.quantity
				};
			}),
			promotion: bundleData.promotion ? Promotions.findOne({_id: new Mongo.ObjectID(bundleData.promotion)}) : undefined
		};
		bundle.price = bundlePrice(bundle);
		bundle.total = bundleTotal(bundle);
		bundles.push(bundle);
	}
	var order: Order = {
		userId: userId,
		addOnSelections: _.map(orderData.addOnSelections, (addOnSelection) => {
			return {
				addOn: AddOns.findOne({_id:new Mongo.ObjectID(addOnSelection.addOnId)}),
				variant: addOnSelection.variant,
				quantity: addOnSelection.quantity,
			};
		}),
		bundles:bundles,
		deliveryOptions:orderData.deliveryOptions,
		// promotion: orderData.promotion ? Promotions.findOne({_id:new Mongo.ObjectID(orderData.promotion)}) : undefined
	};
	if (orderData.deliveryOptions) {
		if (orderData.deliveryOptions.time) {
			var timeSlot = TimeSlots.findOne({_id:new Mongo.ObjectID(orderData.deliveryOptions.time)});
			order.deliveryOptions.time = {_id:timeSlot._id, start:timeSlot.start, end:timeSlot.end};
		}
		order.locationSurcharge = orderLocationSurcharge(order, {
			locationSurcharges: LocationSurcharges.find().fetch()
		});
		order.deliveryFee = orderDeliveryFee(order, {
			totalMeals(order) {
				return orderTotalMeals(order);
			},
			fulfillmentSettings: fulfillmentSettings,
			locationSurcharges: LocationSurcharges.find().fetch()
		});
	}
	order.subtotal = orderSubtotal(order);
	order.total = orderTotal(order);
	order.number = nextOrderNumber();
	return order;
}
