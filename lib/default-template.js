'use strict'

module.exports = ({ date, agendaIssues, agendaLabel, meetingNotes, owner, repo, meetingLink }) => {
  const timezones = [
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'Europe/London',
    'Europe/Amsterdam',
    'Europe/Moscow',
    'Asia/Kolkata',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Australia/Sydney'
  ]

  return `
## Date/Time

| Timezone | Date/Time |
|----------|-----------|
${timezones.map((zone) => {
  const zonedDate = date.toZonedDateTimeISO(zone)
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: zone
  })
  const formattedDate = formatter.format(new Date(zonedDate.epochMilliseconds))
  return `| ${zone} | ${formattedDate} |`
}).join('\n')}

Or in your local time:

* https://www.timeanddate.com/worldclock/?iso=${date.toZonedDateTimeISO('UTC').toPlainDateTime().toString()}

## Agenda

Extracted from **${agendaLabel}** labelled issues and pull requests from **${owner}/${repo}** prior to the meeting.

${agendaIssues.map((i) => {
  return `* ${i.html_url}`
}).join('\n')}

## Links

* Minutes: ${meetingNotes || ''}

## Joining the meeting

* link for participants: ${meetingLink || ''}

---

Please use the following emoji reactions in this post to indicate your
availability.

* 👍 - Attending
* 👎 - Not attending
* 😕 - Not sure yet`
}
