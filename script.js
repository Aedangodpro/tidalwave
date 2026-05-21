document.getElementById("launchBtn").addEventListener("click", launch);

function launch() {
  let url = document.getElementById("urlInput").value.trim();
  let count = parseInt(document.getElementById("countInput").value);

  if (!url) {
    alert("Enter a URL first.");
    return;
  }

  if (count < 1 || count > 20) {
    alert("Enter a number between 1 and 20.");
    return;
  }

  // Auto-add https:// if missing
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  // STEP 1: Open all tabs instantly (browser allows this)
  const tabs = [];
  for (let i = 0; i < count; i++) {
    const newTab = window.open("about:blank", "_blank");
    if (newTab) tabs.push(newTab);
  }

  // STEP 2: Write content AFTER tabs are opened (browser doesn't block this)
  tabs.forEach(win => {
    win.document.write(`
      <html>
        <body style="margin:0;overflow:hidden;background:black;">
          <iframe src="${url}"
            style="border:0;width:100vw;height:100vh;"></iframe>
        </body>
      </html>
    `);
    win.document.close();
  });
}
