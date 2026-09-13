import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "SUPER_ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "USER" | "SUPER_ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "USER" | "SUPER_ADMIN";
  }
}
