function createTitleBar() {
    var windowTopBar = document.createElement('div')
    windowTopBar.style.width = "100%"
    windowTopBar.style.height = "96px"
    windowTopBar.style.backgroundColor = "transparent"
    windowTopBar.style.position = "absolute"
    windowTopBar.style.top = windowTopBar.style.left = 0
    windowTopBar.style.webkitAppRegion = "drag"
    windowTopBar.style.zIndex = -1
    document.body.appendChild(windowTopBar)
}