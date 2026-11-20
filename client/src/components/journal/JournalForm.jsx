import { useRef, useState } from 'react';
import useAppStore from '../../stores/appStore';
import { journalAnswers, journalFields } from '../../utils/project-journal';

export function JournalFields({ values, onChange, disabled = false }) {
  const ko = useAppStore(s => s.locale === 'ko');
  return <div className="vpy-journal-fields">{journalFields.map(([key, label, hint, english, englishHint]) =>
    <label key={key}>{ko ? label : english}
      <textarea rows={2} maxLength={500} value={values[key] || ''} disabled={disabled}
        placeholder={ko ? hint : englishHint} onChange={event => onChange({ ...values, [key]: event.target.value })} />
    </label>)}</div>;
}

export default function JournalForm({ author, projectTitle, personal = false, disabled, save, findUrl }) {
  const ko = useAppStore(s => s.locale === 'ko');
  const txt = (k,e) => ko ? k : e;
  const [values, setValues] = useState({});
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [url, setUrl] = useState('');
  const pending = useRef(null);
  const submitting = useRef(false);
  async function submit(event) {
    event.preventDefault();
    if (submitting.current || disabled || !journalAnswers(values).length) return;
    submitting.current = true; setWorking(true); setFeedback('');
    pending.current ??= { id: crypto.randomUUID(), at: Date.now(), zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', values: { ...values } };
    try {
      const result = await save(pending.current);
      if (result?.status !== 'saved') throw new Error(result?.message || txt('기록을 저장하지 못했습니다. 연결을 확인한 뒤 다시 시도하세요.', 'Could not save. Check your connection and try again.'));
      setUrl(result.url || ''); pending.current = null; setValues({});
      setFeedback(txt('항해일지에 기록했습니다.', 'Added to your logbook.'));
    } catch (error) { setFeedback(error.message); }
    finally { submitting.current = false; setWorking(false); }
  }
  async function findExisting(event) {
    if (!event.currentTarget.open || !findUrl || url) return;
    try {
      const found = await findUrl();
      if (found) setUrl(found);
    } catch { /* 기록 쓰기를 열어 둡니다. 저장 시 연결 오류를 안내합니다. */ }
  }
  return <details className="vpy-journal" onToggle={findExisting}><summary>{txt('항해일지', 'Project logbook')} <span>{personal ? 'Google Docs' : 'log.md'}</span></summary>
    <form onSubmit={submit}>
      <p><strong>{projectTitle}</strong> · {personal ? txt('내 드라이브에 이 작품의 항해일지를 만듭니다.', 'Keep this project’s logbook in your Google Drive.') : txt('팀 저장소에 함께 읽을 기록을 남깁니다. 공개 저장소에서는 누구나 볼 수 있어요.', 'Write for your team. Entries in a public repository are public.')}</p>
      <p>{txt('원하는 항목만 적으세요. 날짜·시각과 작성자가 자동으로 붙습니다.', 'Fill in any fields you like. Date, time and author are added automatically.')} · {author}</p>
      <JournalFields values={values} onChange={next => { pending.current = null; setValues(next); }} disabled={working}/>
      <button className="vpy-journal-save" disabled={disabled || working || !journalAnswers(values).length}>{working ? txt('기록 중…','Saving…') : txt('항해일지에 추가','Add entry')}</button>
      {feedback && <p role="status">{feedback}</p>}
      {url && <a href={url} target="_blank" rel="noreferrer">{txt('항해일지 열기','Open logbook')} ↗</a>}
    </form></details>;
}
