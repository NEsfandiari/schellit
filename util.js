export function shrinkUrl(url) {
  const queryParamIdx = url.search('\\?');
  if (queryParamIdx != -1) {
    url = url.slice(0, queryParamIdx);
  }

  const protocolIdx = url.match(/^https?:\/\/w{0,3}\.?/);
  if (protocolIdx != null) {
    url = url.slice(protocolIdx[0].length);
  }
  return url;
}

export async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

export function getCurrentUser() {
  return new Promise((res) => {
    chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, (user) => {
      res(user);
    });
  });
}
