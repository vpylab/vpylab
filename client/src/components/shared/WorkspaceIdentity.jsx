import useAppStore from '../../stores/appStore';

export function ServiceMark({ service }) {
  return <img className="vpy-service-mark" src={'/brand/' + service + '.svg'} alt="" aria-hidden="true" />;
}

export function TonePicker() {
  const {theme,setTheme,locale,THEMES,THEME_META}=useAppStore();
  const ko=locale==='ko';
  const labels={'slide-blue':'Slide blue','weaver-pastel':'Weaver pastel','apricot-notes':'Apricot notebook'};
  return <label className="vpy-tone-picker"><span>{ko?'화면 꾸미기':'Appearance'}</span>
    <select aria-label={ko?'화면 꾸미기':'Appearance'} value={theme} onChange={e=>setTheme(e.target.value)}>
      {THEMES.map(value=><option key={value} value={value}>{ko?THEME_META[value].label:labels[value] || value.replaceAll('-',' ')}</option>)}
    </select></label>;
}

export function WorkspaceIdentity({ team = false, children }) {
  const ko = useAppStore(s => s.locale === 'ko');
  const subtitle = team ? (ko ? '팀원과 함께 만드는 작품' : 'Create with your teammates')
    : (ko ? '내 작품과 나만의 항해일지' : 'Your code and personal logbook');
  return <div className={'vpy-space-identity ' + (team ? 'team' : 'personal')}>
    <div className="vpy-identity-copy"><span className="vpy-provider"><ServiceMark service={team ? 'github' : 'drive'} />{team ? 'GitHub' : 'Google Drive'}</span>
      {children}<p>{subtitle}</p>
    </div>
    <div className="vpy-friends" aria-hidden="true">
      <img className="vpy-space-friend" src={'/mong/' + (team ? 'gori' : 'mongsil') + '.png'} alt="" />
      <img className="vpy-second-friend" src={'/mong/' + (team ? 'doran' : 'dugeun') + '.png'} alt="" />
    </div>
  </div>;
}
