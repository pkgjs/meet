'use strict'
const core = require('@actions/core')
const github = require('@actions/github')
const list = require('safe-parse-list')
const ejs = require('ejs')
const meetings = require('./lib/meetings')
const issues = require('./lib/issues')
const defaultTemplate = require('./lib/default-template')

;(async function run () {
  try {
    const token = core.getInput('token')

    // variables we use for timing
    const schedules = list(core.getInput('schedules'))
    const createWithin = core.getInput('createWithin')

    // variables we use for labels
    const meetingLabel = core.getInput('meetingLabel')
    const agendaLabel = core.getInput('agendaLabel')

    // variables we use for content
    const issueTitle = core.getInput('issueTitle')
    const issueTemplate = core.getInput('issueTemplate')

    const repo = github.context.repo
    const client = new github.GitHub(token)

    let template = defaultTemplate
    if (issueTemplate) {
      try {
        const tmpl = await issues.getIssueTemplate(client, {
          ...repo,
          template: issueTemplate
        })
        template = ejs.compile(tmpl)
      } catch (e) {
        console.error(`template missing or invalid (${issueTemplate}): ${e.message}`)
      }
    }

    let titleTemplate = issueTitle
    if (issueTemplate) {
      try {
        titleTemplate = ejs.compile(titleTemplate)
      } catch (e) {
        // ignore title template
      }
    }

    const issue = await meetings.createNextMeeting(client, {
      ...repo,
      schedules,
      template,
      meetingLabel,
      createWithin,
      agendaLabel,
      issueTitle: titleTemplate
    })
    if (!issue) {
      return console.log('No issues to create')
    }

    core.setOutput('issueNumber', issue.data.number.toString())
    console.log(`Issue created: (#${issue.data.number}) ${issue.data.title}`)
  } catch (e) {
    console.error(e)
    core.setFailed(e.message)
  }
})()
