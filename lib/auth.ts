import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

interface PanelUser {
  username: string;
  password: string;
  name: string;
  role: string;
}

function getPanelUsers(): PanelUser[] {
  return [
    {
      username: process.env.ADMIN_USER ?? "admin",
      password: process.env.ADMIN_PASS ?? "admin123",
      name: "IOMIA (Admin)",
      role: "admin",
    },
    {
      username: process.env.SECRETARY_USER ?? "secretaria",
      password: process.env.SECRETARY_PASS ?? "secretaria123",
      name: "Secretaria",
      role: "secretaria",
    },
    {
      username: process.env.PARTNER_USER ?? "socio",
      password: process.env.PARTNER_PASS ?? "socio123",
      name: "Socio",
      role: "socio",
    },
    {
      username: process.env.DOCTOR_USER ?? "dra.bruna",
      password: process.env.DOCTOR_PASS ?? "bruna123",
      name: "Dra. Bruna",
      role: "medico",
    },
  ];
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = getPanelUsers().find(
          (u) => u.username === credentials.username && u.password === credentials.password,
        );

        if (!user) return null;

        return {
          id: user.username,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string | undefined;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
