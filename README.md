# Instagram Follow Exporter

Two small scripts for your own Instagram account:

1. **`export-instagram-follow-lists.js`** is a browser console script that exports your **followers** or **following** list to a JSON file. It scrolls the modal automatically (the list is lazy loaded) and collects each user.
2. **`find-instagram-not-following-back.js`** is a Node script that reads those JSON files and lists the accounts you follow that don't follow you back.

## 1. Export your lists

1. Open your profile on [instagram.com](https://www.instagram.com) (desktop).
2. Click **Followers** so the modal is open.
3. Open DevTools > **Console**, paste the contents of `export-instagram-follow-lists.js`, and press Enter.
4. Wait for `Done`. A JSON file downloads automatically.
5. Close the modal, open **Following**, and run the script again **in the same tab without reloading the page**.

Run Followers first. The Following run compares against the followers list from the same tab, and that list is kept in memory only (nothing is stored in the browser), so it is lost on reload. If it is missing, `followBack` is `null` for everyone and the console warns you.

### Console helpers

| Command | What it does |
| --- | --- |
| `window.__igStop()` | Stop early and download what was collected so far |
| `window.__igDownload()` | Download again if the browser blocked the automatic download |
| `window.__igUsers` | The live `Map` of collected users |

### Output

```json
{
  "listType": "following",
  "collectedAt": "2026-10-16T09:30:00.000Z",
  "count": 412,
  "users": [
    {
      "username": "example",
      "fullName": "Example User",
      "profileUrl": "https://www.instagram.com/example/",
      "isVerified": false,
      "followBack": true
    }
  ]
}
```

`followBack` is `true` if you follow each other, `false` if not, and `null` if it couldn't be determined.

- In the **Followers** list it is read from each row's button (Following means you follow them back).
- In the **Following** list Instagram doesn't show it, so it is compared against the followers list collected earlier in the same tab.

### Config

Edit the `CONFIG` object at the top of the script:

| Option | Default | Description |
| --- | --- | --- |
| `scrollIntervalMs` | `5000` | Wait between scrolls |
| `scrollDelayVarianceMs` | `1000` | Random extra delay added to each wait |
| `maxIdleRounds` | `5` | Stop after this many scrolls with no new users |

A full run takes a few minutes, since each scroll loads only about 10 to 15 users. If the final count is lower than your real count, Instagram stopped loading more rows. Wait a few minutes and run it again, or raise `scrollIntervalMs`.

## 2. Find who doesn't follow you back

Requires [Node.js](https://nodejs.org). Pass the Following file, and optionally the Followers file:

```bash
node find-instagram-not-following-back.js instagram-following-2026-10-16.json instagram-followers-2026-10-16.json
```

- **With both files**, it compares usernames (most reliable, and works even if `followBack` is `null`).
- **With only the Following file**, it uses the `followBack` field and skips entries where it is `null`, with a warning.

The result is printed and saved as `not-following-back-<date>.json`.

## Notes

- It reads the page DOM, so Instagram markup changes can break it.
- Automated scrolling is against Instagram's Terms of Service. Use it on your own account, sparingly, and at your own risk.
