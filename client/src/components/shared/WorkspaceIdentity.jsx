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
  return <div className={'vpy-space-identity ' + (team?'team':'personal')}>
    <div><ServiceMark service={team?'github':'drive'}/>{children}</div>
    <img className="vpy-space-friend" src={'/mong/' + (team?'gori':'mongsil') + '.png'} alt="" />
  </div>;
}
