'use strict'
const core = require('@actions/core')
const { getOctokit, context } = require('@actions/github')
const { graphql } = require('@octokit/graphql')
const list = require('safe-parse-list')
const ejs = require('ejs')
const meetings = require('./lib/meetings')
const issues = require('./lib/issues')
const notes = require('./lib/notes')
const defaultTemplate = require('./lib/default-template')
const defaultNotesTemplate = require('./lib/default-notes-template')
const conversions = require('./lib/conversions')
const agenda = require('./lib/agenda')
const pkg = require('./package.json')

;(async function run () {
  console.log(`Version: ${pkg.version}`)
  try {
    const token = core.getInput('token')
    const client = getOctokit(token)

    // variables we use for timing
    const schedules = list(core.getInput('schedules'))
    const createWithin = core.getInput('createWithin')
    const timezone = core.getInput('timezone')

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
    const repo = context.repo
    if (repos) {
      repos = repos.split(',').map((str) => {
        const parts = str.trim().split('/')
        return {
          owner: parts[0],
          repo: parts[1]
        }
      })
    } else {
      repos = [context.repo]
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
          ref: context.payload?.pull_request?.head?.ref || context.payload?.repository?.default_branch || 'main'
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

    const agendaIssues = await agenda.fetchAgendaItems(client, repos, agendaLabel)
  
    for (const r of repos) {
      let hasNextPage = true
      let endCursor = null
      do {
        const query = `
          query($owner: String!, $name: String!, $after: String) {
            repository(owner: $owner, name: $name) {
              discussions(first: 100, after: $after) {
                pageInfo {
                  endCursor
                  hasNextPage
                }
                edges {
                  cursor
                  node {
                    id
                    title
                    url
                    labels(first: 10) {
                      nodes {
                        color
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        `
        const variables = {
          owner: r.owner,
          name: r.repo,
          after: endCursor
        }
        const _agendaDiscussions = await graphql(query, {
          ...variables,
          headers: {
            authorization: `token ${token}`
          }
        })
        const discussions = _agendaDiscussions?.repository?.discussions
        if (discussions) {
          const { edges, pageInfo } = discussions
          for (const edge of edges) {
            const labels = edge.node?.labels.nodes
            if (Array.isArray(labels) && labels.some(label => label.name === agendaLabel)) {
              console.log(`Adding Discussion: ${edge.node.url}`)
              agendaIssues.push({
                id: edge.node.id,
                html_url: edge.node.url,
                title: edge.node.title
              })
            }
          }
          hasNextPage = pageInfo.hasNextPage
          endCursor = pageInfo.endCursor
        } else {
          hasNextPage = false
        }
      } while (hasNextPage)
    }

    console.log(`Found ${agendaIssues.length} total issues for agenda`)

    const opts = {
      ...repo,
      schedules,
      timezone,
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
