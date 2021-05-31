var firebaseConfig = {
  apiKey: 'AIzaSyDMsuM8d04SYP3ZNz6y0a8aqub2ihvOwvA',
  authDomain: 'schellit.firebaseapp.com',
  projectId: 'schellit',
  storageBucket: 'schellit.appspot.com',
  messagingSenderId: '241007919342',
  appId: '1:241007919342:web:33b3d0a77a7552d9f1b3ff',
  measurementId: 'G-B3S8BHVZPD',
};

// firebase.initializeApp(firebaseConfig);

chrome.runtime.onInstalled.addListener(() => {
  console.log('From the Service Worker');
});

// chrome.browserAction.onClicked.addListener(function () {
//   chrome.tabs.create({ url: 'index.html' });
// });
