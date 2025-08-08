'use strict'

const { suite, test, before } = require('mocha')
const assert = require('assert')
const agenda = require('../lib/agenda')

suite('agenda/issues integration', () => {
  let client

  before(async () => {
    const { Octokit } = await import('@octokit/rest')
    client = new Octokit()
  })

  test('should fetch issues and PRs from wesleytodd/meeting-maker repo without duplicates', async () => {
    const agendaLabel = 'meeting-agenda-test'
    const repos = [{ owner: 'wesleytodd', repo: 'meeting-maker' }]

    const agendaIssues = await agenda.fetchAgendaItems(client, repos, agendaLabel)

    assert(Array.isArray(agendaIssues), 'agendaIssues should be an array')

    const urls = agendaIssues.map(item => item.url)
    const uniqueUrls = [...new Set(urls)]
    assert.strictEqual(urls.length, uniqueUrls.length, 'should have no duplicate URLs')

    for (const item of agendaIssues) {
      assert(item.url.includes('wesleytodd/meeting-maker'),
        `all issues should be from wesleytodd/meeting-maker, found: ${item.url}`)
    }

    for (const item of agendaIssues) {
      const hasAgendaLabel = item.labels && item.labels.some(label => label.name === agendaLabel)
      assert(hasAgendaLabel, `all issues should have the '${agendaLabel}' label`)
    }

    for (const item of agendaIssues) {
      assert.strictEqual(item.state, 'open', 'all issues should be open')
    }

    const issueCount = agendaIssues.filter(i => !i.pull_request).length
    const prCount = agendaIssues.filter(i => i.pull_request).length

    // relaxed assertions here so the test isn't too brittle
    assert.ok(issueCount >= 2, 'should have at least 2 issues')
    assert.ok(prCount >= 1, 'should have at least 1 PR')
  })
})
