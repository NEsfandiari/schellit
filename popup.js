const submit = document.querySelector('#submit');
const urlBar = document.querySelector('#urlBar');
const urlList = document.querySelector('#urlList');

setUrlBar();

chrome.storage.sync.get('urls', ({ urls }) => {
  if (urls) {
    console.log('urls', urls);
    for (let url of urls) {
      url = shrinkUrl(url);
      createUrl(url);
    }
  }
});

submit.addEventListener('click', async () => {
  const tab = await getCurrentTab();
  const cleanUrl = shrinkUrl(tab.url);
  chrome.storage.sync.get('urls', ({ urls }) => {
    if (urls.includes(cleanUrl)) {
      alert('url already is being listened on');
      return;
    }
    if (urls.length < 5) {
      const newUrls = urls ? [...urls, cleanUrl] : [cleanUrl];
      chrome.storage.sync.set({ urls: newUrls });
    } else {
      alert('already listening on 5 urls');
    }
  });
  createUrl(cleanUrl);
});

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
