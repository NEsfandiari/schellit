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

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
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
    const { matched_urls, unmatched_urls } = (
      await db.ref('/urls').get()
    ).val();
    console.log(matched_urls, unmatched_urls);
    if (matched_urls.includes(newUrl)) {
      sendResponse({ message: 'already matched' });
    } else {
      if (unmatched_urls.includes(newUrl)) {
        sendResponse({ message: 'its a match!' });
      } else {
        const updates = {};
        updates[`users/${user.id}`] = {
          email: user.email,
          urls: urls,
        };
        updates[`urls/unmatched_urls/${unmatched_urls.length}`] = newUrl;
        db.ref().update(updates);
      }
    }
  }
});
