self.importScripts(
  './firebase/firebase-app.js',
  './firebase/auth.js',
  './firebase/database.js'
);

const firebaseConfig = {
  apiKey: 'AIzaSyDMsuM8d04SYP3ZNz6y0a8aqub2ihvOwvA',
  authDomain: 'schellit.firebaseapp.com',
  projectId: 'schellit',
  storageBucket: 'schellit.appspot.com',
  messagingSenderId: '241007919342',
  databaseURL: 'https://schellit-default-rtdb.firebaseio.com',
  appId: '1:241007919342:web:33b3d0a77a7552d9f1b3ff',
  measurementId: 'G-B3S8BHVZPD',
  clientId:
    '630857334346-h666h86ugqa5p25mogd30jl51n2ek371.apps.googleusercontent.com',
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let previousActive = undefined;

chrome.runtime.onInstalled.addListener(() => {
  console.log('From the Service Worker');
});

chrome.identity.onSignInChanged.addListener((thing) => {
  console.log(thing);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { message } = request;
  // NEW USER
  if (message === 'store user') {
    const { user } = request;
    console.log('NEW USER:', user);
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
        console.log(unmatched_urls, hashableUrl, newUrl);

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
        // console.log(matches, Object.values(matches));
        for (const match of Object.values(matches)) {
          if (urls.includes(match.url)) {
            newMatches.push(match);
          }
        }
        const filteredUrls = urls.filter(
          (url) => !newMatches.some((match) => match.url === url)
        );
        const updates = {};
        updates[`users/${userId}/urls`] = filteredUrls;
        db.ref().update(updates);
        sendResponse({ matches: newMatches, filteredUrls });
      });
    return true;
  }

  if (message === 'add active tab') {
    const { user, tabUrl } = request;
    if (previousActive) {
      db.ref(
        `/urls/active/${previousActive.url}/${previousActive.ref}`
      ).remove();
    }
    const hashableUrl = createHashableUrl(tabUrl);
    const activeUrlRef = db.ref(`/urls/active/${hashableUrl}`);
    activeUrlRef.get().then((snapshot) => {
      const data = snapshot.val();
      if (!data || !Object.values(data).some((usr) => usr.id === user.id)) {
        const newActiveUrlRef = activeUrlRef.push();
        newActiveUrlRef.set({
          ...user,
        });
        previousActive = { url: hashableUrl, ref: newActiveUrlRef.key };
        sendResponse({
          matchAvailable: data && Object.keys(data).length > 0,
        });
      } else {
        previousActive = undefined;
        sendResponse({ message: 'user already active on Url' });
      }
    });
    return true;
  }
});

function createHashableUrl(url) {
  url = url.replaceAll('.', '_');
  url = url.replaceAll('/', '\\');
  return url;
}

function updateProfileMatches(user1, user2, url) {
  const date = new Date().toDateString();
  console.log(user1, user2);

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
  chrome.storage.sync.get('urls', ({ urls }) => {});
});
