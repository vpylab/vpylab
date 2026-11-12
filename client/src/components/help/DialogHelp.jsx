import {
  DriveConflictGuide, DriveReauthGuide, DriveScopeGuide, DriveSignInGuide,
  GitHubConflictGuide, GitHubConnectGuide, GitHubCreateGuide, GitHubInviteGuide, GitHubInvitedGuide, GitHubMissingInviteGuide, GitHubReconnectGuide,
  GuideDriveHelp, GuideLeavingHelp, GuideSoloHelp, GuideTeamHelp,
  KeepAsFileGuide, LeavingGuide,
} from './guides';

/** 안내 이름(topic)과 안내 컴포넌트의 짝. HelpSlot이 이 파일을 지연해서 불러옵니다. */
const TOPICS = {
  'drive-signin': DriveSignInGuide,
  'drive-scope': DriveScopeGuide,
  'drive-reauth': DriveReauthGuide,
  'drive-conflict': DriveConflictGuide,
  'keep-file': KeepAsFileGuide,
  'github-connect': GitHubConnectGuide,
  'github-reconnect': GitHubReconnectGuide,
  'github-create': GitHubCreateGuide,
  'github-invite': GitHubInviteGuide,
  'github-invited': GitHubInvitedGuide,
  'github-missing-invite': GitHubMissingInviteGuide,
  'github-conflict': GitHubConflictGuide,
  leaving: LeavingGuide,
  'guide-solo': GuideSoloHelp,
  'guide-drive': GuideDriveHelp,
  'guide-team': GuideTeamHelp,
  'guide-leaving': GuideLeavingHelp,
};

export default function DialogHelp({ topic, ...rest }) {
  const Guide = Object.hasOwn(TOPICS, topic) ? TOPICS[topic] : null;
  return Guide ? <Guide {...rest} /> : null;
}
