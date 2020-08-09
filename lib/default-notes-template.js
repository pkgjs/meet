'use strict'

module.exports = ({ agendaIssues, agendaLabel, owner, repo, issue }) => {
  return `
# ${issue.title}

## Links

  * **Recording**:
  * **GitHub Issue**: https://github.com/${owner}/${repo}/issues/${issue.number}

## Present

  *

## Agenda

## Announcements

*Extracted from **${agendaLabel}** labelled issues and pull requests from the **${owner} org** prior to the meeting.

${agendaIssues.map((i) => {
  return `* ${i.title} [#${i.number}](${i.html_url})`
}).join('\n')}

## Q&A, Other

## Upcoming Meetings

* **Node.js Foundation Calendar**: https://nodejs.org/calendar

Click \`+GoogleCalendar\` at the bottom right to add to your own Google calendar.
`
}
