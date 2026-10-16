/**
 * Instagram followers/following exporter (run in the DevTools console).
 *
 * Usage:
 *  1. Open your profile on instagram.com (desktop).
 *  2. Click "Followers" or "Following" so the modal is open.
 *  3. Open DevTools > Console, paste this whole script, press Enter.
 *  4. It scrolls every ~5s, collects users, and downloads a JSON file when done.
 *
 * Controls:
 *  - window.__igStop()  -> stop early and download what was collected so far
 *  - window.__igUsers   -> the live Map of collected users
 */
(() => {
  const CONFIG = {
    scrollIntervalMs: 5000,
    scrollDelayVarianceMs: 1000,
    maxIdleRounds: 5,
  };

  const RESERVED_PATHS = new Set([
    'explore',
    'reels',
    'direct',
    'accounts',
    'stories',
    'p',
    'reel',
    'tv',
    'about',
    'legal',
    'directory',
  ]);

  const IGNORED_TEXT = new Set([
    'follow',
    'following',
    'followers',
    'remove',
    'requested',
    'message',
    'verified',
  ]);

  const STORAGE_KEY = 'igScraper:followers';

  const users = new Map();
  window.__igUsers = users;

  let listType = 'unknown';
  let storedFollowers = null;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const getDialog = () => document.querySelector('div[role="dialog"]');

  const findScrollableContainer = (dialog) => {
    const candidates = [dialog, ...dialog.querySelectorAll('div')];

    return (
      candidates.find((el) => {
        const { overflowY } = getComputedStyle(el);
        const isScrollable = overflowY === 'auto' || overflowY === 'scroll';

        return isScrollable && el.scrollHeight > el.clientHeight;
      }) || null
    );
  };

  const getUsernameFromHref = (href) => {
    const match = href && href.match(/^\/([A-Za-z0-9._]+)\/?$/);

    if (!match) {
      return null;
    }

    return RESERVED_PATHS.has(match[1]) ? null : match[1];
  };

  const loadStoredFollowers = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      return raw ? new Set(JSON.parse(raw)) : null;
    } catch (error) {
      return null;
    }
  };

  const saveFollowers = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...users.keys()]));
    } catch (error) {
      console.warn('Could not save the followers list to localStorage.');
    }
  };

  // Reads the Follow / Following / Requested / Follow back button of a row.
  const findButtonLabel = (anchor) => {
    const labels = new Set(['following', 'follow', 'requested', 'follow back']);
    let el = anchor.parentElement;

    while (el && el.getAttribute('role') !== 'dialog') {
      const usernames = new Set(
        [...el.querySelectorAll('a[href^="/"]')]
          .map((a) => getUsernameFromHref(a.getAttribute('href')))
          .filter(Boolean),
      );

      // We climbed into a container holding several users, stop.
      if (usernames.size > 1) {
        return '';
      }

      const label = [...el.querySelectorAll('button, div[role="button"]')]
        .map((button) => button.textContent.trim().toLowerCase())
        .find((text) => labels.has(text));

      if (label) {
        return label;
      }

      el = el.parentElement;
    }

    return '';
  };

  // true = we follow each other, false = we don't, null = unknown.
  const resolveFollowBack = (username, anchor) => {
    if (listType === 'following') {
      return storedFollowers ? storedFollowers.has(username) : null;
    }

    if (listType === 'followers') {
      const label = findButtonLabel(anchor);

      if (label === 'following') {
        return true;
      }

      if (label) {
        return false;
      }
    }

    return null;
  };

  const findRow = (anchor) => {
    let el = anchor;

    for (let i = 0; i < 8 && el.parentElement; i++) {
      el = el.parentElement;

      if (el.querySelector('img')) {
        return el;
      }
    }

    return anchor.parentElement;
  };

  const extractUser = (anchor) => {
    const username = getUsernameFromHref(anchor.getAttribute('href'));

    if (!username) {
      return null;
    }

    const row = findRow(anchor);

    const textCandidates = [...row.querySelectorAll('span')]
      .map((span) => span.textContent.trim())
      .filter((text) => {
        return text && text !== username && !IGNORED_TEXT.has(text.toLowerCase());
      });

    return {
      username,
      fullName: textCandidates[0] || '',
      profileUrl: `https://www.instagram.com/${username}/`,
      isVerified: !!row.querySelector('svg[aria-label="Verified"]'),
      followBack: resolveFollowBack(username, anchor),
    };
  };

  const collectVisibleUsers = (dialog) => {
    let added = 0;

    dialog.querySelectorAll('a[href^="/"]').forEach((anchor) => {
      const user = extractUser(anchor);

      if (user && !users.has(user.username)) {
        users.set(user.username, user);
        added++;
      }
    });

    return added;
  };

  const detectListType = (dialog) => {
    const path = location.pathname.toLowerCase();

    if (/\/following\/?$/.test(path)) {
      return 'following';
    }

    if (/\/followers\/?$/.test(path)) {
      return 'followers';
    }

    // Fallback: read the modal's title text.
    const heading = [...dialog.querySelectorAll('h1, h2, div, span')].find((el) => {
      const text = el.textContent.trim().toLowerCase();

      return el.children.length === 0 && (text === 'followers' || text === 'following');
    });

    return heading ? heading.textContent.trim().toLowerCase() : 'unknown';
  };

  const download = (listType) => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const output = {
      listType,
      collectedAt: now.toISOString(),
      count: users.size,
      users: [...users.values()],
    };
    const blob = new Blob([JSON.stringify(output, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = `instagram-${listType}-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  let stopped = false;

  window.__igStop = () => {
    stopped = true;
  };

  const run = async () => {
    const dialog = getDialog();

    if (!dialog) {
      console.error('No modal found. Open the Followers/Following list first.');

      return;
    }

    listType = detectListType(dialog);
    storedFollowers = loadStoredFollowers();

    console.log(`Detected list type: ${listType}`);

    if (listType === 'following' && !storedFollowers) {
      console.warn(
        'No saved followers list found, so followBack will be null. ' +
          'Run the script on your Followers list first, then on Following.',
      );
    }

    const scroller = findScrollableContainer(dialog);

    if (!scroller) {
      console.error('Could not find the scrollable list inside the modal.');

      return;
    }

    let idleRounds = 0;
    let round = 0;

    while (!stopped && idleRounds < CONFIG.maxIdleRounds) {
      round++;
      collectVisibleUsers(dialog);

      const countBefore = users.size;

      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
      await sleep(CONFIG.scrollIntervalMs + Math.random() * CONFIG.scrollDelayVarianceMs);

      collectVisibleUsers(dialog);

      if (users.size === countBefore) {
        idleRounds++;
      } else {
        idleRounds = 0;
      }

      console.log(`Round ${round}: ${users.size} users collected (idle: ${idleRounds})`);
    }

    console.log(`Done. ${users.size} users. Downloading JSON...`);
    if (listType === 'followers') {
      saveFollowers();
    }

    download(listType);
  };

  run();
})();