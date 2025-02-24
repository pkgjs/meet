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
  const date = getNextScheduledMeeting(opts.schedules, now)
  const title = typeof opts.issueTitle === 'function' ? opts.issueTitle({ date }) : opts.issueTitle

  const issue = {
    owner: opts.owner,
    repo: opts.repo,
    title,
    date,
    agendaLabel: opts.agendaLabel,
    agendaIssues: opts.agendaIssues || [],
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

const INVALID_MESSAGE = 'invalid schedule format'
const GUIDANCE_MESSAGE = 'use either a timezone identifier (e.g., 2020-04-02T17:00:00[America/Chicago]) or UTC (e.g., 2020-04-02T17:00:00Z)'

function parseScheduleString (scheduleStr) {
  const lastSlashIndex = scheduleStr.lastIndexOf('/')
  const startStr = scheduleStr.substring(0, lastSlashIndex)
  const durationStr = scheduleStr.substring(lastSlashIndex + 1)

  return {
    startStr,
    duration: Temporal.Duration.from(durationStr)
  }
}

function parseDateAndTimezone (startStr) {
  const hasOffset = /[+-]\d{2}:?\d{2}/.test(startStr)
  const hasTimezone = /\[[^\]]+\]/.test(startStr)
  const hasUTC = /Z$/.test(startStr)
  let instant, timezone

  if (hasOffset) {
    throw new Error(`${INVALID_MESSAGE} '${startStr}': offset usage is not allowed because it's ambiguous. ${GUIDANCE_MESSAGE}`)
  }

  if (!hasTimezone && !hasUTC) {
    throw new Error(`${INVALID_MESSAGE} '${startStr}': ${GUIDANCE_MESSAGE}`)
  }

  try {
    if (hasTimezone) {
      const zonedStart = Temporal.ZonedDateTime.from(startStr)
      instant = zonedStart.toInstant()
      timezone = zonedStart.timeZoneId
    } else {
      instant = Temporal.Instant.from(startStr)
      timezone = 'UTC'
    }
  } catch (error) {
    throw new RangeError(`${INVALID_MESSAGE} '${startStr}': ${GUIDANCE_MESSAGE}`, { cause: error })
  }

  return { instant, timezone }
}

function getNextOccurrence (startInstant, timezone, duration, now) {
  let next = startInstant

  while (next.epochMilliseconds <= now.epochMilliseconds) {
    const zonedNext = next.toZonedDateTimeISO(timezone)
    next = zonedNext.add(duration).toInstant()
  }

  return next
}

const getNextScheduledMeeting = module.exports.getNextScheduledMeeting = function (schedules = [], now = Temporal.Now.instant()) {
  return schedules
    .map((scheduleStr = `${now}/P7D`) => {
      const { startStr, duration } = parseScheduleString(scheduleStr)
      const { instant, timezone } = parseDateAndTimezone(startStr)
      return getNextOccurrence(instant, timezone, duration, now)
    })
    .sort((a, b) => a.epochMilliseconds - b.epochMilliseconds)
    .shift()
}
