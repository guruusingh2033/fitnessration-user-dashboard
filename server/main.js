import {Facebook, FacebookApiException} from 'fb';
import { Meteor } from 'meteor/meteor';
import { Surveys } from '../imports/api/surveys';
import { Meals } from '../imports/api/meals';
import { Promotions } from '../imports/api/promotions';
import * as _ from 'lodash';
import { HTTP } from 'meteor/http'
import { convertToDate, calendarDaysForMonth, formatDate } from '../imports/common/scripts/date';
import { excludeAvailabilityDate, orderFulfillmentDays, bundleTotal, orderSubtotal, orderDeliveryFee, orderTotal, bundlePrice, orderTotalMeals, orderFlagged, orderLocationSurcharge } from '../imports/common/scripts/order';
import { validatePromotion, resolveOrder, availablilityDatesForOrder, timeSlotsForMonth, createOrder } from '../imports/server/main';
import lockFile from 'lockfile';

Accounts.onCreateUser((options, user) => {
	user.username = user.username.toLowerCase();
	if (!user.profile) {
		user.profile = {};
	}
	user.profile.preferences = {};
	user.profile.deliveryAddresses = [];
	if (!user.profile.firstName && options.firstName) {
		user.profile.firstName = options.firstName;
	}
	if (!user.profile.surname && options.surname) {
		user.profile.surname = options.surname;
	}
	return user;
});

Accounts.config({
  loginExpirationInDays: 1000
});

var gateway;
Meteor.startup(function () {
	var braintree = require('braintree');
	gateway = braintree.connect({
		environment: Meteor.settings.braintree.environment == 'sandbox' ? braintree.Environment.Sandbox : braintree.Environment.Production,
		publicKey: Meteor.settings.braintree.publicKey,
		privateKey: Meteor.settings.braintree.privateKey,
		merchantId: Meteor.settings.braintree.merchantId
	});
});

Accounts.emailTemplates.from = 'Fitness Ration <no-reply@fitnessration.com.sg>';
Accounts.emailTemplates.resetPassword.subject = () => {
	return 'Password recovery for your Fitness Ration account';
};
Accounts.emailTemplates.resetPassword.html = (user, url) => {
	return `
		<p>Dear ${user.profile.firstName},</p>
		<p>You have requested for a password recovery in your Fitness Ration account.</p>
		<p>To change your password, <a href="${url}">click here</a> to login to your user dashboard.</p>

		<p>If you <b>did not</b> request for a password recovery, please email us immediately at enquiries@fitnessration.com.sg and we will respond within 24 hours.</p>

		<p>Sincerely,<br>
		Team Fitness Ration</p>`;
};

Meteor.publish('user', () => {
	return Meteor.users.find({_id:this.userId});
});

var api = new Restivus({
	useDefaultAuth: true,
	auth: {
		token: 'auth.apiKey'
	}
});

Meteor.methods({
	updateUsername(username) {
		Meteor.users.update({_id:Meteor.userId()}, {$set:{username:username, 'emails.0.address':username}});
	},
	uploadProfilePicture(args) {
		if (Meteor.user()) {
			HTTP.post(Meteor.settings.public.imageServerUrl + '/upload.php', {
				content:args.data
			}, (err, result) => {
				if (result.data.result == 'success') {
					Meteor.users.update({_id:Meteor.userId()}, {$set:{'profile.picture':result.data.url}});
				}
			});
		}
	}
});

api.addCollection(Meteor.users);
api.addCollection(Surveys);

api.addRoute('delivery/calendar', {
	post: function() {
		var userId = this.request.headers['x-user-id']
		var order = resolveOrder(this.bodyParams.order, userId);
		var [, year, month] = this.queryParams.month.match(/(\d{4})-(\d{1,2})/);
		var timeSlots = timeSlotsForMonth(new Date(year, month - 1));
		var availabilityDates = availablilityDatesForOrder(order);

		var response = {};
		for (var date in timeSlots) {
			if (availabilityDates.test(date)) {
				response[date] = timeSlots[date];
			}
			else {
				response[date] = [];
			}
		}
		return response;
	}
});

api.addRoute('users/delivery-addresses', {
	post() {
		Meteor.users.update({_id:this.request.headers['x-user-id']}, {$push:{'profile.deliveryAddresses':this.bodyParams}});
		return true;
	}
});

api.addRoute('payment/client-token', {
	get: function() {
		var clientId = this.queryParams.clientId;
		var generateToken = Meteor.wrapAsync(gateway.clientToken.generate, gateway.clientToken);
		var options = {};

		if (clientId) {
			options.clientId = clientId;
		}

		var response = generateToken(options);

		return response.clientToken;
	}
});

