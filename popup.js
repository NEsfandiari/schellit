import { shrinkUrl, getCurrentTab, getCurrentUser } from './util.js';
const submit = document.querySelector('#submit');
const urlBar = document.querySelector('#urlBar');
const urlList = document.querySelector('#urlList');
const urlListContainer = document.querySelector('.urlList-container');
const signUp = document.querySelector('#signup');
const logout = document.querySelector('#logout');
const syncMatch = document.querySelector('#syncMatch');

setUrlBar();
populateUrls();

submit.addEventListener('click', onUrlSubmit);
signUp.addEventListener('click', onSignup);
logout.addEventListener('click', onLogout);

function onSignup() {
  chrome.identity.getAuthToken({ interactive: true }, function (token) {
    console.log('SIGNUP TOKEN:', token);
    var x = new XMLHttpRequest();
    x.open(
      'GET',
      'https://www.googleapis.com/oauth2/v2/userinfo?alt=json&access_token=' +
        token
    );
    x.onload = function () {
      const user = JSON.parse(x.response);
      chrome.runtime.sendMessage({ user, message: 'store user' });
    };
    x.send();
  });
}

function onLogout() {
  chrome.identity.getAuthToken({ interactive: false }, async function (token) {
    console.log('LOGOUT', token);
    if (token) {
      var url = 'https://accounts.google.com/o/oauth2/revoke?token=' + token;
      window.fetch(url);
      chrome.identity.removeCachedAuthToken({ token: token }, function () {
        alert('removed');
      });
    } else {
      console.log('No userToken but...', await getCurrentUser());
    }
  });
}

async function onUrlSubmit() {
  const user = await getCurrentUser();
  if (!user.id) {
    alert('Please Sign Up or Login first');
    return;
  }

  const tab = await getCurrentTab();
  const cleanUrl = shrinkUrl(tab.url);
  chrome.storage.sync.get('urls', async ({ urls }) => {
    if (urls?.includes(cleanUrl)) {
      alert('url already is being listened on');
    } else if (urls?.length >= 5) {
      alert('listening to the max of 5 urls: try deleting one first');
    } else {
      const newUrls = urls ? [...urls, cleanUrl] : [cleanUrl];
      chrome.runtime.sendMessage(
        {
          user,
          newUrl: cleanUrl,
          urls: newUrls,
          message: 'store url',
        },
        (res) => {
          if (res.message === 'already matched') {
            alert('this url is no longer available to be used');
          } else if (res.message === `added url ${cleanUrl} to the db`) {
            chrome.storage.sync.set({ urls: newUrls });
            createUrl(cleanUrl);
          } else {
            console.log(res.message);
            alert(res.message);
          }
        }
      );
    }
  });
}

function onClose(e) {
  const urlToDelete = e.target.previousSibling.innerText;
  chrome.storage.sync.get('urls', async ({ urls }) => {
    const filteredUrls = urls.filter((url) => url != urlToDelete);
    const user = await getCurrentUser();
    chrome.storage.sync.set({ urls: filteredUrls });
    chrome.runtime.sendMessage({
      message: 'delete url',
      urlToDelete,
      filteredUrls,
      user,
    });
  });

  const urlEl = e.target.parentNode;
  urlEl.remove();
}

async function setUrlBar() {
  const tab = await getCurrentTab();
  const shortenedUrl = shrinkUrl(tab.url);
  const user = await getCurrentUser();
  urlBar.setAttribute('value', shortenedUrl);
  chrome.runtime.sendMessage(
    { message: 'check active tab', tab, user, activeUrl: shortenedUrl },
    (data) => {
      console.log('hiiii');
      console.log(data);
      if (data && data.matchAvailable) {
        syncMatch.classList.toggle('faded');
      }
    }
  );
}

async function populateUrls() {
  const user = await getCurrentUser();
  chrome.runtime.sendMessage(
    { message: 'check matches', userId: user.id },
    (res) => {
      const { matches, filteredUrls } = res;
      chrome.storage.sync.set({ urls: filteredUrls });
      if (matches.length > 0) {
        let str = 'Congrats, You have Matched With ';
        res.matches.forEach((match) => {
          str += `${match.email} on ${match.url}, `;
        });
        str = str.slice(0, str.length - 2);
        alert(str);
      }
    }
  );
  if (user.email) {
    signUp.classList.toggle('hidden');
    logout.classList.toggle('hidden');
    urlListContainer.classList.toggle('hidden');
    chrome.storage.sync.get('urls', ({ urls }) => {
      if (urls) {
        for (let url of urls) {
          url = shrinkUrl(url);
          createUrl(url);
        }
      }
    });
  }
}

function createUrl(url) {
  const urlText = document.createElement('p');
  urlText.innerText = url;

  const closeIcon = document.createElement('img');
  closeIcon.setAttribute('src', 'images/cancel.png');
  closeIcon.addEventListener('click', onClose);

  const urlContainer = document.createElement('div');
  urlContainer.classList.add('url-container');
  urlContainer.appendChild(urlText);
  urlContainer.appendChild(closeIcon);
  urlList.appendChild(urlContainer);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { message } = request;
  if (message === 'sync available' && syncMatch.classList.contains('faded')) {
    syncMatch.classList.toggle('faded');
  }
});
