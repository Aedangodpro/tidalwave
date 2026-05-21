document.getElementById("launchBtn").addEventListener("click", launch);

function launch() {
  let url = document.getElementById("urlInput").value.trim();
  let count = parseInt(document.getElementById("countInput").value);

  if (!url) return alert("Enter a URL first.");
  if (count < 1 || count > 20) return alert("Enter a number between 1 and 20.");

  // Auto-add https:// if missing
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  for (let i = 0; i < count; i++) {
    let win = window.open("about:blank", "_blank");

    win.document.write(`
      <html>
        <body style="margin:0;overflow:hidden;background:black;">
          <iframe src="${url}"
            style="border:0;width:100vw;height:100vh;"></iframe>
        </body>
      </html>
    `);

    win.document.close();
  }
}
