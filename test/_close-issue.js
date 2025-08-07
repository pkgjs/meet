'use strict'
const { getOctokit, context } = require('@actions/github')
const issues = require('../lib/issues')

;(async ([,, token, issueNumber]) => {
  if (!issueNumber) {
    return
  }
  console.log(`Closing test issue ${issueNumber}`)

  const client = getOctokit(token)
  await issues.closeIssue(client, issueNumber, {
    ...context.repo
  })
})(process.argv)
