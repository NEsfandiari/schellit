const submit = document.querySelector('#submit');
const urlBar = document.querySelector('#urlBar');
const urlList = document.querySelector('#urlList');
const urlListContainer = document.querySelector('.urlList-container');
const signUp = document.querySelector('#signup');
const logout = document.querySelector('#logout');

setUrlBar();
populateUrls();

submit.addEventListener('click', onUrlSubmit);
signUp.addEventListener('click', onSignup);
logout.addEventListener('click', onLogout);

function onSignup() {
  chrome.identity.getAuthToken({ interactive: true }, function (token) {
    console.log(token);
    var x = new XMLHttpRequest();
    x.open(
      'GET',
      'https://www.googleapis.com/oauth2/v2/userinfo?alt=json&access_token=' +
        token
    );
    x.onload = function () {
      console.log(x.response);
      chrome.identity.getProfileUserInfo((user) => {
        console.log(user);
        chrome.runtime.sendMessage({ user, message: 'store user' });
      });
    };
    x.send();
  });
}

function onLogout() {
  chrome.identity.getAuthToken({ interactive: false }, function (token) {
    var url = 'https://accounts.google.com/o/oauth2/revoke?token=' + token;
    window.fetch(url);
    chrome.identity.removeCachedAuthToken({ token: token }, function () {
      alert('removed');
    });
  });
}

async function onUrlSubmit() {
  const tab = await getCurrentTab();
  const cleanUrl = shrinkUrl(tab.url);
  chrome.storage.sync.get('urls', ({ urls }) => {
    if (urls && urls.includes(cleanUrl)) {
      alert('url already is being listened on');
    } else if (urls.length >= 5) {
      alert('listening to the max of 5 urls. Trying deleting one first');
    } else {
      const newUrls = urls ? [...urls, cleanUrl] : [cleanUrl];
      chrome.storage.sync.set({ urls: newUrls });
      chrome.identity.getProfileUserInfo((user) => {
        chrome.runtime.sendMessage(
          {
            user,
            newUrl: cleanUrl,
            urls: urls,
            message: 'store url',
          },
          (res) => {
            if (res.message === 'already matched') {
              alert('this url is no longer available to be used');
              createUrl(cleanUrl);
            } else {
              console.log(res.message);
            }
          }
        );
      });
    }
  });
}

function onClose(e) {
  const urlToDelete = e.target.previousSibling.innerText;
  chrome.storage.sync.get('urls', ({ urls }) => {
    const newUrls = urls.filter((url) => url != urlToDelete);
    chrome.storage.sync.set({ urls: newUrls });
  });
  const urlEl = e.target.parentNode;
  urlEl.remove();
}

async function setUrlBar() {
  const tab = await getCurrentTab();
  const url = shrinkUrl(tab.url);
  urlBar.setAttribute('value', url);
}
function populateUrls() {
  chrome.identity.getProfileUserInfo((user) => {
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
  });
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

async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

function shrinkUrl(url) {
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
