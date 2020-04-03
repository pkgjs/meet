'use strict'

module.exports.create = async function (client, issue) {
  const resp = await client.issues.create({
    owner: issue.owner,
    repo: issue.repo,
    title: issue.title,
    body: issue.body,
    labels: issue.labels
  })

  return resp
}

module.exports.getMeetingIssues = async function (client, opts) {
  const resp = await client.issues.listForRepo({
    owner: opts.owner,
    repo: opts.repo,
    state: 'open',
    labels: opts.label || 'meeting'
  })

  return resp.data
}

module.exports.getIssueTemplate = async function getIssueTemplate (client, opts) {
  const resp = await client.repos.getContents({
    owner: opts.owner,
    repo: opts.repo,
    path: `.github/ISSUE_TEMPLATE/${opts.template || 'meeting.md'}`
  })
  if (resp.statusCode === 404) {
    return false
  }
  return Buffer.from(resp.data.content, resp.data.encoding).toString()
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
