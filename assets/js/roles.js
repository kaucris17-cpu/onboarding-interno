export const Roles = {
  isAdmin(user){ return user?.role === "admin"; },
  isSupervisor(user){ return user?.role === "supervisor" || user?.role === "admin"; },
  isUser(user){ return user?.role === "user" || user?.role === "supervisor" || user?.role === "admin"; }
};