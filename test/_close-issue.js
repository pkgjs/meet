'use strict'
const { getOctokit, context } = require('@actions/github')
const issues = require('../lib/issues')

;(async ([,, token, issueNumber]) => {
  if (!issueNumber) {
    return
  }

  const client = getOctokit(token)
  const repo = context.repo

  console.log(`Closing test issue ${issueNumber} in ${repo.owner}/${repo.repo}`)

  await issues.closeIssue(client, issueNumber, {
    ...repo
  })
})(process.argv)
