import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUiText } from '../../i18n/ui-text';
import { DRIVE_REASON_TEXT, useDriveStore } from '../../drive/driveSession';

const GOOGLE_LOGOUT_URL = 'https://accounts.google.com/Logout';

/**
 * 구글 드라이브 저장·열기 대화상자(오픈소스 판 만들기 화면).
 *   mode='save': 로그인 → (처음이면) 파일 이름 → 저장. 충돌·만료·권한 문제도 여기서 안내합니다.
 *   mode='files': 로그인 → VPyLab 폴더의 파일 목록 → 열기, 새 코드로 시작, 로그아웃.
 * 문구: docs/reference/solar/drive-editor-261109-solar.md
 */
export default function DriveDialog({ mode, getCode, defaultName, onSaved, onLoaded, onNewCode, onRestoreNew, isDirty, onClose }) {
  const ui = useUiText();
  const {
    ready, preparing, account, file, files, truncated, busy, error, needsReauth, missingScope, folderTrashed, conflict,
  } = useDriveStore();
  const store = useDriveStore.getState;
  const [name, setName] = useState(() => (defaultName || '').replace(/\.py$/i, ''));
  const [notice, setNotice] = useState('');
  const pendingRef = useRef(null); // 재승인 뒤 이어서 할 일
  const listedFor = useRef('');

  useEffect(() => { store().prepare(); }, [store]);
  // 저장 창은 대개 저장이 막혀서 열립니다(로그인·만료·충돌). 재승인하면 이 저장을 이어서 합니다.
  useEffect(() => {
    if (mode === 'save' && store().file) pendingRef.current = () => doSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !busy) onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  // 파일 목록: 로그인한 계정마다 한 번 읽습니다. 저장 창에서도 같은 이름 파일을 피하려고 읽습니다.
  useEffect(() => {
    if (!account || missingScope || listedFor.current === account.sub) return;
    listedFor.current = account.sub;
    store().listFiles();
  }, [account, missingScope, store]);

  const saving = busy === 'save';
  // 목록을 읽는 동안에도 충돌 해결·재승인·저장은 누를 수 있게 합니다(목록은 배경에서 읽음).
  const working = Boolean(busy) && busy !== 'list';

  async function doSave(fileName) {
    pendingRef.current = () => doSave(fileName);
    const result = await store().save(getCode(), { name: fileName });
    if (result.status === 'created' || result.status === 'saved' || result.status === 'unchanged') {
      pendingRef.current = null;
      onSaved?.(result);
    }
  }

  function submitName(event) {
    event.preventDefault();
    const trimmed = name.trim() || ui("제목 없음");
    doSave(`${trimmed}.py`);
  }

  async function signIn(options) {
    const result = await store().signIn(options);
    if (result.switched) {
      // 다른 계정으로 바뀌었으면 앞 계정에서 하려던 저장·열기를 새 계정에 하지 않습니다.
      pendingRef.current = null;
      setNotice(ui("다른 계정으로 바뀌어 하려던 작업을 멈췄습니다. 이 계정에 저장하려면 저장을 다시 누르십시오."));
    }
    if (result.status === 'ok' && !store().file && onRestoreNew) {
      const draft = store().latestNewDraft();
      if (draft && draft.code !== getCode() && window.confirm(ui`이 브라우저에 저장하지 못한 초안이 있습니다(${new Date(draft.at).toLocaleString()}). 초안을 불러올까요?`)) {
        onRestoreNew(draft.code);
      }
    }
    if (result.status === 'ok') {
      // 승인 전에 읽던 목록은 실패했을 수 있어 새로 읽습니다.
      listedFor.current = store().account?.sub || '';
      store().listFiles();
    }
    if (result.status === 'ok' && pendingRef.current) {
      const next = pendingRef.current;
      pendingRef.current = null;
      next();
    }
  }

  async function open(id) {
    if (isDirty?.() && !window.confirm(ui("편집기에 드라이브에 저장하지 않은 변경이 있고, 다른 파일을 열면 이 변경은 사라집니다. 계속할까요?"))) return;
    pendingRef.current = () => open(id);
    const result = await store().openFile(id);
    if (result.status !== 'opened') return;
    pendingRef.current = null;
    let code = result.code;
    if (result.draft && window.confirm(ui`이 브라우저에 저장하지 못한 초안이 있습니다(${new Date(result.draft.at).toLocaleString()}). 초안을 불러올까요?`)) {
      code = result.draft.code;
      // 초안 뒤에 드라이브가 바뀌었으면 저장할 때 덮어쓰지 않고 충돌로 보여 줍니다.
      store().adoptDraft(result.draft);
    }
    onLoaded?.(code, result.name);
  }

  async function resolve(choice) {
    const result = await store().resolveConflict(choice);
    if (result.status === 'loaded') onLoaded?.(result.code, store().file?.name);
    else if (result.status === 'created' || result.status === 'saved') onSaved?.(result);
  }

  async function saveAsNew() {
    const base = (file?.name || name || ui("제목 없음")).replace(/\.py$/i, '');
    const result = await store().saveAsNew(getCode(), `${base}.py`);
    if (result.status === 'created') onSaved?.(result);
  }

  async function signOut(revoke) {
    if (revoke && !window.confirm(ui("VPyLab의 구글 드라이브 권한을 거둘까요? 드라이브에 저장한 파일은 지워지지 않습니다."))) return;
    const clearLocal = window.confirm(ui("이 브라우저에 남은 이 계정의 초안도 지울까요? 공용 컴퓨터라면 지우는 것이 안전합니다."));
    await store().signOut({ revoke, clearLocal });
    listedFor.current = '';
    setNotice(revoke ? ui("구글 드라이브 권한을 거뒀습니다.") : ui("로그아웃했습니다."));
  }

  const button = 'toolbar-btn';
  const primary = { backgroundColor: 'var(--color-accent)', color: 'var(--color-text-on-accent, #fff)', borderColor: 'var(--color-accent)' };
  const reason = error?.reason;
  const showError = reason && !(reason === 'auth' && needsReauth) && !(reason === 'scope' && missingScope) && !(reason === 'folderTrashed' && folderTrashed);

  let body;
  if (!ready) {
    body = (
      <p className="m-0 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {preparing || !error ? ui("구글 로그인을 준비하고 있습니다…") : ui(DRIVE_REASON_TEXT.gis)}
      </p>
    );
  } else if (!account) {
    body = (
      <>
        <p className="m-0 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {ui("코드는 내 구글 드라이브의 VPyLab 폴더에 저장됩니다. VPyLab은 이 앱이 만든 파일만 볼 수 있으며 드라이브의 다른 파일은 볼 수 없습니다.")}
        </p>
        <button type="button" className={button} style={primary} disabled={working} onClick={() => signIn()} data-testid="drive-sign-in">
          {busy === 'signin' ? ui("승인 창을 확인하십시오…") : ui("구글 계정으로 로그인")}
        </button>
      </>
    );
  } else if (missingScope) {
    body = (
      <>
        <p className="m-0 text-sm" role="alert" style={{ color: 'var(--color-warning-text, var(--color-text-primary))' }}>{ui(DRIVE_REASON_TEXT.scope)}</p>
        <button type="button" className={button} style={primary} disabled={working} onClick={() => signIn({ again: true, consent: true })}>{ui("드라이브 권한 다시 요청")}</button>
      </>
    );
  } else if (needsReauth) {
    body = (
      <>
        <p className="m-0 text-sm" role="alert" style={{ color: 'var(--color-warning-text, var(--color-text-primary))' }}>{ui(DRIVE_REASON_TEXT.auth)}</p>
        <button type="button" className={button} style={primary} disabled={working} onClick={() => signIn({ again: true })} data-testid="drive-reauth">{ui("다시 승인")}</button>
      </>
    );
  } else if (folderTrashed) {
    body = (
      <>
        <p className="m-0 text-sm" role="alert" style={{ color: 'var(--color-warning-text, var(--color-text-primary))' }}>{ui(DRIVE_REASON_TEXT.folderTrashed)}</p>
        <button type="button" className={button} style={primary} disabled={working} onClick={async () => { if (await store().restoreFolder()) { listedFor.current = ''; store().listFiles(); setNotice(ui("VPyLab 폴더를 되살렸고, 안의 파일이 목록에 다시 보이기까지 몇 초 걸릴 수 있습니다.")); } }}>{ui("VPyLab 폴더 되살리기")}</button>
      </>
    );
  } else if (conflict) {
    body = (
      <>
        <p className="m-0 text-sm" role="alert" style={{ color: 'var(--color-warning-text, var(--color-text-primary))' }}>
          {ui("다른 탭이나 기기에서 이 파일을 먼저 저장했으니 어떻게 할지 고르십시오.")}
        </p>
        <div className="flex flex-col gap-2">
          <button type="button" className={button} disabled={working} onClick={() => resolve('copy')} data-testid="drive-conflict-copy">{ui("내 코드를 사본으로 저장")}</button>
          <button type="button" className={button} disabled={working} onClick={() => resolve('remote')} data-testid="drive-conflict-remote">{ui("드라이브 내용 불러오기(내 변경은 버림)")}</button>
          <button type="button" className={button} disabled={working} onClick={() => resolve('overwrite')} data-testid="drive-conflict-overwrite">{ui("내 코드로 덮어쓰기")}</button>
        </div>
      </>
    );
  } else if (mode === 'save' && !file) {
    body = (
      <form onSubmit={submitName} className="flex flex-col gap-2" data-testid="drive-name-form">
        <label htmlFor="drive-file-name" className="text-xs font-semibold">{ui("파일 이름")}</label>
        <div className="flex items-stretch gap-2">
          <div className="flex items-center flex-1 min-w-0 rounded-md" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
            <input
              id="drive-file-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              autoFocus
              className="flex-1 min-w-0 text-sm py-2 pl-3 bg-transparent border-none outline-none"
              style={{ color: 'var(--color-text-primary)' }}
              data-testid="drive-file-name"
            />
            <span className="pr-3 text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>.py</span>
          </div>
          <button type="submit" className={button} style={primary} disabled={working} data-testid="drive-save-new">
            {saving ? ui("저장 중…") : ui("드라이브에 저장")}
          </button>
        </div>
      </form>
    );
  } else if (mode === 'save') {
    // 저장한 뒤에만 "저장했습니다"를 보입니다. 아직 드라이브와 다르면 이 파일에 저장하는 버튼을 둡니다.
    const unsaved = isDirty ? isDirty() : getCode() !== file.savedCode;
    body = unsaved || saving ? (
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>{file.name}</span>
        <button type="button" className={button} style={primary} disabled={working} onClick={() => doSave()} data-testid="drive-save-existing">
          {saving ? ui("저장 중…") : ui("드라이브에 저장")}
        </button>
      </div>
    ) : (
      <p className="m-0 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{ui`${file.name}에 저장했습니다.`}</p>
    );
  } else {
    body = (
      <>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} disabled={working} onClick={() => { if (!isDirty?.() || window.confirm(ui("편집기에 드라이브에 저장하지 않은 변경이 있고, 새 코드로 시작하면 이 변경은 사라집니다. 계속할까요?"))) { store().detach(); onNewCode?.(); } }} data-testid="drive-new-code">{ui("새 코드로 시작")}</button>
          <button type="button" className={button} disabled={working} onClick={() => { listedFor.current = account.sub; store().listFiles(); }}>{ui("목록 새로 고침")}</button>
        </div>
        <div className="flex flex-col gap-1 overflow-auto" style={{ maxHeight: 320 }} data-testid="drive-file-list">
          {busy === 'list' && <p className="m-0 text-sm" style={{ color: 'var(--color-text-muted)' }}>{ui("파일 목록을 불러오는 중…")}</p>}
          {busy !== 'list' && files.length === 0 && <p className="m-0 text-sm" style={{ color: 'var(--color-text-muted)' }}>{ui("VPyLab 폴더에 아직 파일이 없고, 만들기 화면에서 저장하면 여기에 나타납니다.")}</p>}
          {files.map((f) => (
            <button
              key={f.id}
              type="button"
              disabled={working}
              onClick={() => open(f.id)}
              className="flex items-center justify-between gap-3 text-left text-sm px-3 py-2 rounded-md cursor-pointer"
              style={{ border: '1px solid var(--color-border)', backgroundColor: f.id === file?.id ? 'var(--color-bg-secondary)' : 'transparent', color: 'var(--color-text-primary)' }}
            >
              <span className="truncate">{f.name}</span>
              <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>{f.modifiedTime ? new Date(f.modifiedTime).toLocaleString() : ''}</span>
            </button>
          ))}
          {truncated && <p className="m-0 text-xs" style={{ color: 'var(--color-text-muted)' }}>{ui("파일이 많아 최근 1,000개만 보입니다.")}</p>}
        </div>
      </>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }} onClick={() => !working && onClose?.()} role="presentation" data-testid="drive-dialog">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'save' ? ui("구글 드라이브에 저장") : ui("내 구글 드라이브")}
        className="rounded-2xl w-full flex flex-col gap-3"
        style={{ maxWidth: 480, backgroundColor: 'var(--color-bg-panel)', color: 'var(--color-text-primary)', padding: 20, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl, 0 24px 48px rgba(0,0,0,0.25))' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-base font-semibold">{mode === 'save' ? ui("구글 드라이브에 저장") : ui("내 구글 드라이브")}</h2>
          <button type="button" onClick={onClose} disabled={working} className="w-7 h-7 rounded-md cursor-pointer border-none" style={{ backgroundColor: 'transparent', color: 'var(--color-text-muted)' }} aria-label={ui("닫기")}>✕</button>
        </div>
        {account && (
          <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <span data-testid="drive-account">{account.email}</span>
            <button type="button" className="underline cursor-pointer border-none bg-transparent p-0 text-xs" style={{ color: 'var(--color-text-secondary)' }} disabled={working} onClick={() => signOut(false)}>{ui("로그아웃")}</button>
            <button type="button" className="underline cursor-pointer border-none bg-transparent p-0 text-xs" style={{ color: 'var(--color-text-secondary)' }} disabled={working} onClick={() => signOut(true)}>{ui("권한 철회")}</button>
          </div>
        )}
        {body}
        {showError && (
          <div className="flex flex-col gap-2">
            <p className="m-0 text-xs" role="alert" style={{ color: 'var(--color-error-text)' }} data-testid="drive-error">
              {reason === 'auth' && !account && error.detail
                ? ui(error.detail)
                : <>{ui(DRIVE_REASON_TEXT[reason] || DRIVE_REASON_TEXT.unknown)}{error.detail && reason !== 'auth' ? ` (${error.detail})` : ''}</>}
            </p>
            {reason === 'trashed' && <button type="button" className={button} disabled={working} onClick={saveAsNew}>{ui("새 파일로 저장")}</button>}
          </div>
        )}
        {notice && (
          <p className="m-0 text-xs" role="status" style={{ color: 'var(--color-success-text)' }}>
            {notice}{' '}
            {!account && <a href={GOOGLE_LOGOUT_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>{ui("공용 컴퓨터에서는 구글 계정에서도 로그아웃하십시오.")}</a>}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
