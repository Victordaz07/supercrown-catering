import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname;
      if (path.startsWith("/dashboard")) {
        return (
          !!token &&
          ["MASTER", "ADMIN", "SALES", "DELIVERY"].includes(
            token.role as string,
          )
        );
      }
      if (path.startsWith("/client")) {
        return !!token && (token.role as string) === "CLIENT";
      }
      return true;
    },
  },
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/dashboard/:path*", "/client/:path*"],
};
