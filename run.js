'use strict'
const core = require('@actions/core')
const github = require('@actions/github')
const list = require('safe-parse-list')
const ejs = require('ejs')
const meetings = require('./lib/meetings')
const issues = require('./lib/issues')
const notes = require('./lib/notes')
const defaultTemplate = require('./lib/default-template')
const defaultNotesTemplate = require('./lib/default-notes-template')
const conversions = require('./lib/conversions')

;(async function run () {
  try {
    const token = core.getInput('token')

    // variables we use for timing
    const schedules = list(core.getInput('schedules'))
    const createWithin = core.getInput('createWithin')

    // variables we use for labels
    const meetingLabels = core.getInput('meetingLabels')
    const agendaLabel = core.getInput('agendaLabel')

    // variables we use for content
    const issueTitle = core.getInput('issueTitle')
    const issueTemplate = core.getInput('issueTemplate')

    // variables we use for notes
    const createNotes = core.getInput('createNotes')
    const notesUserTemplate = core.getInput('notesTemplate')

    const repo = github.context.repo
    const client = new github.GitHub(token)

    let template = defaultTemplate

    // if we have a user-provided issue template, try to get it
    // and then if it exists reassign template variable from the
    // default to the user-provided template
    if (issueTemplate) {
      try {
        const userProvidedIssueTemplate = await issues.stringifiedIssueTemplate(client, {
          ...repo,
          template: issueTemplate
        })
        template = conversions.covnert(userProvidedIssueTemplate)
        template = ejs.compile(userProvidedIssueTemplate)
      } catch (error) {
        console.error(`template missing or invalid (${issueTemplate}): ${error.message}`)
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

    const agendaIssues = (await client.issues.listForRepo({
      owner: repo.owner,
      repo: repo.repo,
      state: 'open',
      labels: agendaLabel
    })).data || []
    const opts = {
      ...repo,
      schedules,
      meetingLabels,
      createWithin,
      agendaLabel,
      agendaIssues,
      issueTitle: titleTemplate
    }

    const issue = await meetings.createNextMeeting(client, { ...opts, template })
    if (!issue) {
      return console.log('No issues to create')
    }

    const issueNumber = issue.data.number
    core.setOutput('issueNumber', issueNumber.toString())
    console.log(`Issue created: (#${issueNumber}) ${issue.data.title}`)

    opts.issue = issue.data

    if (createNotes === true || createNotes === 'true') {
      let notesTemplate = defaultNotesTemplate
      if (notesUserTemplate) {
        try {
          const tmpl = await notes.getNotesTemplate(client, {
            ...repo,
            notesUserTemplate
          })
          notesTemplate = ejs.compile(tmpl)
        } catch (e) {
          console.error(`notesTemplate missing or invalid (${notesUserTemplate}): ${e.message}`)
        }
      }
      opts.meetingNotes = await notes.create(notesTemplate, opts)
      console.log(`Notes created: ${opts.meetingNotes}`)
    }

    const updatedIssue = await meetings.setMeetingIssueBody(client, { ...opts, template })
    if (!updatedIssue) {
      return console.log('No issues to update')
    } else {
      return console.log('Issue updated successfully')
    }
  } catch (e) {
    console.error(e)
    core.setFailed(e.message)
  }
})()
