import { resetDatabase } from 'meteor/xolvio:cleaner';
import {
	orderCheckAgainstTrigger,
	orderCheckAgainstTriggers,
	orderFlagged,
	bundlePrice,
	orderLocationSurcharge,
	orderDeliveryFee,
	orderTotal,
	orderSubtotal,
	orderFulfillmentDays,
	bundleTotal } from '../imports/common/scripts/order';
import { chai } from 'meteor/practicalmeteor:chai';
import { LocationSurcharges } from '../imports/api/locationSurcharges';
import { BundleTypes } from '../imports/api/bundleTypes';
import { resolveOrder, availablilityDatesForOrder } from '../imports/server/main';

import * as _ from 'lodash';

beforeEach(function() {
	resetDatabase();
	chai.should();
});

describe('common/scripts/orders.ts', function() {
	var api = {
		compareObjectId(a, b) {
			return a == b;
		},
		findOne(collection, predicate) {
			var documents = {
				mealPlans: [{ _id: 'heavyDuty', name: 'Heavy Duty' }, { _id: 'mealPlan', name: 'Meal Plan' }],
				portions: [{ _id: 'forHer', name: 'For Her' }],
			};
			return _.find(documents[collection], predicate);
		},
		mealStock(meal) {
			var stock = {
				meal: 2
			};
			return stock[meal._id];
		},
		anomalyTriggers: [],
		fulfillmentSettings: {
			minDays: 0
		}
	};

	describe('orderCheckAgainstTrigger()', function() {
		it('should match allergies', function() {
			var trigger = 
				{
					_id: 1,
			    "productType": "meal", 
			    "meal": null, 
			    "portion": null,
			    "mealPlan": null, 
			    "addOn": null, 
			    "quantity": 3, 
			    "delay": 3,
			    "alert": {
		        "title": "Whoa there!", 
		        "message": "We do need a little more time in prepping your order. Consider selecting other varieties for earlier deliveries."
			    }, 
			    "flagOrder": true, 
			    "matchOrders": "withAllergies"
				}
			orderCheckAgainstTrigger({
				bundles: [
					{
						allergies: [{_id:1}],
						mealSelections: [ { meal: { _id: 'meal' }, quantity: 3 } ],
						mealPlan: { _id: 'heavyDuty', name: 'Heavy Duty' },
						portion: { _id: 'forHer', name: 'For Her' }
					}
				]
			}, trigger, api).should.equal(true);
		});
		it('should match meal plan', function() {
			var trigger = {
				_id: 1,
		    "productType": "meal", 
		    "meal": null, 
		    "portion": null,
		    "mealPlan": 'heavyDuty', 
		    "addOn": null, 
		    "quantity": 3, 
		    "delay": 3,
		    "alert": {
		        "title": "Whoa there!", 
		        "message": "We do need a little more time in prepping your order. Consider selecting other varieties for earlier deliveries."
		    }, 
		    "flagOrder": true, 
		    "matchOrders": "all"
			};
			orderCheckAgainstTrigger({
				bundles: [
					{
						allergies: [],
						mealSelections: [ { meal: { _id: 'meal' }, quantity: 3 } ],
						mealPlan: { _id: 'heavyDuty', name: 'Heavy Duty' },
						portion: { _id: 'forHer', name: 'For Her' }
					}
				]
			}, trigger, api).should.equal(true);
			var trigger = {
				_id: 1,
		    "productType": "meal", 
		    "meal": null, 
		    "portion": null,
		    "mealPlan": 'heavyDuty', 
		    "addOn": null, 
		    "quantity": 3, 
		    "delay": 3,
		    "alert": {
		        "title": "Whoa there!", 
		        "message": "We do need a little more time in prepping your order. Consider selecting other varieties for earlier deliveries."
		    }, 
		    "flagOrder": true, 
		    "matchOrders": "all"
			};
			orderCheckAgainstTrigger({
				bundles: [
					{
						allergies: [],
						mealSelections: [ { meal: { _id: 'meal' }, quantity: 3 } ],
						mealPlan: { _id: 'leanOnMe', name: 'Heavy Duty' },
						portion: { _id: 'forHer', name: 'For Her' }
					}
				]
			}, trigger, api).should.equal(false);
		});

		it('should match portion', function() {
			var trigger = {
				_id: 1,
		    "productType": "meal", 
		    "meal": null, 
		    "portion": 'forHer',
		    "mealPlan": null, 
		    "addOn": null, 
		    "quantity": 3, 
		    "delay": 3,
		    "alert": {
		        "title": "Whoa there!", 
		        "message": "We do need a little more time in prepping your order. Consider selecting other varieties for earlier deliveries."
		    }, 
		    "flagOrder": true, 
		    "matchOrders": "all"
			};
			orderCheckAgainstTrigger({
				bundles: [
					{
						allergies: [],
						mealSelections: [ { meal: { _id: 'meal' }, quantity: 3 } ],
						mealPlan: { _id: 'heavyDuty', name: 'Heavy Duty' },
						portion: { _id: 'forHer', name: 'For Her' }
					}
				]
			}, trigger, api).should.equal(true);
			var trigger = {
				_id: 1,
		    "productType": "meal", 
		    "meal": null, 
		    "portion": 'forHer',
		    "mealPlan": null, 
		    "addOn": null, 
		    "quantity": 3, 
		    "delay": 3,
		    "alert": {
		        "title": "Whoa there!", 
		        "message": "We do need a little more time in prepping your order. Consider selecting other varieties for earlier deliveries."
		    }, 
		    "flagOrder": true, 
		    "matchOrders": "all"
			};
			orderCheckAgainstTrigger({
				bundles: [
					{
						allergies: [],
						mealSelections: [ { meal: { _id: 'meal' }, quantity: 3 } ],
						mealPlan: { _id: 'leanOnMe', name: 'Heavy Duty' },
						portion: { _id: 'forHim', name: 'For Her' }
					}
				]
			}, trigger, api).should.equal(false);
		});
		it('should match meal', function() {
			var trigger = {
				_id: 1,
		    "productType": "meal", 
		    "meal": 'meal', 
		    "portion": null,
		    "mealPlan": null, 
		    "addOn": null, 
		    "quantity": 3, 
		    "delay": 3,
		    "alert": {
		        "title": "Whoa there!", 
		        "message": "We do need a little more time in prepping your order. Consider selecting other varieties for earlier deliveries."
		    }, 
		    "flagOrder": true, 
		    "matchOrders": "all"
			};
			orderCheckAgainstTrigger({
				bundles: [
					{
						allergies: [],
						mealSelections: [ { meal: { _id: 'meal' }, quantity: 3 } ],
						mealPlan: { _id: 'heavyDuty', name: 'Heavy Duty' },
						portion: { _id: 'forHer', name: 'For Her' }
					}
				]
			}, trigger, api).should.equal(true);
			var trigger = {
				_id: 1,
		    "productType": "meal", 
		    "meal": 'meal', 
		    "portion": null,
		    "mealPlan": null, 
		    "addOn": null, 
		    "quantity": 3, 
		    "delay": 3,
		    "alert": {
		        "title": "Whoa there!", 
		        "message": "We do need a little more time in prepping your order. Consider selecting other varieties for earlier deliveries."
		    }, 
		    "flagOrder": true, 
		    "matchOrders": "all"
			};
			orderCheckAgainstTrigger({
				bundles: [
					{
						allergies: [],
						mealSelections: [ { meal: { _id: 'nope' }, quantity: 3 } ],
						mealPlan: { _id: 'leanOnMe', name: 'Heavy Duty' },
						portion: { _id: 'forHim', name: 'For Her' }
					}
				]
			}, trigger, api).should.equal(false);
			var trigger = {
				_id: 1,
		    "productType": "meal", 
		    "meal": 'meal', 
		    "portion": null,
		    "mealPlan": null,
		    "addOn": null, 
		    "quantity": 3, 
		    "delay": 3,
		    "alert": {
	        "title": "Whoa there!", 
	        "message": "We do need a little more time in prepping your order. Consider selecting other varieties for earlier deliveries."
		    }, 
		    "flagOrder": true, 
		    "matchOrders": "all"
			};
			orderCheckAgainstTrigger({
				bundles: [
					{
						allergies: [],
						mealSelections: [ { meal: { _id: 'meal' }, quantity: 2 } ],
						mealPlan: { _id: 'leanOnMe', name: 'Heavy Duty' },
						portion: { _id: 'forHim', name: 'For Her' }
					}
				]
			}, trigger, api).should.equal(false);
		});
		it('should match addon', function() {
			var trigger = {
				_id: 1,
		    "productType": "addOn", 
		    "meal": null, 
		    "portion": null,
		    "mealPlan": null,
		    "addOn": 1, 
		    "quantity": 3, 
		    "delay": 3,
		    "alert": {
	        "title": "Whoa there!", 
	        "message": "We do need a little more time in prepping your order. Consider selecting other varieties for earlier deliveries."
		    }, 
		    "flagOrder": true, 
		    "matchOrders": "all"
			};
			orderCheckAgainstTrigger({
				addOnSelections: [ { addOn: { _id: 1 }, quantity: 3 } ],
				bundles: [
					{
						allergies: [],
						mealSelections: [ { meal: { _id: 'meal' }, quantity: 3 } ],
						mealPlan: { _id: 'leanOnMe', name: 'Heavy Duty' },
						portion: { _id: 'forHim', name: 'For Her' }
					}
				]
			}, trigger, api).should.equal(true);
			var trigger = {
				_id: 1,
		    "productType": "addOn", 
		    "meal": null, 
		    "portion": null,
		    "mealPlan": null,
		    "addOn": 1, 
		    "quantity": 3, 
		    "delay": 3,
		    "alert": {
	        "title": "Whoa there!", 
	        "message": "We do need a little more time in prepping your order. Consider selecting other varieties for earlier deliveries."
		    },
		    "flagOrder": true, 
		    "matchOrders": "all"
			};
			orderCheckAgainstTrigger({
				addOnSelections: [ { addOn: { _id: 2 }, quantity: 3 } ],
				bundles: [
					{
						allergies: [],
						mealSelections: [ { meal: { _id: 'meal' }, quantity: 2 } ],
						mealPlan: { _id: 'leanOnMe', name: 'Heavy Duty' },
						portion: { _id: 'forHim', name: 'For Her' }
					}
				]
			}, trigger, api).should.equal(false);
			var trigger = {
				_id: 1,
		    "productType": "addOn", 
		    "meal": null, 
		    "portion": null,
		    "mealPlan": null,
		    "addOn": 1, 
		    "quantity": 3, 
		    "delay": 3,
		    "alert": {
	        "title": "Whoa there!", 
	        "message": "We do need a little more time in prepping your order. Consider selecting other varieties for earlier deliveries."
		    }, 
		    "flagOrder": true, 
		    "matchOrders": "all"
			};
			orderCheckAgainstTrigger({
				addOnSelections: [ { addOn: { _id: 2 }, quantity: 2 } ],
				bundles: [
					{
						allergies: [],
						mealSelections: [ { meal: { _id: 'meal' }, quantity: 2 } ],
						mealPlan: { _id: 'leanOnMe', name: 'Heavy Duty' },
						portion: { _id: 'forHim', name: 'For Her' }
					}
				]
			}, trigger, api).should.equal(false);
		});
	});
	describe('orderCheckAgainstTriggers()', function() {
		it('should return the current value', function() {
			var trigger1 = {
				_id: 1,
		    "productType": "addOn", 
		    "meal": null, 
		    "portion": null,
		    "mealPlan": null,
		    "addOn": 1, 
		    "quantity": 3, 
		    "delay": 3,
		    "alert": {
	        "title": "Whoa there!", 
	        "message": "We do need a little more time in prepping your order. Consider selecting other varieties for earlier deliveries."
		    }, 
		    "flagOrder": true, 
		    "matchOrders": "all"
			};
			var trigger2 = {
				_id: 1,
		    "productType": "addOn", 
		    "meal": null, 
		    "portion": null,
		    "mealPlan": null,
		    "addOn": 1, 
		    "quantity": 3, 
		    "delay": 5,
		    "alert": {
	        "title": "Whoa there!", 
	        "message": "We do need a little more time in prepping your order. Consider selecting other varieties for earlier deliveries."
		    }, 
		    "flagOrder": true, 
		    "matchOrders": "all"
			};
			orderCheckAgainstTriggers({
				addOnSelections: [ { addOn: { _id: 1 }, quantity: 3 } ],
				bundles: [
					{
						allergies: [],
						mealSelections: [ { meal: { _id: 'meal' }, quantity: 2 } ],
						mealPlan: { _id: 'leanOnMe', name: 'Heavy Duty' },
						portion: { _id: 'forHim', name: 'For Her' }
					}
				]
			}, [trigger1, trigger2], api).delay.should.equal(5);
		});
	});
	describe('orderFlagged()', function() {
		it('should return the correct value', function() {
			orderFlagged({
				bundles: [
					{
						allergies: [],
						mealPlan: { _id: 'heavyDuty', name: 'Heavy Duty' },
						portion: { _id: 'forHer', name: 'For Her' }
					}
				]
			}, api).should.equal(true);

			orderFlagged({
				bundles: [
					{
						allergies: [],
						mealPlan: { _id: 'mealPlan', name: 'Meal Plan' },
						portion: { _id: 'forHer', name: 'For Her' },
						mealSelections: [
							{ quantity: 7 }
						]
					}
				]
			}, api).should.equal(true);

			orderFlagged({
				bundles: [
					{
						allergies: [],
						mealPlan: { _id: 'mealPlan', name: 'Meal Plan' },
						portion: { _id: 'forHer', name: 'For Her' },
						mealSelections: [
							{ quantity: 3, meal: { _id: 'meal', allergens: [] } }
						]
					}
				]
			}, api).should.equal(true);

			orderFlagged({
				bundles: [
					{ 
						allergies: [],
						mealPlan: { _id: 'mealPlan', name: 'Meal Plan' },
						portion: { _id: 'forHer', name: 'For Her' },
						mealSelections: [
							{ quantity: 2, meal: { _id: 'meal', allergens: [] } }
						]
					}
				]
			}, api).should.equal(false);

			orderFlagged({
				bundles: [
					{ 
						allergies: [ { _id: 1 } ],
						mealPlan: { _id: 'mealPlan', name: 'Meal Plan' },
						portion: { _id: 'forHer', name: 'For Her' },
						mealSelections: [
							{ quantity: 2, meal: { _id: 'meal', allergens: [ { _id: 1 } ] } }
						]
					}
				]
			}, api).should.equal(true);

			orderFlagged({
				bundles: [
					{ 
						allergies: [ ],
						mealPlan: { _id: 'mealPlan', name: 'Meal Plan' },
						portion: { _id: 'forHer', name: 'For Her' },
						mealSelections: [
							{ quantity: 0, meal: { _id: 'meal', allergens: [] } }
						]
					}
				]
			}, _.merge({}, api, {
				anomalyTriggers: [
					{
						_id: 1,
				    "productType": "meal", 
				    "meal": null, 
				    "portion": null,
				    "mealPlan": null, 
				    "addOn": null, 
				    "quantity": 0, 
				    "delay": 0,
				    "alert": {
				        "title": "Whoa there!", 
				        "message": "We do need a little more time in prepping your order. Consider selecting other varieties for earlier deliveries."
				    }, 
				    "flagOrder": false, 
				    "matchOrders": "all"
					}
				]
			})).should.equal(false);
			orderFlagged({
				bundles: [
					{ 
						allergies: [ ],
						mealPlan: { _id: 'mealPlan', name: 'Meal Plan' },
						portion: { _id: 'forHer', name: 'For Her' },
						mealSelections: [
							{ quantity: 0, meal: { _id: 'meal', allergens: [] } }
						]
					}
				]
			}, _.merge({}, api, {
				anomalyTriggers: [
					{
						_id: 1,
				    "productType": "meal", 
				    "meal": null, 
				    "portion": null,
				    "mealPlan": null, 
				    "addOn": null, 
				    "quantity": 0, 
				    "delay": 0,
				    "alert": {
				        "title": "Whoa there!", 
				        "message": "We do need a little more time in prepping your order. Consider selecting other varieties for earlier deliveries."
				    }, 
				    "flagOrder": true, 
				    "matchOrders": "all"
					}
				]
			})).should.equal(true);
		});
	});
	describe('orderFulfillmentDays()', function() {
		it('should return the correct value', function() {
			orderFulfillmentDays({
				bundles: [
					{ 
						allergies: [],
						mealPlan: { _id: 'mealPlan', name: 'Meal Plan' },
						portion: { _id: 'forHer', name: 'For Her' },
						mealSelections: [
							{ quantity: 3, meal: { _id: 'meal', allergens: [] } }
						]
					}
				]
			}, api).should.equal(3);

			orderFulfillmentDays({
				bundles: [
					{
						allergies: [],
						mealPlan: { _id: 'mealPlan', name: 'Meal Plan' },
						portion: { _id: 'forHer', name: 'For Her' },
						mealSelections: [
							{ quantity: 1, meal: { _id: 'meal', allergens: [] } }
						]
					}
				]
			}, api).should.equal(0);

			orderFulfillmentDays({
				bundles: [
					{
						allergies: [],
						mealPlan: { _id: 'mealPlan', name: 'Meal Plan' },
						portion: { _id: 'forHer', name: 'For Her' },
						mealSelections: [
							{ quantity: 1, meal: { _id: 'meal', allergens: [] } }
						]
					}
				]
			},_.merge({}, api, {
				anomalyTriggers: [
					{
						_id: 1,
				    "productType": "meal", 
				    "meal": null, 
				    "portion": null,
				    "mealPlan": null, 
				    "addOn": null, 
				    "quantity": 0, 
				    "delay": 10,
				    "alert": {
				        "title": "Whoa there!", 
				        "message": "We do need a little more time in prepping your order. Consider selecting other varieties for earlier deliveries."
				    }, 
				    "flagOrder": true, 
				    "matchOrders": "all"
					}
				]
			})).should.equal(10);
		});
	});

	// describe('excludeAvailabilityDates()', function() {
	// 	it('')
	// });

	describe('bundlePrice()', function() {
		it('should return the correct value', function() {
			bundlePrice({
				type: { price: 10 }
			}).should.equal(10);

			bundlePrice({
				promotion: {
					type: 'discount',
					discount: 40
				},
				type: { price: 10 }
			}).should.equal(6);

			bundlePrice({
				promotion: {
					type: 'discount',
					discount: 40
				},
				type: { price: 10 }
			}).should.equal(6);
		});
	});

	describe('bundleTotal()', function() {
		it('should return the correct value', function() {
			bundleTotal({
				price: 10,
				mealSelections: [],
				allergies: []
			}).should.equal(10);

			bundleTotal({
				price: 10,
				mealSelections: [
					// { meal: }
				],
				allergies: [
					// { surcharge: 3, action: 'remove', _id: 1 },
					// { surcharge: 1 },
				]
			}).should.equal(10);

			bundleTotal({
				type: { premiumMeals: 2 },
				price: 10,
				mealSelections: [
					{ meal: { grade: 'premium', price: 1 }, quantity: 3 },
				],
				allergies: []
			}).should.equal(11);

			bundleTotal({
				type: { premiumMeals: 2 },
				price: 10,
				mealSelections: [
					{ meal: { grade: 'premium', price: 1 }, quantity: 1 },
					{ meal: { grade: 'premium', price: 2 }, quantity: 3 },
				],
				allergies: []
			}).should.equal(14);
		});

		it('should correctly factor in promotion premium allowances', function() {
			bundleTotal({
				type: { premiumMeals: 2 },
				price: 10,
				mealSelections: [
					{ meal: { grade: 'premium', price: 1 }, quantity: 1 },
					{ meal: { grade: 'premium', price: 2 }, quantity: 3 },
				],
				allergies: [],
				promotion: {
					premiumAllowance: 0
				}
			}).should.equal(10 + 1*1 + 2*3);

			bundleTotal({
				type: { premiumMeals: 2 },
				price: 10,
				mealSelections: [
					{ meal: { grade: 'premium', price: 1 }, quantity: 1 },
					{ meal: { grade: 'premium', price: 2 }, quantity: 3 },
				],
				allergies: [],
				promotion: {
					premiumAllowance: 4
				}
			}).should.equal(10);
		});

		it('should correctly apply allergy surcharges', function() {
			bundleTotal({
				// type: { premiumMeals: 2 },
				price: 0,
				mealSelections: [
					{ meal: { allergens: [ { _id: 1 } ] }, quantity: 1 },
					{ meal: { allergens: [ { _id: 1 } ] }, quantity: 3 },
					{ meal: { allergens: [ { _id: 2 } ] }, quantity: 3 },
					{ meal: { allergens: [ { _id: 2 } ] }, quantity: 3 },
				],
				allergies: [
					{ _id: 1, action: 'substitute', surcharge: 2 },
					{ _id: 2, action: 'remove', surcharge: 3 },
				]
			}).should.equal(1*2 + 3*2 + 3);
		});
	});

	describe('orderSubtotal()', function() {
		it('should return the correct value', function() {
			orderSubtotal({
				bundles: [
					{ total: 1, allergies: [] },
					{ total: 2, allergies: [] }
				],
				addOnSelections: [
					{ addOn: { price: 1 }, quantity: 3 },
					{ addOn: { price: 2 }, quantity: 2 }
				]
			}).should.equal(10);
		});

		// it('should correctly account for allergy removals', function() {
		// 	orderSubtotal({
		// 		bundles: [
		// 			{
		// 				total: 1,
		// 				allergies: [
		// 					{ _id: 1, action: 'remove', surcharge: 1 },
		// 					{ _id: 2, action: 'remove', surcharge: 2 },
		// 				],
		// 				mealSelections: [
		// 					{
		// 						meal: {
		// 							allergens: [ { _id: 1 } ]
		// 						}
		// 					},
		// 					{
		// 						meal: {
		// 							allergens: [ { _id: 1 } ]
		// 						}
		// 					},
		// 					{
		// 						meal: {
		// 							allergens: [ { _id: 2 } ]
		// 						}
		// 					}
		// 				]
		// 			},
		// 			{ total: 2, allergies: [] }
		// 		],
		// 		addOnSelections: [
		// 			{ addOn: { price: 1 }, quantity: 3 },
		// 			{ addOn: { price: 2 }, quantity: 2 }
		// 		]
		// 	}).should.equal(
		// 		1 /* bundles[0].total */ + 
		// 		2 /* bundles[1].total */ +
		// 		1*3 /* first addon */ +
		// 		2*2 /* second addon */ +

		// 		1 /* first allergy removal */ +
		// 		2 /* second allergy removal */);
		// });
	});

	describe('orderTotal()', function() {
		it('should return the correct value', function() {
			orderTotal({
				subtotal: 4,
				deliveryFee: 1
			}).should.equal(5);
		});
	});


	describe('orderLocationSurcharge()', function() {
		it('should return the correct value', function() {
			orderLocationSurcharge({
				deliveryOptions: {
					postalCode: '12345'
				}
			}, {
				locationSurcharges: [
					{ postalPrefix: '123', surcharge: 10 }
				]
			}).should.equal(10);
			orderLocationSurcharge({
				deliveryOptions: {
					postalCode: '22345'
				}
			}, {
				locationSurcharges: [
					{ postalPrefix: '123', surcharge: 10 }
				]
			}).should.equal(0);
		});
	});

	describe('orderDeliveryFee()', function() {
		it(`should return 0 when self-collection is enabled`, function() {
			orderDeliveryFee({
				bundles: [],
				deliveryOptions: { selfCollection: true }
			}).should.equal(0);
		});

		it(`should return the location surcharge when a bundle has free delivery`, function() {
			orderDeliveryFee({
				// bundles: [],
				deliveryOptions: { selfCollection: false },
				locationSurcharge: 1,
				bundles: [
					{ type: { deliveryFee: false }, allergies: [] },
					{ type: { deliveryFee: true }, allergies: [] },
				]
			}, {
				totalMeals() {
					return 1;
				},
				fulfillmentSettings: { freeDeliveryThreshold: 4, deliveryFee: 2 }
			}).should.equal(1);
		});

		it(`should return the location surcharge when a promotion has free delivery`, function() {
			orderDeliveryFee({
				// bundles: [],
				deliveryOptions: { selfCollection: false },
				locationSurcharge: 1,
				bundles: [
					{ type: { deliveryFee: true }, promotion: { freeDelivery: true }, allergies: [] },
					{ type: { deliveryFee: true }, allergies: [] }
				]
			}, {
				totalMeals() {
					return 1;
				},
				fulfillmentSettings: { freeDeliveryThreshold: 4, deliveryFee: 2 }
			}).should.equal(1);
		});

		it(`should return the sum of location surcharge and the global delivery fee`, function() {
			orderDeliveryFee({
				// bundles: [],
				deliveryOptions: { selfCollection: false },
				locationSurcharge: 1,
				bundles: [
					{ type: { deliveryFee: true }, allergies: [] }
				]
			}, {
				totalMeals() {
					return 1;
				},
				fulfillmentSettings: { freeDeliveryThreshold: 4, deliveryFee: 2 }
			}).should.equal(3);
		});

	});
});
