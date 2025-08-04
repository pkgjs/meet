'use strict'

const { default: HackMD } = require('@hackmd/api')
const defaultNotesTemplate = require('./default-notes-template')

module.exports.create = async function createNote (notesTemplate, opts) {
  const note = typeof notesTemplate === 'function' ? notesTemplate(opts) : notesTemplate || defaultNotesTemplate(opts)

  try {
    const hackmd = new HackMD()
    return await hackmd.newNote(note)
  } catch (e) {
    console.error('failed to create hackMD note:', e.message)
    console.log(`note would have been:\n${note}`)
    return null
  }
}

async function getNotesTemplate (client, opts) {
  const resp = await client.repos.getContents({
    owner: opts.owner,
    repo: opts.repo,
    path: `.github/meet/${opts.notesTemplate}`
  })
  if (resp.statusCode === 404) {
    return false
  }
  return Buffer.from(resp.data.content, resp.data.encoding).toString()
}

module.exports.getNotesTemplate = getNotesTemplate
