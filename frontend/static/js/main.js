import 'bootstrap/dist/css/bootstrap.min.css';

export default function main() {}


const myPastesUl = document.getElementById("myPastesUl")
const recentlyViewedUl = document.getElementById("recentlyViewedUl")

fetch("/mypastes").then(r => r.json()).then(
  pastes => pastes.forEach(({key, url}) => {
    const li = document.createElement("li")
    li.classList.add("list-group-item", "p-0")
    li.innerHTML = `<a href="${url}">${key}</a>`
    myPastesUl.appendChild(li)
  })
)


const recentlyViewed = JSON.parse(localStorage.getItem("recentlyViewed") || "[]")
const validateUrl = new URL(window.location.href)
validateUrl.pathname = "/validate"
recentlyViewed.forEach(key => validateUrl.searchParams.append("keys", key))

fetch(validateUrl).then(r => r.json()).then(
  keys => keys.forEach(key => {
    const li = document.createElement("li")
    li.classList.add("list-group-item", "p-0")
    li.innerHTML = `<a href="/p/${key}">${key}</a>`
    recentlyViewedUl.appendChild(li)
  })
)

var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl)
})
