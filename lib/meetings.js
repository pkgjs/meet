'use strict'
const { DateTime, Duration } = require('luxon')
const issues = require('./issues')

module.exports.createNextMeeting = async function (client, opts) {
  const meetingToCreate = await shouldCreateNextMeetingIssue(client, opts)
  if (!meetingToCreate) {
    return
  }

  return issues.create(client, meetingToCreate)
}

module.exports.setMeetingIssueBody = async function (client, opts) {
  const issue = getNextIssue(opts)
  issue.body = typeof opts.template === 'function' ? opts.template(issue) : opts.template
  return issues.update(client, issue)
}

function getNextIssue (opts) {
  const now = opts.now || DateTime.utc()
  const date = getNextScheduledMeeting(opts.schedules, now, opts.timezone)
  const title = typeof opts.issueTitle === 'function' ? opts.issueTitle({ date }) : opts.issueTitle

  const issue = {
    owner: opts.owner,
    repo: opts.repo,
    title,
    date,
    agendaLabel: opts.agendaLabel,
    agendaIssues: opts.agendaIssues,
    meetingLink: opts.meetingLink,
    labels: opts.meetingLabels,
    meetingNotes: opts.meetingNotes || '',
    issue_number: (opts.issue || {}).number || null,
    body: ''
  }
  return issue
}

const shouldCreateNextMeetingIssue = module.exports.shouldCreateNextMeetingIssue = async function (client, opts = {}) {
  const now = opts.now || DateTime.utc()
  const createWithin = Duration.fromISO(opts.createWithin)
  const issue = getNextIssue(opts)
  const { date: next, title: nextIssueTitle } = issue

  // Further out than the create within limit
  if (next > now.plus(createWithin)) {
    return false
  }

  const meetings = await issues.getMeetingIssues(client, {
    owner: opts.owner,
    repo: opts.repo,
    meetingLabels: opts.meetingLabels
  })

  console.log(`Checking for meeting titled ${nextIssueTitle}`)
  const shouldCreate = meetings.find((i) => {
    console.log(`Found meeting issue ${i.title}`)
    return i.title === nextIssueTitle
  })
  if (shouldCreate) {
    console.log(`Found existing meeting issue: #${shouldCreate.number}`)
    return false
  }
  console.log('No existing meeting issues found')

  // Load issues for agenda
  return issue
}

const getNextScheduledMeeting = module.exports.getNextScheduledMeeting = function (schedules = [], now = DateTime.utc(), zone = undefined) {
  return schedules
    .map((s = `${now}/P7D`) => {
      const [start, period] = s.split('/')
      const d = Duration.fromISO(period)
      let next = DateTime.fromISO(start, { zone })

      while (next < now) {
        next = next.plus(d)
      }

      return next
    }).sort().shift()
}
