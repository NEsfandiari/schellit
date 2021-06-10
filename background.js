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
    db.ref()
      .child('users')
      .child(user.id)
      .get()
      .then((snapshot) => {
        if (snapshot.exists()) {
          console.log(snapshot.val(), 'val exists');
        } else {
          db.ref(`users/${user.id}`).set({
            email: user.email,
          });
        }
      });
  }

  // NEW URL
  if (message === 'store url') {
    const { user, newUrl, urls } = request;
    console.log('starting request', new Date().getTime());
    db.ref('/urls')
      .get()
      .then((snapshot) => {
        const { matched_urls, unmatched_urls } = snapshot.val();
        console.log(matched_urls, unmatched_urls);
        const hashableUrl = createHashableUrl(newUrl);
        if (hashableUrl in matched_urls) {
          sendResponse({ message: 'already matched' });
        } else {
          const updates = {};
          if (hashableUrl in unmatched_urls) {
            updates[`urls/unmatched_urls/${hashableUrl}`] = null;
            updates[`urls/matched_urls/${hashableUrl}`] = [
              unmatched_urls[hashableUrl],
              user.email,
            ];
            db.ref().update(updates);
            sendResponse({ message: 'its a match!' });
          } else {
            updates[`users/${user.id}`] = {
              email: user.email,
              urls: urls,
            };
            updates[`urls/unmatched_urls/${hashableUrl}`] = user.email;
            db.ref().update(updates);
            sendResponse({ message: `added url ${newUrl} to the db` });
          }
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
});

function createHashableUrl(url) {
  url = url.replaceAll('.', '_');
  url = url.replaceAll('/', '\\');
  return url;
}
