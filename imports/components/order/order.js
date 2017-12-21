import angular from 'angular';
import angularMeteor from 'angular-meteor';
import template from './order.html';
import { Orders } from '../../api/orders';
import showPopup from '../../../client/showPopup';
import showConfirmReorderPopup from '../../../client/showConfirmReorderPopup';
class OrderCtrl {
	constructor($scope, $element, $reactive, $compile) {
		"ngInject";
		$scope.viewModel(this);
		this.element = $element;
		this.$scope = $scope;
		this.$compile = $compile;
    this.subscribe('bundleTypes');
    this.subscribe('meals');
    this.subscribe('ingredients');
		var reactiveContext = $reactive(this);
		reactiveContext.attach($scope);
		// if (this.order == 'currentOrder') {
		// 	this.autorun(() => {
		// 		var order = Orders.findOne({}, {sort:{createdAt:-1}});
		// 		this.order = order;
		// 		if (order) {
		// 			$element.attr('data-order-id', order._id);        
		// 		}
		// 	});
		// }
	}
	showDetails() {
		this.element.addClass('show-details');
	}
	hideDetails() {
		this.element.removeClass('show-details');
	}
	reorder() {
		showPopup({
			title: 'Re-order',
			id: 'reorder-popup',
			type: 'basic-popup-with-title',
			content: `
				<p>This will re-order all previous meals and bundles in the previous order.</p>
				<button class="button">Review Order</button>
			`,
			init: ({el, close}) => {
				el.find('button').click(() => {
					close();
					showConfirmReorderPopup(this.$compile, this.$scope, this.order);
				});
			}
		});
	}
}
export default angular.module('order', [
	angularMeteor
])
	.component('order', {
		templateUrl: template,
		controller: OrderCtrl,
		bindings: {
			order: '<',
		}
	});
