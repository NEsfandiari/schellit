const submit = document.querySelector("#submit");
const urlBar = document.querySelector("#urlBar");

setUrlBar()

submit.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
});

async function setUrlBar(){
  const tab = await getCurrentTab()
  console.log(tab)
  const url = shrinkUrl(tab.url)
  console.log(url)
  urlBar.setAttribute("value", url)
}

async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

function shrinkUrl(url){
  const queryParamIdx = url.search("\\?")
  console.log(queryParamIdx)
  if (queryParamIdx != -1){
    url = url.slice(0, queryParamIdx)
  }

  const protocolIdx = url.match(/^https?:\/\/w{0,3}./)
  if(protocolIdx != null){
    url = url.slice(protocolIdx[0].length-1)
  }
  return url
}