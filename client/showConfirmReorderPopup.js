import showPopup from './showPopup';

export default function showConfirmReorderPopup(compile, parentScope, order) {
	scope = parentScope.$new();
	scope.order = order;
	showPopup({
		type: 'popup',
		showClose: false,
		id: 'confirm-reorder',
		content: compile(`
			<order order="order"></order>
			<a class="confirm" href="${Meteor.settings.public.orderWizardUrl}?reorder={{order._id._str}}">Confirm</a>
			<button class="cancel" ng-click="cancel()">Cancel</button>
		`)(scope),
		init: function({close}) {
			scope.cancel = close;
		}
	});
}

