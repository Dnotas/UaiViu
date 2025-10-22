    // ...
    export default {
      secret: process.env.JWT_SECRET, // <--- Removido "|| 'mysecret'"
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      refreshSecret: process.env.JWT_REFRESH_SECRET, // <--- Removido "|| 'myanothersecret'"
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d"
    };
    // ...