const dotenv = require("dotenv");
dotenv.config();

const cron = require("node-cron");

const ADMIN_API_ENDPOINT = process.env.ADMIN_ENDPOINT;

const LOGIN_QUERY = `
mutation Login($username: String! $password: String!) {
    login(username: $username, password: $password) {
        __typename
    }
}
`;

const ACTIVE_ADMIN_QUERY = `
query {
  activeAdministrator {
    id
    firstName
  }
}
`;

const login = async (username, password) => {
  const res = await fetch("http://localhost:3000/admin-api", {
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: LOGIN_QUERY,
      variables: { username, password },
    }),
    method: "POST",
    mode: "cors",
  });
  const data = await res.json();
  if (
    data?.data?.login?.__typename == "CurrentUser" ||
    res.headers.has("vendure-auth-token")
  )
    return res.headers.get("vendure-auth-token");
};

const run = async (username, password) => {
  let token;
  console.log("[+] Logging in");
  token = await login(username, password);

  cron.schedule("*/5 * * * * *", async () => {
    const res = await fetch(ADMIN_API_ENDPOINT, {
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: ACTIVE_ADMIN_QUERY,
      }),
      method: "POST",
      mode: "cors",
    });
    const data = await res.json();
    if (data?.data?.activeAdministrator == null ) {
      // If somehow the token is invalidated re-login and get new token
      console.log(`[*] No active admin found. Trying to re-login.`);
      token = await login(username, password);
    } else {
      console.log(`[+] [${res.status}]:`, data);
    }
  });
};

run(process.env.USERNAME, process.env.PASSWORD);
