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
    const client = new github.GitHub(token)

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

    // Get list of repos
    let repos = core.getInput('repos')
    const repo = github.context.repo
    if (repos) {
      repos = repos.split(',').map((str) => {
        const parts = str.trim().split('/')
        return {
          owner: parts[0],
          repo: parts[1]
        }
      })
    } else {
      repos = [github.context.repo]
    }

    // Get repos from orgs
    let orgs = core.getInput('orgs')
    if (orgs) {
      orgs = orgs.split(',').map((o) => o.trim())
      for (const org of orgs) {
        const resp = await client.repos.listForOrg({ org })
        resp.data.forEach((r) => {
          repos.push({
            owner: org,
            repo: r.name
          })
        })
      }
    }

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
        template = conversions.convert(userProvidedIssueTemplate)
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

    let agendaIssues = []
    for (const r of repos) {
      const _agendaIssues = (await client.issues.listForRepo({
        owner: r.owner,
        repo: r.repo,
        state: 'open',
        labels: agendaLabel
      })).data || []
      agendaIssues = agendaIssues.concat(_agendaIssues)
    }
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
