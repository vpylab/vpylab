import { journalText } from '../utils/project-journal.js';

const DRIVE = 'https://www.googleapis.com/drive/v3';
const DOCS = 'https://docs.googleapis.com/v1/documents';
export const DOCUMENT_MIME = 'application/vnd.google-apps.document';

export async function findPersonalJournal(fileId, findMarked) {
  const files = await findMarked('vpylabJournalFor', fileId, 'files(id,mimeType)');
  return files.find(file => file.mimeType === DOCUMENT_MIME);
}

export async function appendPersonalJournal({ file, author, entry, request, findMarked, liveFolder }) {
  const find = () => findPersonalJournal(file.id, findMarked);
  let doc = await find();
  if (!doc) {
    const parent = await liveFolder();
    const created = await request('journal.create', DRIVE + '/files?fields=id', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name.replace(/\.py$/i, '') + ' · 항해일지', mimeType: DOCUMENT_MIME,
        parents: [parent], appProperties: { vpylabJournalFor: file.id } }),
    }, { retry: false });
    doc = await find() || created;
  }
  const url = DOCS + '/' + encodeURIComponent(doc.id);
  const editUrl = 'https://docs.google.com/document/d/' + encodeURIComponent(doc.id) + '/edit';
  const marker = 'vpylab_' + entry.id;
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await request('journal.read', url + '?fields=revisionId,namedRanges,body(content(endIndex))');
    if (Object.hasOwn(current.namedRanges || {}, marker)) return { url: editUrl };
    const index = (current.body.content.at(-1)?.endIndex || 2) - 1;
    const text = (index === 1 ? file.name.replace(/\.py$/i, '') + ' · 항해일지\n\n' : '\n\n') + journalText(entry, author);
    try {
      await request('journal.append', url + ':batchUpdate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writeControl: {requiredRevisionId:current.revisionId}, requests: [
          {insertText:{location:{index},text}},
          {createNamedRange:{name:marker,range:{startIndex:index,endIndex:index+text.length}}},
        ] }),
      }, { retry:false });
      return { url: editUrl };
    } catch (error) {
      if (attempt === 3 || ![400,409,412].includes(error.status)) throw error;
    }
  }
}
