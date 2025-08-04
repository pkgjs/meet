'use strict'
const { suite, test } = require('mocha')
const assert = require('assert')
const { DateTime } = require('luxon')
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
    ], DateTime.fromISO('2020-04-03T13:00:00.0Z'))

    assert.deepStrictEqual(next.toISO(), DateTime.fromISO('2020-04-16T13:00:00.0Z').toISO())
  })

  test('process schedule with zone', () => {
    const next = meetings.getNextScheduledMeeting(
      ['2020-04-02T17:00:00/P7D'],
      DateTime.fromISO('2021-01-01T00:00:00.0Z'),
      'America/Los_Angeles'
    )

    assert.deepStrictEqual(next.toISO(), DateTime.fromISO('2020-12-31T16:00:00.000-08:00').toISO())
  })

  test('process schedule with zone in DST', () => {
    const next = meetings.getNextScheduledMeeting(
      ['2020-04-02T17:00:00/P7D'],
      DateTime.fromISO('2021-04-01T00:00:00.0Z'),
      'America/Los_Angeles'
    )

    assert.deepStrictEqual(next.toISO(), DateTime.fromISO('2021-04-01T17:00:00.000-07:00').toISO())
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
