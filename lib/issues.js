'use strict'

module.exports.create = async function (client, issue) {
  const resp = await client.issues.create({
    owner: issue.owner,
    repo: issue.repo,
    title: issue.title,
    body: issue.body,
    labels: issue.meetingLabels
  })

  return resp
}

module.exports.update = async function (client, issue) {
  const resp = await client.issues.update({
    owner: issue.owner,
    repo: issue.repo,
    issue_number: issue.issue_number,
    body: issue.body
  })

  return resp
}

module.exports.getMeetingIssues = async function (client, opts) {
  const resp = await client.issues.listForRepo({
    owner: opts.owner,
    repo: opts.repo,
    state: 'open',
    labels: opts.meetingLabels
  })

  return resp.data
}

module.exports.checkIfIssueTemplateExists = async function checkIfIssueTemplateExists (client, options) {
  const response = await client.repos.getContents({
    owner: options.owner,
    repo: options.repo,
    path: `.github/ISSUE_TEMPLATE/${options.template}`
  })
  if (response.statusCode === 404) {
    return false // TODO: we may want to make it so we're not returning a boolean or a buffer from this method
  }
  return Buffer.from(response.data.content, response.data.encoding).toString()
}

module.exports.closeIssue = async function closeIssue (client, number, opts) {
  const resp = client.issues.update({
    owner: opts.owner,
    repo: opts.repo,
    issue_number: number,
    state: 'closed'
  })
  return resp.data
}
