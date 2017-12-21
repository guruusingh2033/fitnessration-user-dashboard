import { resetDatabase } from 'meteor/xolvio:cleaner';
import {
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



describe('server/main.js', function() {
	describe('availablilityDatesForOrder()', function() {
		it('should return the correct value'/*, function() {
			availablilityDatesForOrder({

			})
		}*/);
	});
});


// describe('order', function() {
// 	// * cost
// 	// ** total
// 	it(`should cost the appropriate amount`/*, function() {
// 		var order = resolveOrder({
// 			bundles: []
// 		});
// 		orderTotal({
// 			subtotal: orderSubtotal({
// 				bundles: [
// 					{

// 					}
// 				]
// 			}),
// 			deliveryFee: 2,

// 		})
// 	}*/);
// 	// ** bundles
// 	// ** delivery fee
// 	it(`should have a delivery fee`);
// 	it(`shouldn't have a delivery fee when self-collected`, function() {
// 		orderDeliveryFee({
// 			deliveryOptions: {
// 				selfCollection: true
// 			}
// 		}).should.equal(0);
// 	});
// 	// *** location surcharge
// 	describe('location surcharge', function() {
// 		it(`shouldn't have a location surcharge`, function() {
// 			LocationSurcharges.insert({postalPrefix:'111', surcharge: 10});
// 			orderLocationSurcharge({
// 				deliveryOptions: {
// 					postalCode: '11012'
// 				} 
// 			}, {
// 				locationSurcharges: LocationSurcharges.find().fetch()
// 			}).should.equal(0);
// 		});
// 		it('should have a location surcharge', function() {
// 			LocationSurcharges.insert({postalPrefix:'111', surcharge: 10});
// 			orderLocationSurcharge({
// 				deliveryOptions: {
// 					postalCode: '11112'
// 				}
// 			}, {
// 				locationSurcharges: LocationSurcharges.find().fetch()
// 			}).should.equal(10);
// 		});
// 	});
// 	// *** meal quantity
// 	it(`shouldn't have a delivery fee when meals surpass the free delivery threshold`);
// 	// *** bundles
// 	// **** promotions
// 	// ** add-ons
// 	// * fulfillment/availability
// 	// ** stock
// 	// ** meal quantity
// 	// ** promotions
// 	// ** time
// 	// ** portion/meal plan combinations
// 	// ** time slots
// 	// * creation
// 	// ** user initialization
// 	// ** flagging
// });

// describe('bundle', function() {
// 	// * cost
// 	it(`should cost the appropriate amount`);
// 	// ** meals
// 	// *** premium
// 	it(`shouldn't cost more if premium meals are below or equal to the premium meal count`);
// 	it(`should cost more if premium meals are above the premium meal count`);
// 	// ** allergies
// 	it(`should include allergy surhcarges`);
// 	// ** promotions
// 	it(`should have a reduced price with a promotion`);
// 	// * promotion validation
// });
