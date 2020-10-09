'use strict'
require('dotenv').config()
const { suite, test, before } = require('mocha')
const assert = require('assert')
const { DateTime } = require('luxon')
const github = require('@actions/github')
const pkg = require('../package.json')
const meetings = require('../lib/meetings')

suite(`${pkg.name} integration`, () => {
  let client
  before(() => {
    client = new github.GitHub(process.env.GITHUB_TOKEN)
  })
  test('should create next meeting issue', async () => {
    const issue = await meetings.shouldCreateNextMeetingIssue(client, {
      owner: 'wesleytodd',
      repo: 'meeting-maker',
      issueTitle: (date) => `Test Meeting ${date.toFormat('yyyy-MM-dd')}`,
      schedules: [
        // 1pm GMT April 16 repeating every 28 days
        '2020-04-16T13:00:00.0Z/P28D'
      ],
      now: DateTime.fromISO('2020-04-13T13:00:00.0Z')
    })
    assert.deepStrictEqual(issue.owner, 'wesleytodd')
    assert.deepStrictEqual(issue.repo, 'meeting-maker')
    assert.deepStrictEqual(issue.title, `Test Meeting ${DateTime.fromISO('2020-04-16T13:00:00.0Z').toFormat('yyyy-MM-dd')}`)
    assert.deepStrictEqual(issue.agendaLabel, 'meeting-agenda')
    assert.deepStrictEqual(issue.meetingLabel, ['meeting'])
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
      now: DateTime.fromISO('2020-04-13T13:00:00.0Z'),
      issueTitle: (date) => `Test Meeting ${date.toFormat('yyyy-MM-dd')}`,
      meetingLabel: ['testMeeting']
    })

    assert.deepStrictEqual(issue.data.title, `Test Meeting ${DateTime.fromISO('2020-04-16T13:00:00.0Z').toFormat('yyyy-MM-dd')}`)
    assert.deepStrictEqual(issue.data.state, 'open')

    client.issues.update({
      owner: 'wesleytodd',
      repo: 'meeting-maker',
      issue_number: issue.data.number,
      state: 'closed'
    })
  })
})
