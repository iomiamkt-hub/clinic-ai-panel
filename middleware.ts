export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/", "/conversas/:path*", "/agendamentos/:path*", "/treinamento/:path*", "/configuracoes/:path*", "/whatsapp/:path*"],
};
