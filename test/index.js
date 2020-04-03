'use strict'
const { suite, test } = require('mocha')
const assert = require('assert')
const { DateTime } = require('luxon')
const pkg = require('../package.json')
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
})
