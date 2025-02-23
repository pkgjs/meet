'use strict'

module.exports = ({ date, agendaIssues, agendaLabel, meetingNotes, owner, repo, meetingLink }) => {
  return `
## Date/Time

| Timezone | Date/Time |
|----------|-----------|
${[
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
].map((zone) => {
  return `| ${zone} | ${date.setZone(zone).toFormat('EEE dd-MMM-yyyy HH:mm (hh:mm a)')} |`
}).join('\n')}

Or in your local time:
* https://www.timeanddate.com/worldclock/?iso=${date.toFormat("yyyy-MM-dd'T'HH:mm:ss")}

## Agenda

Extracted from **${agendaLabel}** labelled issues and pull requests from **${owner}/${repo}** prior to the meeting.

${agendaIssues.map((i) => {
  return `* ${i.title} [#${i.number}](${i.html_url})`
}).join('\n')}

## Links

* Minutes: ${meetingNotes || ''}

### Joining the meeting

* link for participants: ${meetingLink || ''}
* For those who just want to watch:`
}
