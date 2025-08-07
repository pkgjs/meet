'use strict'
/* global Temporal */
const fs = require('fs')
const path = require('path')
const ejs = require('ejs')
const { suite, test } = require('mocha')
const assert = require('assert')
if (!global.Temporal) {
  const polyfill = require('@js-temporal/polyfill')
  global.Temporal = polyfill.Temporal
}

const testData = {
  date: Temporal.Instant.from('2024-01-01T12:00:00Z'),
  agendaIssues: [
    { html_url: 'https://example.com/issue/1', title: 'issue 1' },
    { html_url: 'https://example.com/issue/2', title: 'issue 2' }
  ],
  agendaLabel: 'meeting-agenda',
  meetingNotes: 'https://example.com/notes',
  owner: 'test-owner',
  repo: 'test-repo',
  meetingLink: 'https://meet.example.com',
  title: 'Ye Olde Meetinge'
}

const readme = fs.readFileSync(path.join(__dirname, '../README.md'), 'utf8')
const defaultTemplate = require('../lib/default-template')
const mdTemplate = fs.readFileSync(path.join(__dirname, '../.github/ISSUE_TEMPLATE/meeting.md'), 'utf8')

const compiledMd = ejs.render(mdTemplate, testData)
const compiledDefault = defaultTemplate(testData)
const readmeTemplate = getReadmeTemplate()

suite('template consistency', () => {
  test('default template should match md template', () => {
    const normalizedMd = normalizeOutput(compiledMd)
    const normalizedDefault = normalizeOutput(compiledDefault)

    assert.strictEqual(normalizedMd, normalizedDefault)
  })

  test('readme template should match md template', () => {
    const normalizedReadme = normalizeOutput(readmeTemplate)
    const normalizedMd = normalizeOutput(mdTemplate)

    assert.strictEqual(normalizedReadme, normalizedMd)
  })
})

function normalizeOutput (content) {
  return content.trim()
}

function getReadmeTemplate () {
  const ejsStart = readme.indexOf('```ejs')
  const ejsEnd = readme.indexOf('```', ejsStart + 6)

  if (ejsStart < 0 || ejsEnd < 0) {
    throw new Error('couldn\'t find ejs template section in readme')
  }

  return readme.substring(ejsStart + 6, ejsEnd)
}
