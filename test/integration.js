'use strict'
/* global Temporal */
require('dotenv').config()
const { suite, test, before } = require('mocha')
const assert = require('assert')
if (!global.Temporal) {
  const polyfill = require('@js-temporal/polyfill')
  global.Temporal = polyfill.Temporal
}
const { getOctokit } = require('@actions/github')
const pkg = require('../package.json')
const meetings = require('../lib/meetings')

suite(`${pkg.name} integration`, () => {
  let client
  before(() => {
    client = getOctokit(process.env.GITHUB_TOKEN)
  })
  test('should create next meeting issue', async () => {
    const issue = await meetings.shouldCreateNextMeetingIssue(client, {
      owner: 'wesleytodd',
      repo: 'meeting-maker',
      issueTitle: (date) => `Test Meeting ${date.toZonedDateTimeISO('UTC').toPlainDate().toString()}`,
      schedules: [
        // 1pm GMT April 16 repeating every 28 days
        '2020-04-16T13:00:00.0Z/P28D'
      ],
      now: Temporal.Instant.from('2020-04-13T13:00:00.0Z')
    })
    assert.deepStrictEqual(issue.owner, 'wesleytodd')
    assert.deepStrictEqual(issue.repo, 'meeting-maker')
    assert.deepStrictEqual(issue.title, `Test Meeting ${Temporal.Instant.from('2020-04-16T13:00:00.0Z').toZonedDateTimeISO('UTC').toPlainDate().toString()}`)
    assert.deepStrictEqual(issue.agendaLabel, 'meeting-agenda')
    assert.deepStrictEqual(issue.meetingLabels, ['testMeeting, test'])
    assert(typeof issue.body === 'string')
    assert(Array.isArray(issue.agendaIssues))
  })

  test('create next meeting issue', async () => {
    const issue = await meetings.createNextMeeting(client, {
      owner: 'wesleytodd',
      repo: 'meeting-maker',
      schedules: [
        // 5pm GMT April 2 repeating every 28 days
        '2020-04-02T17:00:00.0Z/P28D',

        // 1pm GMT April 16 repeating every 28 days
        '2020-04-16T13:00:00.0Z/P28D'
      ],
      now: Temporal.Instant.from('2020-04-13T13:00:00.0Z'),
      issueTitle: (date) => `Test Meeting ${date.toZonedDateTimeISO('UTC').toPlainDate().toString()}`,
      labels: ['testMeeting', 'test']
    })

    assert.deepStrictEqual(issue.data.title, `Test Meeting ${Temporal.Instant.from('2020-04-16T13:00:00.0Z').toZonedDateTimeISO('UTC').toPlainDate().toString()}`)
    assert.deepStrictEqual(issue.data.state, 'open')

    await client.rest.issues.update({
      owner: 'wesleytodd',
      repo: 'meeting-maker',
      issue_number: issue.data.number,
      state: 'closed'
    })
  })
})
