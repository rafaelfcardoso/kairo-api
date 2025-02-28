import { RRule, Frequency, Options } from 'rrule';

/**
 * RecurrenceRule is a value object that encapsulates the recurrence rules for tasks
 * It provides methods to parse, validate and manipulate recurrence rules
 */
export class RecurrenceRule {
  private readonly ruleString: string;
  private readonly parsed: RRule;

  /**
   * Create a new RecurrenceRule value object
   * @param ruleString The RRule string in iCalendar format
   */
  constructor(ruleString: string) {
    this.validateRule(ruleString);
    this.ruleString = ruleString;

    // Create a new RRule instance from the string
    this.parsed = new RRule(RRule.parseString(ruleString));
  }

  /**
   * Get the string representation of this recurrence rule
   */
  toString(): string {
    return this.ruleString;
  }

  /**
   * Get the next occurrence after the given date
   * @param after The date to find the next occurrence after
   * @returns The next occurrence date or null if no future occurrences
   */
  getNextOccurrence(after: Date): Date | null {
    const nextDate = this.parsed.after(after, true);
    return nextDate || null;
  }

  /**
   * Get all occurrences between two dates
   * @param startDate The start date
   * @param endDate The end date
   * @returns Array of occurrence dates
   */
  getOccurrencesBetween(startDate: Date, endDate: Date): Date[] {
    return this.parsed.between(startDate, endDate, true);
  }

  /**
   * Check if a date is a valid occurrence according to this rule
   * @param date The date to check
   * @returns True if the date is a valid occurrence
   */
  isOccurrence(date: Date): boolean {
    const before = this.parsed.before(date, true);
    return before ? before.getTime() === date.getTime() : false;
  }

  /**
   * Create a RecurrenceRule for a daily recurrence
   * @param interval Number of days between occurrences
   * @returns A new RecurrenceRule
   */
  static daily(interval = 1): RecurrenceRule {
    const rule = new RRule({
      freq: Frequency.DAILY,
      interval: interval,
    });
    return new RecurrenceRule(rule.toString());
  }

  /**
   * Create a RecurrenceRule for a weekly recurrence
   * @param daysOfWeek Array of days of week (0-6, where 0 is Monday)
   * @param interval Number of weeks between occurrences
   * @returns A new RecurrenceRule
   */
  static weekly(daysOfWeek: number[] = [0], interval = 1): RecurrenceRule {
    const rule = new RRule({
      freq: Frequency.WEEKLY,
      interval: interval,
      byweekday: daysOfWeek,
    });
    return new RecurrenceRule(rule.toString());
  }

  /**
   * Create a RecurrenceRule for a monthly recurrence
   * @param dayOfMonth Day of month (1-31)
   * @param interval Number of months between occurrences
   * @returns A new RecurrenceRule
   */
  static monthly(dayOfMonth = 1, interval = 1): RecurrenceRule {
    const rule = new RRule({
      freq: Frequency.MONTHLY,
      interval: interval,
      bymonthday: dayOfMonth,
    });
    return new RecurrenceRule(rule.toString());
  }

  /**
   * Create a RecurrenceRule for a yearly recurrence
   * @param month Month (0-11, where 0 is January)
   * @param day Day of month (1-31)
   * @param interval Number of years between occurrences
   * @returns A new RecurrenceRule
   */
  static yearly(month = 0, day = 1, interval = 1): RecurrenceRule {
    const rule = new RRule({
      freq: Frequency.YEARLY,
      interval: interval,
      bymonth: month + 1,
      bymonthday: day,
    });
    return new RecurrenceRule(rule.toString());
  }

  /**
   * Create a RecurrenceRule from a common pattern description
   * @param pattern A natural language pattern like "daily", "weekly on Monday", etc.
   * @returns A new RecurrenceRule
   */
  static fromPattern(pattern: string): RecurrenceRule {
    pattern = pattern.toLowerCase().trim();

    if (pattern === 'daily') {
      return RecurrenceRule.daily();
    }

    if (pattern === 'weekly') {
      return RecurrenceRule.weekly([0]); // Monday
    }

    if (pattern === 'monthly') {
      return RecurrenceRule.monthly(1); // 1st day of month
    }

    if (pattern === 'yearly' || pattern === 'annually') {
      return RecurrenceRule.yearly(0, 1); // January 1st
    }

    // For more complex patterns, we would need more sophisticated parsing
    // This is a simplified version
    throw new Error(`Unsupported recurrence pattern: ${pattern}`);
  }

  /**
   * Validate an RRule string
   * @param ruleString The RRule string to validate
   * @throws Error if the rule is invalid
   */
  private validateRule(ruleString: string): void {
    try {
      RRule.parseString(ruleString);
    } catch (error) {
      throw new Error(`Invalid recurrence rule: ${error.message}`);
    }
  }
}
