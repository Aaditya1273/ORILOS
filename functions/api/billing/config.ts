import { billingReady, json, paddleEnv, type Fn } from '../../_lib';

// What Paddle.js needs on pages that open a checkout from a Paddle link (?_ptxn=...). Nothing secret.
export const onRequestGet: Fn = async ({ env }) =>
  json({ ready: billingReady(env), token: env.PADDLE_CLIENT_TOKEN, environment: paddleEnv(env) });
