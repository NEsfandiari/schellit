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
  if (message === 'store url') {
    console.log(request);
    const { user, urls } = request;
    db.ref(`users/${user.id}`).set({
      email: user.email,
      urls: urls,
    });
  }
  sendResponse({ greeting: 'farewell' });
});
