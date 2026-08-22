export async function controlPactJson(
  path: string,
  accessToken = "",
  init: RequestInit = {},
): Promise<any> {
  const headers = new Headers(init.headers || {});

  if (accessToken) {
    headers.set(
      "Authorization",
      `Bearer ${accessToken}`,
    );
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  headers.set("Accept", "application/json");

  const response = await fetch(
    `/controlpact-api${path}`,
    {
      ...init,
      headers,
    },
  );

  const data = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    data?.success === false
  ) {
    throw new Error(
      data?.message ||
        `ControlPact request failed with HTTP ${response.status}.`,
    );
  }

  return data;
}
