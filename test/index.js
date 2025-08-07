'use strict'
/* global Temporal */
const { suite, test } = require('mocha')
const assert = require('assert')
if (!global.Temporal) {
  const polyfill = require('@js-temporal/polyfill')
  global.Temporal = polyfill.Temporal
}
const pkg = require('../package.json')
const { convert, templates } = require('../lib/conversions')
const meetings = require('../lib/meetings')

suite(`${pkg.name} unit`, () => {
  test('process schedule', () => {
    const next = meetings.getNextScheduledMeeting([
      // 5pm GMT April 2 for a period of 28 days
      '2020-04-02T17:00:00.0Z/P28D',

      // 1pm GMT April 16 for a period of 28 days
      '2020-04-16T13:00:00.0Z/P28D'
    ], Temporal.Instant.from('2020-04-03T13:00:00.0Z'))

    assert.deepStrictEqual(next.toString(), Temporal.Instant.from('2020-04-16T13:00:00.0Z').toString())
  })

  test('DST - spring forward', () => {
    // 2024-03-10 - spring forward in US
    const springForwardDate = Temporal.Instant.from('2024-03-10T13:00:00.0Z')
    const chicagoTime = springForwardDate.toZonedDateTimeISO('America/Chicago')

    // s/b 8 AM CDT (UTC-5)
    assert.strictEqual(chicagoTime.hour, 8)
    assert.strictEqual(chicagoTime.minute, 0)
    assert.strictEqual(chicagoTime.offset, '-05:00')
  })

  test('DST - fall back', () => {
    // 2024-11-03 - fall back in US
    const fallBackDate = Temporal.Instant.from('2024-11-03T13:00:00.0Z')
    const chicagoTime = fallBackDate.toZonedDateTimeISO('America/Chicago')

    // s/b 7 AM CST (UTC-6)
    assert.strictEqual(chicagoTime.hour, 7)
    assert.strictEqual(chicagoTime.minute, 0)
    assert.strictEqual(chicagoTime.offset, '-06:00')
  })

  test('DST - summer', () => {
    // 2024-07-15 - summer time
    const summerDate = Temporal.Instant.from('2024-07-15T13:00:00.0Z')
    const londonTime = summerDate.toZonedDateTimeISO('Europe/London')
    const madridTime = summerDate.toZonedDateTimeISO('Europe/Madrid')

    // London s/b 2 PM BST (UTC+1)
    assert.strictEqual(londonTime.hour, 14)
    assert.strictEqual(londonTime.offset, '+01:00')

    // Madrid s/b 3 PM CEST (UTC+2)
    assert.strictEqual(madridTime.hour, 15)
    assert.strictEqual(madridTime.offset, '+02:00')
  })

  test('DST - winter', () => {
    // 2024-01-15 - winter time
    const winterDate = Temporal.Instant.from('2024-01-15T13:00:00.0Z')
    const londonTime = winterDate.toZonedDateTimeISO('Europe/London')
    const madridTime = winterDate.toZonedDateTimeISO('Europe/Madrid')

    // London s/b 1 PM GMT (UTC+0)
    assert.strictEqual(londonTime.hour, 13)
    assert.strictEqual(londonTime.offset, '+00:00')

    // Madrid s/b 2 PM CET (UTC+1)
    assert.strictEqual(madridTime.hour, 14)
    assert.strictEqual(madridTime.offset, '+01:00')
  })

  test('Temporal Instant creation and comparison', () => {
    const instant1 = Temporal.Instant.from('2024-03-10T13:00:00.0Z')
    const instant2 = Temporal.Instant.from('2024-03-10T13:00:00.0Z')
    const instant3 = Temporal.Instant.from('2024-03-10T14:00:00.0Z')

    assert.strictEqual(instant1.epochMilliseconds, instant2.epochMilliseconds)
    assert(instant1.epochMilliseconds < instant3.epochMilliseconds)
  })

  test('Temporal Duration operations', () => {
    const duration = Temporal.Duration.from('P28D')
    const start = Temporal.Instant.from('2024-03-10T13:00:00.0Z')
    const zonedStart = start.toZonedDateTimeISO('UTC')
    const end = zonedStart.add(duration).toInstant()

    // 28 days later s/b 2024-04-07
    const expected = Temporal.Instant.from('2024-04-07T13:00:00.0Z')
    assert.strictEqual(end.epochMilliseconds, expected.epochMilliseconds)
  })

  test('getNextScheduledMeeting with DST transition', () => {
    const schedules = [
      '2024-03-10T13:00:00.0Z/P7D', // spring forward
      '2024-11-03T13:00:00.0Z/P7D' // fall back
    ]

    const beforeSpring = Temporal.Instant.from('2024-03-09T13:00:00.0Z')
    const nextBefore = meetings.getNextScheduledMeeting(schedules, beforeSpring)
    assert.strictEqual(nextBefore.toString(), '2024-03-10T13:00:00Z')

    const afterSpring = Temporal.Instant.from('2024-03-11T13:00:00.0Z')
    const nextAfter = meetings.getNextScheduledMeeting(schedules, afterSpring)
    assert.strictEqual(nextAfter.toString(), '2024-03-17T13:00:00Z')
  })

  test('Date formatting with Intl.DateTimeFormat', () => {
    const date = Temporal.Instant.from('2024-03-10T13:00:00.0Z')
    const zone = 'America/Chicago'
    const zonedDate = date.toZonedDateTimeISO(zone)
    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: zone
    })

    const formattedDate = formatter.format(new Date(zonedDate.epochMilliseconds))
    // spring forward
    assert(formattedDate.includes('Sun'))
    assert(formattedDate.includes('Mar'))
    assert(formattedDate.includes('08:00 AM'))
  })

  test('schedule parsing with timezone - UTC default', () => {
    const schedules = ['2024-03-27T21:00:00.0Z/P2W']
    const now = Temporal.Instant.from('2024-03-20T13:00:00.0Z')
    const next = meetings.getNextScheduledMeeting(schedules, now)
    const expected = Temporal.Instant.from('2024-03-27T21:00:00.0Z')
    assert.strictEqual(next.epochMilliseconds, expected.epochMilliseconds)
  })

  test('schedule parsing with timezone - Chicago', () => {
    const schedules = ['2024-03-27T21:00:00.0[America/Chicago]/P2W']
    const now = Temporal.Instant.from('2024-03-20T13:00:00.0Z')
    const next = meetings.getNextScheduledMeeting(schedules, now)
    // 21:00 CDT == 02:00 UTC next day
    const expected = Temporal.Instant.from('2024-03-28T02:00:00.0Z')
    assert.strictEqual(next.epochMilliseconds, expected.epochMilliseconds)
  })

  test('schedule parsing with timezone - DST spring forward', () => {
    const schedules = ['2025-03-09T01:00:00.0[America/Chicago]/P2W']

    const beforeSpring = Temporal.Instant.from('2025-03-08T13:00:00.0Z')
    const nextBefore = meetings.getNextScheduledMeeting(schedules, beforeSpring)
    // 01:00 CST == 07:00 UTC (before spring forward)
    const expectedBefore = Temporal.Instant.from('2025-03-09T07:00:00.0Z')
    assert.strictEqual(nextBefore.epochMilliseconds, expectedBefore.epochMilliseconds)

    const afterSpring = Temporal.Instant.from('2025-03-09T13:00:00.0Z')
    const nextAfter = meetings.getNextScheduledMeeting(schedules, afterSpring)
    // 01:00 CDT == 06:00 UTC (after spring forward)
    const expectedAfter = Temporal.Instant.from('2025-03-23T06:00:00.0Z')
    assert.strictEqual(nextAfter.epochMilliseconds, expectedAfter.epochMilliseconds)
  })

  test('schedule parsing with timezone - DST fall back', () => {
    const schedules = ['2025-11-02T01:00:00.0[America/Chicago]/P2W']

    const beforeFallBack = Temporal.Instant.from('2025-11-01T13:00:00.0Z')
    const nextBefore = meetings.getNextScheduledMeeting(schedules, beforeFallBack)
    // 01:00 CDT == 06:00 UTC (before fall back)
    const expectedBefore = Temporal.Instant.from('2025-11-02T06:00:00.0Z')
    assert.strictEqual(nextBefore.epochMilliseconds, expectedBefore.epochMilliseconds)

    const afterFallBack = Temporal.Instant.from('2025-11-02T13:00:00.0Z')
    const nextAfter = meetings.getNextScheduledMeeting(schedules, afterFallBack)
    // 01:00 CST == 07:00 UTC (after fall back)
    const expectedAfter = Temporal.Instant.from('2025-11-16T07:00:00.0Z')
    assert.strictEqual(nextAfter.epochMilliseconds, expectedAfter.epochMilliseconds)
  })

  test('schedule parsing with timezone - Los Angeles PST', () => {
    const schedules = ['2020-04-02T17:00:00[America/Los_Angeles]/P7D']
    const now = Temporal.Instant.from('2021-01-01T00:00:00.0Z')
    const next = meetings.getNextScheduledMeeting(schedules, now)
    const expected = Temporal.Instant.from('2020-12-31T17:00:00.0-08:00')
    assert.strictEqual(next.epochMilliseconds, expected.epochMilliseconds)
  })

  test('schedule parsing with timezone - Los Angeles PDT', () => {
    const schedules = ['2020-04-02T17:00:00[America/Los_Angeles]/P7D']
    const now = Temporal.Instant.from('2021-04-01T00:00:00.0Z')
    const next = meetings.getNextScheduledMeeting(schedules, now)
    const expected = Temporal.Instant.from('2021-04-01T17:00:00.0-07:00')
    assert.strictEqual(next.epochMilliseconds, expected.epochMilliseconds)
  })

  test('schedule format validation', () => {
    const now = Temporal.Instant.from('2021-04-01T00:00:00.0Z')

    const validFormats = [
      '2020-04-02T17:00:00[America/Chicago]/P7D',
      '2020-04-02T17:00:00[Europe/London]/P14D',
      '2020-04-02T17:00:00Z/P7D',
      '2020-04-02T17:00:00[America/Los_Angeles]/P7D'
    ]

    validFormats.forEach(format => {
      const schedules = [format]
      const next = meetings.getNextScheduledMeeting(schedules, now)
      assert(next !== null, `valid format should not throw: ${format}`)
    })

    const invalidFormats = [
      // offset variations
      '2020-04-02T17:00:00-06:00[America/Chicago]/P7D',
      '2020-04-02T17:00:00-0600[America/Chicago]/P7D',
      '2020-04-02T17:00:00-06:00/P7D',
      '2020-04-02T17:00:00-0600/P7D',
      '2020-04-02T17:00:00+06:00/P7D',
      '2020-04-02T17:00:00+0600/P7D',
      '2020-04-02T17:00:00+06:00[America/Chicago]/P7D',
      '2020-04-02T17:00:00+0600[America/Chicago]/P7D',
      '2020-04-02T17:00:00+06:30/P7D',
      '2020-04-02T17:00:00-06:30/P7D',
      '2020-04-02T17:00:00+06:30[America/Chicago]/P7D',
      // no timezone nor UTC specified
      '2020-04-02T17:00:00/P7D',
      // malformed
      '2020-04-02T17:00:00[America/Chicago/P7D'
    ]

    invalidFormats.forEach(format => {
      const schedules = [format]
      assert.throws(() => {
        meetings.getNextScheduledMeeting(schedules, now)
      }, /invalid schedule format/, `invalid format should throw: ${format}`)
    })
  })

  test('schedule parsing errors', () => {
    const now = Temporal.Instant.from('2021-04-01T00:00:00.0Z')

    // invalid timezone identifier
    assert.throws(() => {
      meetings.getNextScheduledMeeting(['2020-04-02T17:00:00[Invalid/Timezone]/P7D'], now)
    }, /invalid schedule format/)

    // invalid date format
    assert.throws(() => {
      meetings.getNextScheduledMeeting(['not-a-date[America/Chicago]/P7D'], now)
    }, /invalid schedule format/)

    // invalid duration format
    assert.throws(() => {
      meetings.getNextScheduledMeeting(['2020-04-02T17:00:00[America/Chicago]/not-a-duration'], now)
    }, /invalid duration/)

    // missing duration
    assert.throws(() => {
      meetings.getNextScheduledMeeting(['2020-04-02T17:00:00[America/Chicago]'], now)
    }, /invalid duration/)

    // empty string
    assert.throws(() => {
      meetings.getNextScheduledMeeting([''], now)
    }, /invalid duration/)
  })
})

test('shorthands transform', async () => {
  templates.values.title = 'Test Meeting'
  templates.values.agendaLabel = 'meeting-agenda'
  templates.values.invitees = '@pkgjs/meet'
  templates.values.observers = '@nodejs/package-maintenance'

  const input = `# <!-- title -->
<!-- agenda label -->
<!-- invitees -->
<!-- observers  -->`

  const output = `# Test Meeting
meeting-agenda
@pkgjs/meet
@nodejs/package-maintenance`

  assert.equal(await convert(input), output)
})
