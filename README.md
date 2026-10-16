# Instagram Follow Exporter

A browser console script that exports your Instagram **followers** or **following** list to a JSON file. It scrolls the modal automatically (the list is lazy loaded), collects each user, and detects whether you follow each other.

## Usage

1. Open your profile on [instagram.com](https://www.instagram.com) (desktop).
2. Click **Followers** or **Following** so the modal is open.
3. Open DevTools > **Console**, paste the contents of `instagram-list-scraper.js`, and press Enter.
4. Wait for it to finish. A JSON file downloads automatically.

> For accurate `followBack` values, run it on **Followers** first, then on **Following**.

To stop early and download what was collected so far, run `window.__igStop()` in the console.

## Output

```json
{
  "listType": "followers",
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

`followBack` is `true` if you follow each other, `false` if not, and `null` if it couldn't be determined (for example, running Following before Followers).

## Config

Edit the `CONFIG` object at the top of the script:

| Option | Default | Description |
| --- | --- | --- |
| `scrollIntervalMs` | `5000` | Wait between scrolls |
| `scrollDelayVarianceMs` | `1000` | Random extra delay added to each wait |
| `maxIdleRounds` | `5` | Stop after this many scrolls with no new users |

## Notes

- It reads the page DOM, so Instagram markup changes can break it.
- Automated scrolling is against Instagram's Terms of Service. Use it on your own account, sparingly, and at your own risk.