import { RecurrenceRule } from '../../../../src/tasks/value-objects/recurrence-rule.value-object';
import { RRule, Frequency } from 'rrule';

describe('RecurrenceRule Value Object', () => {
  describe('Constructor and validation', () => {
    it('should create a valid recurrence rule from a string', () => {
      const ruleStr = 'FREQ=DAILY;INTERVAL=1';
      const rule = new RecurrenceRule(ruleStr);

      expect(rule).toBeDefined();
      expect(rule.toString()).toBe(ruleStr);
    });

    it('should throw an error for invalid rule string', () => {
      expect(() => new RecurrenceRule('INVALID_RULE')).toThrow();
      expect(() => new RecurrenceRule('FREQ=UNKNOWN')).toThrow();
    });
  });

  describe('toString', () => {
    it('should return the original rule string', () => {
      const ruleStr = 'FREQ=DAILY;INTERVAL=1';
      const rule = new RecurrenceRule(ruleStr);

      expect(rule.toString()).toBe(ruleStr);
    });
  });

  describe('getNextOccurrence', () => {
    it('should return the next occurrence after the given date for daily rule', () => {
      const rule = RecurrenceRule.daily();
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextOccurrence = rule.getNextOccurrence(today);

      // Should be tomorrow at the same time
      expect(nextOccurrence).toBeDefined();
      expect(nextOccurrence.getDate()).toBe(tomorrow.getDate());
      expect(nextOccurrence.getMonth()).toBe(tomorrow.getMonth());
      expect(nextOccurrence.getFullYear()).toBe(tomorrow.getFullYear());
    });

    it('should return the next occurrence for weekly rule', () => {
      // Create a rule for weekly on Mondays
      const rule = RecurrenceRule.weekly([0]); // Monday is 0 in RRule

      // Get a date that's not Monday
      const date = new Date();
      while (date.getDay() === 1) {
        // 1 is Monday in JavaScript Date
        date.setDate(date.getDate() + 1);
      }

      const nextOccurrence = rule.getNextOccurrence(date);

      // Should be next Monday
      expect(nextOccurrence).toBeDefined();
      expect(nextOccurrence.getDay()).toBe(1); // Monday in JavaScript
    });

    it('should return null if there are no future occurrences', () => {
      // Create a rule with end date in the past
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const ruleStr = new RRule({
        freq: Frequency.DAILY,
        until: yesterday,
      }).toString();

      const rule = new RecurrenceRule(ruleStr);
      const nextOccurrence = rule.getNextOccurrence(new Date());

      expect(nextOccurrence).toBeNull();
    });
  });

  describe('getOccurrencesBetween', () => {
    it('should return all occurrences between two dates for daily rule', () => {
      const rule = RecurrenceRule.daily();

      const start = new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + 5); // 5 days later

      const occurrences = rule.getOccurrencesBetween(start, end);

      // Should have 5 occurrences (today to end date inclusive)
      expect(occurrences.length).toBe(5);

      // Check that dates are sequential
      for (let i = 1; i < occurrences.length; i++) {
        const prevDay = new Date(occurrences[i - 1]);
        prevDay.setDate(prevDay.getDate() + 1);

        expect(occurrences[i].getDate()).toBe(prevDay.getDate());
      }
    });

    it('should return all occurrences between two dates for weekly rule', () => {
      // Weekly on Mondays and Wednesdays
      const rule = RecurrenceRule.weekly([0, 2]); // Monday and Wednesday

      // Start on a Monday and go for 2 weeks
      const start = new Date();
      let daysTillMonday = 1 - start.getDay(); // 1 is Monday in JavaScript
      if (daysTillMonday <= 0) daysTillMonday += 7;
      start.setDate(start.getDate() + daysTillMonday);

      const end = new Date(start);
      end.setDate(end.getDate() + 14); // 2 weeks later

      const occurrences = rule.getOccurrencesBetween(start, end);

      // Should have 4 occurrences (2 Mondays and 2 Wednesdays)
      expect(occurrences.length).toBe(4);

      // Check days of week
      for (let i = 0; i < occurrences.length; i++) {
        const day = occurrences[i].getDay();
        expect(day === 1 || day === 3).toBeTruthy(); // Monday (1) or Wednesday (3)
      }
    });
  });

  describe('isOccurrence', () => {
    it('should return true for dates that match the recurrence rule', () => {
      const rule = RecurrenceRule.daily();

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // The next occurrence should match the rule
      const nextOccurrence = rule.getNextOccurrence(today);
      expect(rule.isOccurrence(nextOccurrence)).toBeTruthy();
    });

    it('should return false for dates that do not match the recurrence rule', () => {
      // Weekly on Mondays
      const rule = RecurrenceRule.weekly([0]); // Monday

      // Get a date that's not Monday
      const date = new Date();
      while (date.getDay() === 1) {
        // 1 is Monday in JavaScript
        date.setDate(date.getDate() + 1);
      }

      expect(rule.isOccurrence(date)).toBeFalsy();
    });
  });

  describe('Factory methods', () => {
    describe('daily', () => {
      it('should create a daily recurrence rule', () => {
        const rule = RecurrenceRule.daily();

        expect(rule.toString()).toContain('FREQ=DAILY');
        expect(rule.toString()).toContain('INTERVAL=1');
      });

      it('should support custom interval', () => {
        const rule = RecurrenceRule.daily(2);

        expect(rule.toString()).toContain('FREQ=DAILY');
        expect(rule.toString()).toContain('INTERVAL=2');
      });
    });

    describe('weekly', () => {
      it('should create a weekly recurrence rule', () => {
        const rule = RecurrenceRule.weekly();

        expect(rule.toString()).toContain('FREQ=WEEKLY');
        expect(rule.toString()).toContain('INTERVAL=1');
        expect(rule.toString()).toContain('BYDAY=MO'); // Monday is default
      });

      it('should support multiple days of week', () => {
        const rule = RecurrenceRule.weekly([0, 2, 4]); // Monday, Wednesday, Friday

        expect(rule.toString()).toContain('FREQ=WEEKLY');
        expect(rule.toString()).toContain('BYDAY=MO,WE,FR');
      });

      it('should support custom interval', () => {
        const rule = RecurrenceRule.weekly([0], 2);

        expect(rule.toString()).toContain('FREQ=WEEKLY');
        expect(rule.toString()).toContain('INTERVAL=2');
      });
    });

    describe('monthly', () => {
      it('should create a monthly recurrence rule', () => {
        const rule = RecurrenceRule.monthly();

        expect(rule.toString()).toContain('FREQ=MONTHLY');
        expect(rule.toString()).toContain('INTERVAL=1');
        expect(rule.toString()).toContain('BYMONTHDAY=1'); // 1st is default
      });

      it('should support custom day of month', () => {
        const rule = RecurrenceRule.monthly(15);

        expect(rule.toString()).toContain('FREQ=MONTHLY');
        expect(rule.toString()).toContain('BYMONTHDAY=15');
      });

      it('should support custom interval', () => {
        const rule = RecurrenceRule.monthly(1, 3);

        expect(rule.toString()).toContain('FREQ=MONTHLY');
        expect(rule.toString()).toContain('INTERVAL=3');
      });
    });

    describe('yearly', () => {
      it('should create a yearly recurrence rule', () => {
        const rule = RecurrenceRule.yearly();

        expect(rule.toString()).toContain('FREQ=YEARLY');
        expect(rule.toString()).toContain('INTERVAL=1');
        expect(rule.toString()).toContain('BYMONTH=1'); // January is default
        expect(rule.toString()).toContain('BYMONTHDAY=1'); // 1st is default
      });

      it('should support custom month and day', () => {
        const rule = RecurrenceRule.yearly(6, 15); // July 15th (month is 0-indexed)

        expect(rule.toString()).toContain('FREQ=YEARLY');
        expect(rule.toString()).toContain('BYMONTH=7'); // July is 7
        expect(rule.toString()).toContain('BYMONTHDAY=15');
      });

      it('should support custom interval', () => {
        const rule = RecurrenceRule.yearly(0, 1, 2);

        expect(rule.toString()).toContain('FREQ=YEARLY');
        expect(rule.toString()).toContain('INTERVAL=2');
      });
    });

    describe('fromPattern', () => {
      it('should create a daily recurrence rule from "daily" pattern', () => {
        const rule = RecurrenceRule.fromPattern('daily');

        expect(rule.toString()).toContain('FREQ=DAILY');
      });

      it('should create a weekly recurrence rule from "weekly" pattern', () => {
        const rule = RecurrenceRule.fromPattern('weekly');

        expect(rule.toString()).toContain('FREQ=WEEKLY');
        expect(rule.toString()).toContain('BYDAY=MO');
      });

      it('should create a monthly recurrence rule from "monthly" pattern', () => {
        const rule = RecurrenceRule.fromPattern('monthly');

        expect(rule.toString()).toContain('FREQ=MONTHLY');
        expect(rule.toString()).toContain('BYMONTHDAY=1');
      });

      it('should create a yearly recurrence rule from "yearly" pattern', () => {
        const rule = RecurrenceRule.fromPattern('yearly');

        expect(rule.toString()).toContain('FREQ=YEARLY');
        expect(rule.toString()).toContain('BYMONTH=1');
        expect(rule.toString()).toContain('BYMONTHDAY=1');
      });

      it('should create a yearly recurrence rule from "annually" pattern', () => {
        const rule = RecurrenceRule.fromPattern('annually');

        expect(rule.toString()).toContain('FREQ=YEARLY');
      });

      it('should throw an error for unsupported patterns', () => {
        expect(() => RecurrenceRule.fromPattern('unknown')).toThrow();
      });
    });
  });
});
