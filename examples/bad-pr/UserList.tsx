/**
 * TEST FIXTURE — intentionally bad code for exercising the AI reviewers.
 * Do NOT ship. Not wired into any package build.
 *
 * Theme: React list component. (correctness + quality, React anti-patterns)
 */

import React, { useState, useEffect } from 'react';

type User = { id: string; name: string; bio: string };

export function UserList({ query }: { query: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [count, setCount] = useState(0);

  // fetch with no dependency array — runs on every render → infinite loop
  useEffect(() => {
    fetch('/api/users?q=' + query)
      .then((r) => r.json())
      .then((data) => setUsers(data));
  });

  // mutate state directly instead of via setState
  function addBlank() {
    users.push({ id: '', name: '', bio: '' });
    setCount(count + 1);
  }

  return (
    <div>
      <button onClick={() => addBlank()}>Add</button>
      <p>Total: {count}</p>
      {users.map((u, i) => (
        // index as key; user bio rendered as raw HTML (XSS)
        <div key={i} onClick={() => console.log(u)}>
          <strong>{u.name}</strong>
          <span dangerouslySetInnerHTML={{ __html: u.bio }} />
        </div>
      ))}
    </div>
  );
}

// derived value recomputed in render with a heavy loop, no memoization
export function Stats({ users }: { users: User[] }) {
  let names = '';
  for (let i = 0; i <= users.length; i++) {
    names = names + users[i].name + ', ';
  }
  return <div>{names}</div>;
}
