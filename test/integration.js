'use strict'
require('dotenv').config()
const { suite, test, before } = require('mocha')
const assert = require('assert')
/* global Temporal */
if (!global.Temporal) {
  const polyfill = require('@js-temporal/polyfill')
  global.Temporal = polyfill.Temporal
}
const { getOctokit } = require('@actions/github')
const pkg = require('../package.json')
const meetings = require('../lib/meetings')

const mainRepo = 'pkgjs/meet'

function getTestRepo () {
  let testRepo = { owner: 'wesleytodd', repo: 'meeting-maker' } // ✨ Wes, the meeting maker ✨

  if (process.env.GITHUB_REPOSITORY) {
    // we appear to be in a GH action
    if (process.env.GITHUB_REPOSITORY !== mainRepo) {
      // action running in a fork
      const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')
      testRepo = { owner, repo }
    } else if (process.env.GITHUB_HEAD_REPO &&
               process.env.GITHUB_HEAD_REPO !== mainRepo) {
      // action running in a fork PR targeting main repo
      // skip tests - GH token doesn't have write permissions for either repo
      throw new Error('skipping integration tests: fork PR targeting main repo (no permissions)')
    }
  }

  console.log(`using repository ${testRepo.owner}/${testRepo.repo}`)
  return testRepo
}

suite(`${pkg.name} integration`, () => {
  let client
  let testRepo

  before(() => {
    const token = process.env.GITHUB_TOKEN
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required for integration tests')
    }

    client = getOctokit(token)
    testRepo = getTestRepo()
  })

  test('should create next meeting issue', async () => {
    const issue = await meetings.shouldCreateNextMeetingIssue(client, {
      owner: testRepo.owner,
      repo: testRepo.repo,
      issueTitle: ({ date }) => `Test Meeting ${date.toZonedDateTimeISO('UTC').toPlainDate().toString()}`,
      createWithin: 'P7D',
      agendaLabel: 'meeting-agenda',
      schedules: [
        // 1pm GMT April 16 repeating every 28 days
        '2020-04-16T13:00:00.0Z/P28D'
      ],
      now: Temporal.Instant.from('2020-04-13T13:00:00.0Z'),
      meetingLabels: ['testMeeting', 'test']
    })
    assert.deepStrictEqual(issue.owner, testRepo.owner)
    assert.deepStrictEqual(issue.repo, testRepo.repo)
    assert.deepStrictEqual(issue.title, `Test Meeting ${Temporal.Instant.from('2020-04-16T13:00:00.0Z').toZonedDateTimeISO('UTC').toPlainDate().toString()}`)
    assert.deepStrictEqual(issue.agendaLabel, 'meeting-agenda')
    assert.deepStrictEqual(issue.labels, ['testMeeting', 'test'])
    assert(typeof issue.body === 'string')
    assert(Array.isArray(issue.agendaIssues))
  })

  test('create next meeting issue', async () => {
    const issue = await meetings.createNextMeeting(client, {
      owner: testRepo.owner,
      repo: testRepo.repo,
      createWithin: 'P7D',
      schedules: [
        // 5pm GMT April 2 repeating every 28 days
        '2020-04-02T17:00:00.0Z/P28D',

        // 1pm GMT April 16 repeating every 28 days
        '2020-04-16T13:00:00.0Z/P28D'
      ],
      now: Temporal.Instant.from('2020-04-13T13:00:00.0Z'),
      issueTitle: ({ date }) => `Test Meeting ${date.toZonedDateTimeISO('UTC').toPlainDate().toString()}`,
      meetingLabels: ['testMeeting', 'test']
    })

    assert.deepStrictEqual(issue.data.title, `Test Meeting ${Temporal.Instant.from('2020-04-16T13:00:00.0Z').toZonedDateTimeISO('UTC').toPlainDate().toString()}`)
    assert.deepStrictEqual(issue.data.state, 'open')

    await client.rest.issues.update({
      owner: testRepo.owner,
      repo: testRepo.repo,
      issue_number: issue.data.number,
      state: 'closed'
    })
  })
})
