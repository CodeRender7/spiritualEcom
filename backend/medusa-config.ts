import { defineConfig, loadEnv } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

export default defineConfig({
  modules: [
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              force_path_style: process.env.S3_FORCE_PATH_STYLE === "true",
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/razorpay",
            id: "razorpay",
            options: {
              key_id: process.env.RAZORPAY_KEY_ID,
              key_secret: process.env.RAZORPAY_KEY_SECRET,
            },
          },
          {
            resolve: "./src/modules/cod",
            id: "cod",
            options: {},
          },
          {
            resolve: "./src/modules/hyperswitch",
            id: "hyperswitch",
            options: {
              api_key: process.env.HYPER_PAYMENT_API_KEY,
              merchant_id: process.env.HYPER_PAYMENT_MERCHANT_ID || "divinekart",
              test_mode: process.env.HYPER_PAYMENT_TEST_MODE !== "false",
            },
          },
        ],
      },
    },
    {
      resolve: "./src/modules/whatsapp",
    },
    {
      resolve: "./src/modules/referrals",
    },
    {
      resolve: "./src/modules/brm",
    },
    {
      resolve: "./src/modules/email-template",
    },
    {
      resolve: "./src/modules/document",
    },
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
        ],
      },
    },
  ],
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: {
      connection: {
        ssl: false,
      },
    },
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:8000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:8000,http://localhost:9000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    backendUrl: process.env.MEDUSA_ADMIN_BACKEND_URL || "http://localhost:9000",
    /**
     * The admin dev server's Vite root is /app/.medusa/client with base /app.
     * The admin-vite-plugin generates absolute imports like
     * /app/src/admin/routes/... but Vite's stripBase() removes the leading
     * /app prefix (because base === "/app"), leaving /src/admin/... which
     * cannot be resolved. Remap the stripped prefix back to the real path.
     */
    vite: (config) => ({
      // NOTE: do NOT spread ...config here — Vite's mergeConfig concatenates
      // the plugins array, which would register react() twice and double-inject
      // the Fast Refresh preamble ("symbol already declared"). Return the delta.
      resolve: {
        alias: [
          { find: "/src/admin", replacement: "/app/src/admin" },
        ],
      },
    }),
  },
});
