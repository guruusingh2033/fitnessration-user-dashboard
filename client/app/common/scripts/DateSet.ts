import * as _ from 'lodash';
import { addDays, today, convertToDate } from './date';

export class DateSet {
	rules: any = {};

	static rule = {
		all():boolean {
			return true;
		},
		weekday(weekday): Function {
			return (testDate: Date): boolean => {
				return testDate.getDay() == weekday;
			};
		},
		range(beginDate: Date|string, endDate: Date|string): Function {
			beginDate = convertToDate(beginDate);
			endDate = convertToDate(endDate);
			return (testDate: Date): boolean => {
				return testDate >= beginDate && testDate <= endDate;
			};
		},
		invertedRange(beginDate: Date|string, endDate: Date|string): Function {
			beginDate = convertToDate(beginDate);
			endDate = convertToDate(endDate);
			return (testDate: Date): boolean => {
				return testDate < beginDate || testDate > endDate;
			};
		},
		date(date): Function {
			date = convertToDate(date);
			return (testDate: Date): boolean => {
				return date.valueOf() == testDate.valueOf();
			};
		},
		dayOfYear(dayOfYear: string): Function {
			var parts = dayOfYear.split('-');
			var month = parseInt(parts[0]);
			var day = parseInt(parts[1]);
			return (testDate: Date): boolean => {
				return testDate.getDate() == day && (testDate.getMonth() + 1) == month;
			};
		},
		after(date): Function {
			date = convertToDate(date);
			return (testDate: Date): boolean => {
				return testDate > date;
			};
		},
		before(date): Function {
			date = convertToDate(date);
			return (testDate: Date): boolean => {
				return testDate < date;
			};
		},
		dateSet(dateSet: DateSet): Function {
			return (testDate: Date): boolean => {
				return dateSet.test(testDate) == true;
			};
		}
	};

	clearCache() {

	}

	addRule(type:string, rule:Function, priority:number = 0): void {
		if (!this.rules[priority]) this.rules[priority] = [];
		this.rules[priority].push([type, rule]);
		this.clearCache();
	}

	static testRule(type: string, rule: Function, date: Date): boolean|number {
		var result = rule(date);
		if (type == 'include') {
			if (result) return true;
			else return 0;
		}
		else if (type == 'exclude') {
			if (result) return false;
			else return 1;
		}
	}

	resolveRules():any[] {
		var priorities = _.map(_.keys(this.rules), (key) => {return parseInt(key)}).sort();//.reverse();
		var rules = [];
		for (var priority of priorities) {
			rules = rules.concat(this.rules[priority]);
		}
		return rules;
	}

	test(date: Date|string): boolean|number {
		var currentResult;

		var definiteDate = convertToDate(date);

		var rules = this.resolveRules();
		for (var i = rules.length - 1; i >= 0; --i) {
			currentResult = DateSet.testRule(rules[i][0], rules[i][1], definiteDate);
			if (typeof currentResult == 'boolean') return currentResult;
		}
		return currentResult;
	}

	earliestDate(maxDaysInFuture: number = 30): Date {
		var date = today();
		var daysAhead = 0;
		while (!this.test(date) && daysAhead < maxDaysInFuture) {
			date = addDays(date, 1);
			++daysAhead;
		}
		if (this.test(date)) {
			return date;
		}
		else {
			return null;
		}
	}
}

