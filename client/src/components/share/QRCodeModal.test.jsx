import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '../../i18n';

const qr = vi.hoisted(() => ({ toDataURL: vi.fn(async () => 'data:image/png;base64,QUJD') }));
vi.mock('qrcode', () => ({ default: qr }));
vi.mock('../../stores/appStore', () => {
  const state = { theme: 'creative-light', locale: 'ko' };
  return { default: Object.assign((selector) => selector(state), { getState: () => state }) };
});

import QRCodeModal from './QRCodeModal';
import ShareLinkDialog from './ShareLinkDialog';

const URL_ = 'https://vpylab.vercel.app/s/abc12345';
const wrap = (ui) => render(<I18nProvider>{ui}</I18nProvider>);

describe('QR 모달', () => {
  beforeEach(() => { qr.toDataURL.mockClear(); });
  afterEach(() => cleanup());

  it('공유 링크로 QR을 만들어 크게 보이고 PNG 내려받기 링크를 둔다', async () => {
    const onClose = vi.fn();
    wrap(<QRCodeModal url={URL_} title="공 튀기기" onClose={onClose} />);
    expect(qr.toDataURL).toHaveBeenCalledWith(URL_, expect.objectContaining({ width: 1024 }));
    await waitFor(() => expect(screen.getByTestId('qr-image')).toHaveAttribute('src', 'data:image/png;base64,QUJD'));
    expect(screen.getByTestId('qr-url')).toHaveTextContent(URL_);
    const download = screen.getByTestId('qr-download');
    expect(download).toHaveAttribute('href', 'data:image/png;base64,QUJD');
    expect(download).toHaveAttribute('download', '공-튀기기-qr.png');
  });

  it('링크 복사 버튼은 클립보드에 주소를 넣고, Esc·닫기로 닫힌다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const onClose = vi.fn();
    wrap(<QRCodeModal url={URL_} title="t" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '링크 복사' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(URL_));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});

describe('공유 링크 대화상자', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('주소를 보이고 QR 보기·임베드 코드 복사가 동작한다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    wrap(<ShareLinkDialog url={URL_} shareId="abc12345" title="공 튀기기" onClose={() => {}} />);
    expect(screen.getByTestId('share-url')).toHaveValue(URL_);
    fireEvent.click(screen.getByTestId('share-copy-embed'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^<iframe src="https?:\/\/[^"]+\/embed\/abc12345" width="800" height="500" allow="autoplay; fullscreen" loading="lazy"/)));
    fireEvent.click(screen.getByTestId('share-show-qr'));
    expect(screen.getByTestId('qr-modal')).toBeInTheDocument();
    expect(screen.getByTestId('qr-url')).toHaveTextContent(URL_);
  });
});
