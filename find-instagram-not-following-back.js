#!/usr/bin/env node
/**
 * Finds the accounts you follow that don't follow you back.
 *
 * Usage:
 *   node find-instagram-not-following-back.js <following.json> [followers.json]
 *
 * - With both files, it compares usernames (most reliable).
 * - With only the following file, it uses the `followBack` field that the
 *   exporter wrote (entries with followBack === false).
 *
 * Output: printed to the terminal and saved as not-following-back-<date>.json
 */
const fs = require('fs');

const readUsers = (filePath) => {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // Supports the exporter's { users: [...] } format and a bare array.
    const users = Array.isArray(data) ? data : data.users;

    if (!Array.isArray(users)) {
        throw new Error(`No users array found in ${filePath}`);
    }

    return users;
};

const findNonFollowers = (following, followers) => {
    if (followers) {
        const followerNames = new Set(followers.map((user) => user.username.toLowerCase()));

        return following.filter((user) => !followerNames.has(user.username.toLowerCase()));
    }

    return following.filter((user) => user.followBack === false);
};

const main = () => {
    const [followingPath, followersPath] = process.argv.slice(2);

    if (!followingPath) {
        console.error('Usage: node find-instagram-not-following-back.js <following.json> [followers.json]');
        process.exit(1);
    }

    const following = readUsers(followingPath);
    const followers = followersPath ? readUsers(followersPath) : null;

    if (!followers) {
        const unknown = following.filter((user) => user.followBack == null).length;

        if (unknown > 0) {
            console.warn(
                `Warning: ${unknown} of ${following.length} users have followBack = null and are not counted. ` +
                'Pass the followers file as a second argument for a full comparison.\n',
            );
        }
    }

    const nonFollowers = findNonFollowers(following, followers);

    console.log(`You follow ${following.length} accounts. ${nonFollowers.length} don't follow you back:\n`);
    nonFollowers.forEach((user) => {
        console.log(`  ${user.username}${user.fullName ? `  (${user.fullName})` : ''}`);
    });

    const date = new Date().toISOString().slice(0, 10);
    const outputPath = `not-following-back-${date}.json`;
    const output = {
        comparedAt: new Date().toISOString(),
        count: nonFollowers.length,
        users: nonFollowers.map(({ username, fullName, profileUrl }) => ({
            username,
            fullName,
            profileUrl,
        })),
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\nSaved to ${outputPath}`);
};

main();
