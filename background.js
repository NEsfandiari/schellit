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

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
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
    db.ref()
      .child('urls')
      .get()
      .then((snapshot) => {
        const { matched_urls, unmatched_urls } = snapshot;
        console.log(snapshot);
        if (!(newUrl in matched_urls.values())) {
          if (newUrl in unmatched_urls.values()) {
            sendResponse({ message: 'its a match!' });
          } else {
            const updates = {};
            updates[`users/${user.id}`] = {
              email: user.email,
              urls: urls,
            };
            updates[`urls/unmatched_urls/${snapshot.length}`] = newUrl;
            db.ref().update(updates);
          }
        } else {
          sendResponse({ message: 'already matched' });
        }
      });
  }
  sendResponse({ greeting: 'farewell' });
});