api.addRoute('users/reset-password', {
	get: function() {
		var user = Meteor.users.findOne({username:this.queryParams.email.toLowerCase()});
		if (user) {
			Accounts.sendResetPasswordEmail(user._id);
			return true;
		}
		else {
			return false;
		}
	}
});

api.addRoute('promo-codes/validate', {
	post() {
		var promotion = Promotions.findOne({promoCode:new RegExp(this.bodyParams.promoCode, 'i')});
		var result = validatePromotion(this.request.headers['x-user-id'], this.bodyParams.order, promotion);
		if (_.isArray(result)) {
			return {
				result: true,
				bundles: result,
				promotion: promotion
			};
		}
		else {
			return {
				result: false,
				error: result
			};
		}
	}
});

api.addRoute('orders', {
	post() {
		var orderData = this.bodyParams;
		var userId = this.request.headers['x-user-id']
		lockFile.lockSync('orders.lock');
		var response = createOrder(orderData, userId, {
			gateway: gateway,
			charge: true,
			sendEmails: true,
			transactions: true
		});
		lockFile.unlockSync('orders.lock');
		return response;
	}
});

api.addRoute('profile-picture', {
	post() {
		console.log(this.request.files);
		return true;
	}
});

api.addRoute('facebook-login', {
	get: function() {
		var accessToken = this.queryParams.accessToken;
		var expiresIn = this.queryParams.expiresIn;

		var fb = new Facebook({
			accessToken: accessToken,
			appId: Meteor.settings.facebook.appId,
			appSecret: Meteor.settings.facebook.secret,
		});

		var serviceData = Meteor.wrapAsync(function(done) {
			fb.api('me', {fields:['id', 'email', 'name', 'first_name', 'last_name']}, function(res) {
				done(null, res);
			});
		})();

		serviceData.accessToken = accessToken;
		serviceData.expiresAt = parseInt((+new Date) + (1000 * expiresIn));

		var userId;
		var user = Meteor.users.findOne({username:serviceData.email});

		if (user && !user.services.facebook) {
			Meteor.users.update({_id:user._id}, {
				$set: {
					'services.facebook': serviceData
				}
			})
		}

		if (!user) {
			user = Meteor.users.findOne({'services.facebook.id':serviceData.id});
		}

		if (!user) {
			userId = Accounts.insertUserDoc({}, {
				username: serviceData.email,
				emails: [{address:serviceData.email, verified:true}],
				profile: {
		    	firstName: serviceData.first_name,
		    	surname: serviceData.last_name,
				},
				services: {
					facebook: serviceData
				}
			});
		}
		else {
			userId = user._id;
		}

		var authToken = Accounts._generateStampedLoginToken();
		var hashedToken = Accounts._hashLoginToken(authToken.token);
		Accounts._insertHashedLoginToken(userId, {
		  hashedToken: hashedToken
		});
		return {
		  authToken: authToken.token,
		  userId: userId
		};
	}
});

api.addRoute('admin/invoices', {
	get: function() {
		var wkhtmltopdf = require('wkhtmltopdf');
		Meteor.wrapAsync((done) => {
			wkhtmltopdf(Meteor.settings.public.exportUrl + 'invoice.php?orders=' + this.queryParams.orders, {
				headerHtml: Meteor.settings.public.exportUrl + 'invoice-header.html',
				footerHtml: Meteor.settings.public.exportUrl + 'invoice-footer.html',
			}, () => {done()}).pipe(this.response);
		})();
		this.done();
	}
});


// ServiceConfiguration.configurations.remove({
//     service: 'facebook'
// });
// ServiceConfiguration.configurations.insert({
//     service: 'facebook',
//     appId: '832188753584745',
//     secret: '178fbaf18a80a823a3ad42026ecd8716'
// });


// function checkOrderStock(order) {
// 	var mealStock = {};
// 	for (let bundle of order.bundles) {
// 		for (let mealSelection of bundle.mealSelections) {
// 			var currentStock = Meals.findOne({_id:mealSelection.meal._id}).stock;
// 			if (currentStock < mealSelection.quantity) {
// 				mealStock[mealSelection.meal._id._str] = currentStock;
// 			}
// 		}
// 	}
// 	if (_.isEmpty(mealStock)) {
// 		return true;
// 	}
// 	else {
// 		return mealStock;
// 	}
// }

// function adjustStock(order) {
// 	for (let bundle of order.bundles) {
// 		for (let mealSelection of bundle.mealSelections) {
// 			Meals.update({_id:mealSelection.meal._id}, {$inc:{stock:-mealSelection.quantity}});
// 		}
// 	}
// }

