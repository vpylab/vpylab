# VPyLab 갤러리 목록

이 브랜치는 VPyLab 갤러리의 목록을 보관합니다. 교사가 고치는 파일은 `approvals.txt` 하나입니다. 나머지 파일은 자동으로 만들어지므로 직접 고치지 않습니다.

| 파일 | 내용 | 고치는 주체 |
|---|---|---|
| `approvals.txt` | 승인 파일. 갤러리에 실을 작품과 차단할 작품을 적습니다. | 교사 |
| `PENDING.md` | 승인 대기 작품의 목록입니다. | 자동 |
| `gallery.json` | 승인된 작품의 목록입니다. 갤러리 화면이 이 파일을 읽습니다. | 자동 |
| `pending.json` | 승인 대기 작품의 목록(자료 형식)입니다. | 자동 |
| `forge.json` | 승인된 저장소의 대장간 모듈 목록입니다. 대장간의 모두의 모듈이 이 파일을 읽습니다. | 자동 |
| `forge-pending.json` | 승인 대기 대장간 저장소의 목록(자료 형식)입니다. | 자동 |

승인 방법은 [docs/GALLERY_GITHUB.md](https://github.com/vpylab/vpylab/blob/main/docs/GALLERY_GITHUB.md)에 있습니다.
