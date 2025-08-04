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
const pkg = require('./package.json')

;(async function run () {
  console.log(`Version: ${pkg.version}`)
  try {
    const token = core.getInput('token')
    const client = new github.GitHub(token)

    // variables we use for timing
    const schedules = list(core.getInput('schedules'))
    const createWithin = core.getInput('createWithin')

    // variables we use for labels
    const agendaLabel = core.getInput('agendaLabel')
    const meetingLabels = core.getInput('meetingLabels')

    // variables we use for content
    const issueTitle = core.getInput('issueTitle')
    const issueTemplate = core.getInput('issueTemplate')

    // variables we use for notes
    const createNotes = core.getInput('createNotes')
    const notesUserTemplate = core.getInput('notesTemplate')

    const meetingLink = core.getInput('meetingLink')

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
        console.log(`Fetching repos for ${org}`)
        const resp = await client.paginate('GET /orgs/{org}/repos', { org })
        resp.forEach((r) => {
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
          template: issueTemplate,
          ref: github.context.payload?.pull_request?.head?.ref || github.context.payload?.repository?.default_branch || 'main'
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

    const agendaIssues = []
    for (const r of repos) {
      const _agendaIssues = await client.paginate('GET /repos/{owner}/{repo}/issues', {
        owner: r.owner,
        repo: r.repo,
        state: 'open',
        labels: agendaLabel
      })
      console.log(`Fetching issues for ${r.owner}/${r.repo}: Found ${_agendaIssues.length}`)
      for (const i of _agendaIssues) {
        console.log(`Adding Issue: ${i.url}`)
        if (!agendaIssues.find((ii) => ii.url === i.url)) {
          agendaIssues.push(i)
        }
      }
    }
    console.log(`Found ${agendaIssues.length} total issues for agenda`)

    const opts = {
      ...repo,
      schedules,
      meetingLabels,
      createWithin,
      agendaLabel,
      meetingLink,
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
      if (opts.meetingNotes) {
        console.log(`notes created: ${opts.meetingNotes}`)
      } else {
        console.log('notes creation failed; continuing without notes')
      }
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
