'use strict'

module.exports.create = async function (client, issue) {
  console.log(`Creating issue ${issue.owner}/${issue.repo}#${issue.labels}`)
  const resp = await client.rest.issues.create({
    owner: issue.owner,
    repo: issue.repo,
    title: issue.title,
    body: issue.body,
    labels: Array.isArray(issue.labels) ? issue.labels : issue.labels.split(',').map((i) => i.trim())
  })

  return resp
}

module.exports.update = async function (client, issue) {
  const resp = await client.rest.issues.update({
    owner: issue.owner,
    repo: issue.repo,
    issue_number: issue.issue_number,
    body: issue.body
  })

  return resp
}

module.exports.getMeetingIssues = async function (client, opts) {
  console.log(`Checking for meeting issues ${opts.owner}/${opts.repo}#${opts.meetingLabels}`)
  const resp = await client.paginate('GET /repos/{owner}/{repo}/issues', {
    owner: opts.owner,
    repo: opts.repo,
    state: 'open',
    labels: opts.meetingLabels
  })

  return resp
}

module.exports.stringifiedIssueTemplate = async function stringifiedIssueTemplate (client, options) {
  // fetch the markdown template that we're going to build the meeting issue from
  const response = await client.rest.repos.getContent({
    owner: options.owner,
    repo: options.repo,
    path: `.github/ISSUE_TEMPLATE/${options.template}`,
    ref: options.ref || 'main'
  })

  // check that we're not trying to parse a file that doesn't exist. If we are, throw.
  if (validateThatIssueTemplateExists(response.status) === false) {
    throw new Error('The template that we attempted to fetch (defined by the issueTemplate property, defaulting to ./ISSUE_TEMPLATES/meeting.yml) did not exist.')
  }

  // create a Buffer from the GitHub API's response to us and convert it into a string that we'll pass to ejs
  return Buffer.from(response.data.content, response.data.encoding).toString()
}

module.exports.closeIssue = async function closeIssue (client, number, opts) {
  const resp = await client.rest.issues.update({
    owner: opts.owner,
    repo: opts.repo,
    issue_number: number,
    state: 'closed'
  })
  return resp.data
}

// Validates that the status code of the issue we're fetching
// is not a 404 - i.e. it exists within the GitHub repo.
//
// Only used within this file, so there's no need to export.
async function validateThatIssueTemplateExists (statusCode) {
  if (statusCode === 404) {
    return false // TODO: we may want to make it so we're not returning a boolean or a buffer from this method
  }

  return true
}
