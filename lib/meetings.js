'use strict'
/* global Temporal */
if (!global.Temporal) {
  const polyfill = require('@js-temporal/polyfill')
  global.Temporal = polyfill.Temporal
}
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
  const now = opts.now || Temporal.Now.instant()
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
  const now = opts.now || Temporal.Now.instant()
  const createWithin = Temporal.Duration.from(opts.createWithin)
  const issue = getNextIssue(opts)
  const { date: next, title: nextIssueTitle } = issue

  // Further out than the create within limit
  const zonedNow = now.toZonedDateTimeISO('UTC')
  const zonedNext = next.toZonedDateTimeISO('UTC')
  if (zonedNext.epochMilliseconds > zonedNow.add(createWithin).epochMilliseconds) {
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

const getNextScheduledMeeting = module.exports.getNextScheduledMeeting = function (schedules = [], now = Temporal.Now.instant(), timezone) {
  return schedules
    .map((s = `${now}/P7D`) => {
      // Parse interval
      const [startStr, durationStr] = s.split('/')
      const duration = Temporal.Duration.from(durationStr)
      let next

      if (timezone) {
        // parse as local in specified tz
        try {
          const zonedStart = Temporal.ZonedDateTime.from(`${startStr}[${timezone}]`)
          next = zonedStart.toInstant()
        } catch (e) {
          console.warn(`invalid timezone '${timezone}'; using UTC`)
          console.error(e) // s/b caused by invalid timezone but log error just in case for troubleshooting
        }
      }

      if (!next) {
        // parse as UTC
        next = Temporal.Instant.from(startStr)
      }

      // Get datetime for next event after now
      while (next.epochMilliseconds <= now.epochMilliseconds) {
        const zonedNext = next.toZonedDateTimeISO(timezone || 'UTC')
        next = zonedNext.add(duration).toInstant()
      }

      return next
    }).sort((a, b) => a.epochMilliseconds - b.epochMilliseconds).shift()
}
