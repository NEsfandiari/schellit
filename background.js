self.importScripts(
  './firebase/firebase-app.js',
  './firebase/auth.js',
  './firebase/database.js'
);

const firebaseConfig = {
  apiKey: 'AIzaSyDMsuM8d04SYP3ZNz6y0a8aqub2ihvOwvA',
  authDomain: 'schellit.firebaseapp.com',
  databaseURL: 'https://schellit-default-rtdb.firebaseio.com',
  projectId: 'schellit',
  storageBucket: 'schellit.appspot.com',
  messagingSenderId: '241007919342',
  appId: '1:241007919342:web:33b3d0a77a7552d9f1b3ff',
  measurementId: 'G-B3S8BHVZPD',
  clientId:
    '630857334346-h666h86ugqa5p25mogd30jl51n2ek371.apps.googleusercontent.com',
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const ACTIVE_URL_BLACKLIST = new Set([
  'chrome://newtab/',
  'chrome://extensions/',
]);
let previousActive = undefined;

chrome.runtime.onInstalled.addListener(() => {
  console.log('From the Service Worker');
});

chrome.identity.onSignInChanged.addListener((status) => {
  console.log({ status });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { message } = request;

  // NEW USER
  if (message === 'store user') {
    const { user } = request;
    console.log('NEW USER:', { user });
    db.ref(`users/${user.id}`).set({
      email: user.email,
      id: String(user.id),
    });
  }

  // NEW URL
  if (message === 'store url') {
    const { user, newUrl, urls } = request;
    console.log('starting request', new Date().getTime());
    db.ref('/urls')
      .get()
      .then(async (snapshot) => {
        const { matched_urls, unmatched_urls } = snapshot.val();
        const hashableUrl = createHashableUrl(newUrl);

        const updates = {};
        if (hashableUrl in matched_urls) {
          sendResponse({ message: 'already matched' });
        } else if (hashableUrl in unmatched_urls) {
          const user2 = (
            await db.ref(`/users/${unmatched_urls[hashableUrl]}`).get()
          ).val();
          updates[`urls/unmatched_urls/${hashableUrl}`] = null;
          updates[`urls/matched_urls/${hashableUrl}`] = [
            user2.email,
            user.email,
          ];
          db.ref().update(updates);
          updateProfileMatches(user, user2, newUrl);
          sendResponse({ message: 'its a match!' });
        } else {
          updates[`users/${user.id}/urls`] = urls;
          updates[`users/${user.id}/email`] = user.email;
          updates[`urls/unmatched_urls/${hashableUrl}`] = user.id;
          db.ref().update(updates);
          sendResponse({ message: `added url ${newUrl} to the db` });
        }
      });
    return true;
  }

  // REMOVE Unmatched URL
  if (message === 'delete url') {
    const { urlToDelete, user, filteredUrls } = request;
    const hashableUrl = createHashableUrl(urlToDelete);
    const updates = {};
    updates[`urls/unmatched_urls/${hashableUrl}`] = null;
    updates[`users/${user.id}/urls`] = filteredUrls;
    db.ref().update(updates);
  }

  // CHECK FOR MATCHES ON LOGIN
  if (message === 'check matches') {
    const { userId } = request;
    db.ref(`/users/${userId}`)
      .get()
      .then((snapshot) => {
        const { matches, urls } = snapshot.val();
        const newMatches = [];
        if (matches) {
          for (const match of Object.values(matches)) {
            if (urls.includes(match.url)) {
              newMatches.push(match);
            }
          }
        }
        const filteredUrls = urls
          ? urls.filter((url) => !newMatches.some((match) => match.url === url))
          : [];
        const updates = {};
        updates[`users/${userId}/urls`] = filteredUrls;
        db.ref().update(updates);
        sendResponse({ matches: newMatches, filteredUrls });
      });
    return true;
  }

  // Check for if the current tab has a match available
  if (message === 'check active tab') {
    const { tab, user, activeUrl } = request;
    if (tab.active && !ACTIVE_URL_BLACKLIST.has(activeUrl)) {
      if (previousActive) {
        db.ref(
          `/urls/active/${previousActive.hashableUrl}/${previousActive.ref}`
        ).remove();
      }
      const hashableUrl = createHashableUrl(activeUrl);
      const activeUrlRef = db.ref(`/urls/active/${hashableUrl}`);
      activeUrlRef.get().then((snapshot) => {
        const data = snapshot.val();
        const userInActiveData =
          data && Object.values(data).some((usr) => usr.id === user.id);
        if (!data || !userInActiveData) {
          const newActiveUrlRef = activeUrlRef.push();
          newActiveUrlRef.set({
            ...user,
          });
          const matchAvailable = data && Object.keys(data).length > 0;
          previousActive = {
            hashableUrl,
            url: tab.url,
            ref: newActiveUrlRef.key,
            matchAvailable,
          };
          sendResponse({
            matchAvailable,
          });
        } else {
          previousActive = undefined;
          sendResponse({
            matchAvailable:
              data && userInActiveData
                ? Object.keys(data).length > 1
                : Object.keys(data).length > 0,
          });
        }
      });
    }
    return true;
  }

  if (message === 'join room') {
    const { hashableUrl, url } = previousActive;
    db.ref(`urls/active/${hashableUrl}/room`).on(
      'child_added',
      async (data) => {
        if (data.key === 'answer') {
          chrome.runtime.sendMessage({
            message: 'make remote desc',
            data: data.val(),
          });
        } else if (data.key === 'offer') {
          chrome.runtime.sendMessage(
            {
              message: 'create answer',
              data: data.val(),
            },
            ({ answer }) =>
              db.ref(`urls/active/${hashableUrl}/room/answer`).set(answer)
          );
        }
      }
    );
    db.ref(`urls/active/${hashableUrl}/room`)
      .get()
      .then((snapshot) => {
        const room = snapshot.val();
        if (!room) {
          chrome.runtime.sendMessage(
            { message: 'create offer' },
            ({ offer }) => {
              db.ref(`urls/active/${hashableUrl}/room`).set({
                offer,
                url,
              });
            }
          );
          sendResponse({ message: 'you are the caller!', role: 'caller' });
        } else {
          sendResponse({
            message: 'you are the responder!',
            role: 'responder',
          });
        }
      });
    return true;
  }

  if (message === 'leave room') {
    const { role } = request;
    const { hashableUrl } = previousActive;
    const updates = {};
    updates[`urls/active/${hashableUrl}/room`] = null;
    db.ref().update(updates);
  }
});

function createHashableUrl(url) {
  url = url.replaceAll('.', '_');
  url = url.replaceAll('/', '\\');
  return url;
}

function updateProfileMatches(user1, user2, url) {
  const date = new Date().toDateString();
  console.log('NEW MATCH', { user1 }, { user2 });

  const matchListRef1 = db.ref(`users/${user1.id}/matches`);
  const newMatchRef1 = matchListRef1.push();
  newMatchRef1.set({
    email: user2.email,
    url,
    date,
  });
  const matchListRef2 = db.ref(`users/${user2.id}/matches`);
  const newMatchRef2 = matchListRef2.push();
  newMatchRef2.set({
    email: user1.email,
    url,
    date,
  });
}

db.ref('urls/active/').on('child_added', (data) => {
  console.log(data.key);
  if (data.key === previousActive?.hashableUrl) {
    chrome.runtime.sendMessage({ message: 'sync available' });
  }
});

const URLS = {};
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.url) {
    URLS[tabId] = changeInfo.url;
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const tabURL = URLS[tabId];
  console.log(
    'TAB REMOVED',
    tabURL === previousActive?.url,
    { previousActive },
    { URLS }
  );
  if (tabURL === previousActive?.url) {
    db.ref(
      `/urls/active/${previousActive.hashableUrl}/${previousActive.ref}`
    ).remove();
    previousActive = undefined;
  }
  delete URLS[tabId];
});
