import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      firstName: string;
      lastName: string;
      email: string;
      bio?: string;
      avatarUrl?: string;
      isAdmin: boolean;
    };
  }

  interface User {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    bio?: string;
    avatarUrl?: string;
    isAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    bio?: string | null;
    avatarUrl?: string | null;
    isAdmin?: boolean;
  }
}
