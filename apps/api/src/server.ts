import { buildApp } from "./app.js";

const app = await buildApp();

const port =
  Number(
    process.env.PORT || 3001
  );

const host =
  process.env.HOST ||
  "0.0.0.0";

try {
  const address =
    await app.listen({
      port,
      host,
    });

  console.log(
    `ControlPact API listening at ${address}`
  );
} catch (error) {
  app.log.error(error);
  process.exit(1);
}