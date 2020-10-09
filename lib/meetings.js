'use strict'
const { DateTime, Interval, Duration } = require('luxon')
const issues = require('./issues')

module.exports.createNextMeeting = async function (client, opts) {
  const meetingToCreate = await shouldCreateNextMeetingIssue(client, opts)
  if (!meetingToCreate) {
    return
  }

  return issues.create(client, meetingToCreate)
}

const shouldCreateNextMeetingIssue = module.exports.shouldCreateNextMeetingIssue = async function (client, opts = {}) {
  const now = opts.now || DateTime.utc()
  const createWithin = Duration.fromISO(opts.createWithin)
  const next = getNextScheduledMeeting(opts.schedules, now)

  // Further out than the create within limit
  if (next > now.plus(createWithin)) {
    return false
  }

  const meetings = await issues.getMeetingIssues(client, {
    owner: opts.owner,
    repo: opts.repo,
    label: opts.labels
  })

  const nextIssueTitle = typeof opts.issueTitle === 'function' ? opts.issueTitle({ date: next }) : opts.issueTitle
  const shouldCreate = !meetings.find((i) => {
    return i.title === nextIssueTitle
  })
  if (!shouldCreate) {
    return false
  }

  // Load issues for agenda
  const agendaLabel = opts.agendaLabel
  const agendaResp = await client.issues.listForRepo({
    owner: opts.owner,
    repo: opts.repo,
    state: 'open',
    labels: agendaLabel
  })

  const issue = {
    owner: opts.owner,
    repo: opts.repo,
    title: nextIssueTitle,
    date: next,
    agendaLabel: agendaLabel,
    agendaIssues: agendaResp.data,
    labels: opts.labels,
    body: null
  }
  issue.body = typeof opts.template === 'function' ? opts.template(issue) : opts.template
  return issue
}

const getNextScheduledMeeting = module.exports.getNextScheduledMeeting = function (schedules = [], now = DateTime.utc()) {
  return schedules
    .map((s = `${now}/P7D`) => {
      // Parse interval
      const i = Interval.fromISO(s)
      const d = i.toDuration()

      // Get datetime for next event after now
      let next = i.s
      while (next < now) {
        next = next.plus(d)
      }

      return next
    }).sort().shift()
}
