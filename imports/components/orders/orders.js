import angular from 'angular';
import angularMeteor from 'angular-meteor';
import template from './orders.html';
import order from '../order/order';
import { Orders } from '../../api/orders';
import { BundleTypes } from '../../api/bundleTypes';
import { Meals } from '../../api/meals';
import { Ingredients } from '../../api/ingredients';
import { formatDate } from '../../common/scripts/date';
class OrdersCtrl {
  constructor($scope, $reactive) {
    "ngInject";
    document.title = 'Orders';
    $scope.viewModel(this);

    this.subscribe('orders');

    $reactive(this).attach($scope);

    this.helpers({
      orderHistory() {
        return Orders.find({'deliveryOptions.date':{$lt:formatDate(new Date())}}, {sort:{createdAt:-1}});
      },
      currentOrders() {
        return Orders.find({'deliveryOptions.date':{$gte:formatDate(new Date())}}, {sort:{createdAt:-1}});
      }
    });
  }
}
 
export default angular.module('orders', [
  angularMeteor,
  order.name,
])
  .component('orders', {
    templateUrl: template,
    controller: OrdersCtrl
  });
